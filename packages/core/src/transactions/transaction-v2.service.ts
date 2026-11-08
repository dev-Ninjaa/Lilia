import { createHash } from "node:crypto";
import { AppError } from "@lilia/api/middleware/error-handler.ts";
import type { LiliaDatabase } from "@lilia/api/plugins/database.ts";
import { AgentService } from "@lilia/core/agent/agent.service.ts";
import { eventRecord } from "@lilia/core/events/event.service.ts";
import { now } from "@lilia/core/shared.ts";
import { currentSlot } from "@lilia/core/solana/onchain.service.ts";
import {
  getConnection,
  sentinelPublicKey,
  solanaCommitment,
  toRawAmount,
  verifySentinelSignature,
} from "@lilia/core/solana/solana-client.ts";
import { agents, permits, policies, securityEvents, transactions } from "@lilia/db/schema/index.ts";
import {
  PERMIT_V2_LENGTH,
  buildPermitTransferTransaction,
  deriveTokenAccount,
  sendSignedTransaction,
  serializePermitV2,
  serializeUnsignedTransaction,
  waitForSignature,
} from "@lilia/solana/index.ts";
import { PublicKey } from "@solana/web3.js";
import { and, eq } from "drizzle-orm";

export type PrepareV2Input = {
  permitId: string;
  sender: string;
  recipient: string;
  mint: string;
  amount: string;
};

export type SubmitV2Input = {
  transactionId: string;
  signedTransaction: string;
};

export class TransactionV2Service {
  private readonly agents: AgentService;
  constructor(private readonly db: LiliaDatabase) {
    this.agents = new AgentService(db);
  }

  /** Build the Ed25519 + Token-2022 transfer transaction for a Permit v2. */
  async prepare(ownerId: string, input: PrepareV2Input) {
    const permit = (
      await this.db.select().from(permits).where(eq(permits.id, input.permitId)).limit(1)
    )[0];
    if (!permit) throw new AppError(404, "PERMIT_NOT_FOUND", "Authorization permit not found");
    if (permit.permitVersion !== 2) {
      throw new AppError(
        409,
        "PERMIT_VERSION_MISMATCH",
        "Permit is not a Solana Permit v2; use the v1 prepare endpoint",
      );
    }
    const agent = await this.agents.requireOwned(ownerId, permit.agentId);
    if (agent.status !== "active") {
      throw new AppError(409, "AGENT_DISABLED", "Disabled agents cannot prepare transactions");
    }
    if (!agent.transferAuthority || permit.transferAuthority !== agent.transferAuthority) {
      throw new AppError(
        409,
        "TRANSFER_AUTHORITY_MISMATCH",
        "Permit transfer authority does not match the agent",
      );
    }
    const policy = (
      await this.db.select().from(policies).where(eq(policies.id, permit.policyId)).limit(1)
    )[0];
    if (!policy || policy.ownerId !== ownerId || !policy.isActive) {
      throw new AppError(409, "POLICY_INACTIVE", "Permit policy is no longer active");
    }
    if (policy.policyVersion !== permit.policyVersion) {
      throw new AppError(
        409,
        "PERMIT_OUTDATED",
        "Permit was signed under a different policy version",
      );
    }
    if (permit.status !== "issued") {
      throw new AppError(
        409,
        "PERMIT_UNAVAILABLE",
        "Permit has expired, been revoked, or already been consumed",
      );
    }

    const canonicalHex = permit.canonicalMessage ?? permit.signedPayload;
    const message = Buffer.from(canonicalHex, "hex");
    if (message.length !== PERMIT_V2_LENGTH) {
      throw new AppError(500, "PERMIT_INTEGRITY_ERROR", "Stored permit message is invalid");
    }
    const expectedHash = createHash("sha256").update(message).digest("hex");
    if (permit.permitHash !== expectedHash) {
      throw new AppError(500, "PERMIT_INTEGRITY_ERROR", "Stored permit hash does not match");
    }
    if (
      !permit.signature ||
      !verifySentinelSignature(message, Buffer.from(permit.signature, "base64url"))
    ) {
      throw new AppError(409, "PERMIT_SIGNATURE_INVALID", "Permit signature verification failed");
    }

    const slot = await currentSlot();
    if (!permit.expiresAtSlot || BigInt(permit.expiresAtSlot) < BigInt(slot)) {
      throw new AppError(409, "PERMIT_EXPIRED", "Permit has expired");
    }
    if (!permit.amountRaw || permit.mintDecimals === null) {
      throw new AppError(500, "PERMIT_INTEGRITY_ERROR", "Permit is missing amount metadata");
    }
    if (input.sender !== permit.transferAuthority) {
      throw new AppError(
        409,
        "PERMIT_DETAILS_MISMATCH",
        "Sender does not match the permit transfer authority",
      );
    }
    if (input.mint !== permit.mint) {
      throw new AppError(409, "PERMIT_DETAILS_MISMATCH", "Mint does not match the permit");
    }
    const amountRaw = toRawAmount(input.amount, permit.mintDecimals);
    if (amountRaw !== BigInt(permit.amountRaw)) {
      throw new AppError(409, "PERMIT_DETAILS_MISMATCH", "Amount does not match the permit");
    }
    const recipient = new PublicKey(input.recipient);
    const destination = new PublicKey(permit.destinationTokenAccount ?? "");
    const expectedAta = deriveTokenAccount(permit.mint, recipient);
    if (!destination.equals(expectedAta) && !destination.equals(recipient)) {
      throw new AppError(
        409,
        "PERMIT_DETAILS_MISMATCH",
        "Recipient does not match the permit destination",
      );
    }

    const intent = (
      await this.db
        .select()
        .from(transactions)
        .where(and(eq(transactions.permitId, permit.id), eq(transactions.flowVersion, 2)))
        .limit(1)
    )[0];
    if (!intent || intent.status !== "authorized") {
      throw new AppError(
        409,
        "TRANSACTION_INTENT_UNAVAILABLE",
        "Authorized transaction intent is no longer available",
      );
    }

    const permitPayload = {
      agentRegistryPda: permit.agentRegistryPda ?? "",
      agentPublicKey: permit.agentPublicKey ?? "",
      policyPda: permit.policyPda ?? "",
      policyVersion: permit.policyVersion,
      transferAuthority: permit.transferAuthority,
      sourceTokenAccount: permit.sourceTokenAccount ?? "",
      destinationTokenAccount: permit.destinationTokenAccount ?? "",
      mint: permit.mint,
      mintDecimals: permit.mintDecimals,
      amount: BigInt(permit.amountRaw),
      expiresAtSlot: BigInt(permit.expiresAtSlot),
      nonce: Buffer.from(permit.nonce ?? "", "hex"),
    };

    // Refuse to build if the stored message does not re-serialize exactly.
    const rebuilt = serializePermitV2(permitPayload);
    if (!rebuilt.equals(message)) {
      throw new AppError(
        500,
        "PERMIT_INTEGRITY_ERROR",
        "Stored permit message is not canonical for its fields",
      );
    }

    const { transaction, blockhash, lastValidBlockHeight } = await buildPermitTransferTransaction({
      connection: getConnection(),
      permit: permitPayload,
      signature: Buffer.from(permit.signature, "base64url"),
      sentinelPublicKey: sentinelPublicKey(),
      commitment: solanaCommitment(),
    });

    const timestamp = now();
    const prepared = await this.db.transaction(async (tx) => {
      const updated = await tx
        .update(transactions)
        .set({
          status: "prepared",
          blockhash,
          lastValidBlockHeight: lastValidBlockHeight.toString(),
          failureReason: null,
          errorCode: null,
          errorMessage: null,
          updatedAt: timestamp,
        })
        .where(and(eq(transactions.id, intent.id), eq(transactions.status, "authorized")))
        .returning({ id: transactions.id });
      if (updated.length === 0) {
        throw new AppError(
          409,
          "TRANSACTION_INTENT_UNAVAILABLE",
          "Authorized transaction intent is no longer available",
        );
      }
      await tx.insert(securityEvents).values(
        eventRecord({
          agentId: agent.id,
          transactionId: intent.id,
          eventType: "transaction.prepared.v2",
          severity: "info",
          description: "Token-2022 transfer transaction built with the Sentinel-signed Permit v2.",
          metadata: {
            permitId: permit.id,
            blockhash,
            lastValidBlockHeight,
            sequence: permit.sequence,
          },
        }),
      );
      return intent.id;
    });

    return {
      transactionId: prepared,
      status: "prepared",
      blockchainTransactionBuilt: true,
      blockhash,
      lastValidBlockHeight,
      transaction: serializeUnsignedTransaction(transaction),
      permit: {
        id: permit.id,
        sequence: permit.sequence,
        expiresAtSlot: permit.expiresAtSlot,
        transferAuthority: permit.transferAuthority,
        sourceTokenAccount: permit.sourceTokenAccount,
        destinationTokenAccount: permit.destinationTokenAccount,
        mint: permit.mint,
        mintDecimals: permit.mintDecimals,
        amountRaw: permit.amountRaw,
      },
    };
  }

  /** Broadcast a signed v2 transaction and record the confirmed outcome. */
  async submit(ownerId: string, input: SubmitV2Input) {
    const record = (
      await this.db
        .select()
        .from(transactions)
        .where(eq(transactions.id, input.transactionId))
        .limit(1)
    )[0];
    if (!record) {
      throw new AppError(404, "TRANSACTION_NOT_FOUND", "Transaction not found");
    }
    await this.agents.requireOwned(ownerId, record.agentId);
    if (record.flowVersion !== 2) {
      throw new AppError(
        503,
        "SOLANA_INTEGRATION_NOT_CONFIGURED",
        "Legacy transactions cannot be submitted on-chain",
      );
    }
    if (record.status === "confirmed" || record.status === "submitted") {
      return this.present(record);
    }
    if (record.status !== "prepared") {
      throw new AppError(
        409,
        "TRANSACTION_NOT_SUBMITTABLE",
        `Transaction in status '${record.status}' cannot be submitted`,
      );
    }

    const connection = getConnection();
    const commitment = solanaCommitment();
    let signature: string;
    try {
      signature = await sendSignedTransaction(connection, input.signedTransaction, commitment);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown RPC error";
      await this.recordFailure(record.id, "SEND_FAILED", message);
      throw new AppError(502, "SOLANA_SEND_FAILED", `Transaction was not accepted: ${message}`);
    }

    const timestamp = now();
    await this.db
      .update(transactions)
      .set({
        status: "submitted",
        transactionSignature: signature,
        signedTransaction: input.signedTransaction,
        submittedAt: timestamp,
        updatedAt: timestamp,
      })
      .where(eq(transactions.id, record.id));

    const result = await waitForSignature(connection, signature, commitment, 45_000);
    if (!result.confirmed) {
      const message =
        result.error instanceof Error
          ? result.error.message
          : result.error
            ? JSON.stringify(result.error)
            : "Transaction was not confirmed";
      await this.recordFailure(record.id, "NOT_CONFIRMED", message, signature);
      throw new AppError(502, "SOLANA_TRANSACTION_FAILED", message, {
        transactionId: record.id,
        signature,
      });
    }

    const confirmedAt = now();
    await this.db.transaction(async (tx) => {
      await tx
        .update(transactions)
        .set({
          status: "confirmed",
          confirmedAt,
          slot: result.slot === null ? null : result.slot.toString(),
          updatedAt: confirmedAt,
        })
        .where(eq(transactions.id, record.id));
      if (record.permitId) {
        await tx
          .update(permits)
          .set({
            status: "consumed",
            consumedAt: confirmedAt,
            consumedSignature: signature,
          })
          .where(and(eq(permits.id, record.permitId), eq(permits.status, "issued")));
      }
      await tx.insert(securityEvents).values(
        eventRecord({
          agentId: record.agentId,
          transactionId: record.id,
          eventType: "transaction.confirmed",
          severity: "info",
          description: "Token-2022 transfer was confirmed on Solana.",
          metadata: { signature, slot: result.slot },
          source: "blockchain",
        }),
      );
    });

    const updated = (
      await this.db.select().from(transactions).where(eq(transactions.id, record.id)).limit(1)
    )[0];
    if (!updated) throw new AppError(500, "PERSISTENCE_ERROR", "Transaction could not be updated");
    return this.present(updated);
  }

  /**
   * Record a client-submitted signature after the client broadcasts the
   * transaction itself (the Phase 5 flow described in the integration spec).
   * Idempotent for an already-confirmed signature.
   */
  async recordSubmission(
    ownerId: string,
    input: { permitId: string; transactionSignature: string },
  ) {
    const permit = (
      await this.db.select().from(permits).where(eq(permits.id, input.permitId)).limit(1)
    )[0];
    if (!permit) throw new AppError(404, "PERMIT_NOT_FOUND", "Authorization permit not found");
    if (permit.permitVersion !== 2) {
      throw new AppError(409, "PERMIT_VERSION_MISMATCH", "Permit is not a Solana Permit v2");
    }
    const agent = await this.agents.requireOwned(ownerId, permit.agentId);
    const record = (
      await this.db
        .select()
        .from(transactions)
        .where(and(eq(transactions.permitId, permit.id), eq(transactions.flowVersion, 2)))
        .limit(1)
    )[0];
    if (!record) {
      throw new AppError(404, "TRANSACTION_NOT_FOUND", "Transaction not found for this permit");
    }
    if (record.status === "confirmed") return this.present(record);
    if (permit.consumedSignature && permit.consumedSignature !== input.transactionSignature) {
      throw new AppError(
        409,
        "PERMIT_ALREADY_CONSUMED",
        "Permit was already consumed by a different transaction",
      );
    }

    const connection = getConnection();
    const commitment = solanaCommitment();
    const transaction = await connection.getTransaction(input.transactionSignature, {
      // `getTransaction` does not accept the `processed` finality level.
      commitment: commitment === "processed" ? "confirmed" : commitment,
      maxSupportedTransactionVersion: 0,
    });
    if (!transaction) {
      throw new AppError(
        404,
        "TRANSACTION_NOT_FOUND",
        "Transaction is not visible on the configured cluster yet",
      );
    }
    if (transaction.meta?.err) {
      const message = JSON.stringify(transaction.meta.err);
      await this.recordFailure(record.id, "ON_CHAIN_ERROR", message, input.transactionSignature);
      throw new AppError(502, "SOLANA_TRANSACTION_FAILED", "Transaction failed on-chain", {
        transactionId: record.id,
        signature: input.transactionSignature,
        error: transaction.meta.err,
      });
    }

    const confirmedAt = now();
    await this.db.transaction(async (tx) => {
      await tx
        .update(transactions)
        .set({
          status: "confirmed",
          transactionSignature: input.transactionSignature,
          submittedAt: record.submittedAt ?? confirmedAt,
          confirmedAt,
          slot: transaction.slot.toString(),
          failureReason: null,
          errorCode: null,
          errorMessage: null,
          updatedAt: confirmedAt,
        })
        .where(eq(transactions.id, record.id));
      await tx
        .update(permits)
        .set({
          status: "consumed",
          consumedAt: confirmedAt,
          consumedSignature: input.transactionSignature,
        })
        .where(and(eq(permits.id, permit.id), eq(permits.status, "issued")));
      await tx.insert(securityEvents).values(
        eventRecord({
          agentId: agent.id,
          transactionId: record.id,
          eventType: "transaction.confirmed",
          severity: "info",
          description: "Token-2022 transfer was confirmed on Solana.",
          metadata: { signature: input.transactionSignature, slot: transaction.slot },
          source: "blockchain",
        }),
      );
    });

    const updated = (
      await this.db.select().from(transactions).where(eq(transactions.id, record.id)).limit(1)
    )[0];
    if (!updated) throw new AppError(500, "PERSISTENCE_ERROR", "Transaction could not be updated");
    return this.present(updated);
  }

  private async recordFailure(
    transactionId: string,
    code: string,
    message: string,
    signature?: string,
  ) {
    await this.db
      .update(transactions)
      .set({
        status: "failed",
        failureReason: message,
        errorCode: code,
        errorMessage: message,
        transactionSignature: signature ?? null,
        updatedAt: now(),
      })
      .where(eq(transactions.id, transactionId));
  }

  private present(row: typeof transactions.$inferSelect) {
    return {
      transactionId: row.id,
      status: row.status,
      signature: row.transactionSignature,
      slot: row.slot,
      confirmedAt: row.confirmedAt,
      failureReason: row.failureReason,
      errorCode: row.errorCode,
      errorMessage: row.errorMessage,
    };
  }
}
