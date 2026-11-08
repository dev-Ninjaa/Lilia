import { createHash } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import { eq } from "drizzle-orm";
import { env } from "../../../../apps/api/src/config/env.ts";
import { AppError } from "../../../../apps/api/src/middleware/error-handler.ts";
import type { LiliaDatabase } from "../../../../apps/api/src/plugins/database.ts";
import {
  agents,
  permits,
  securityEvents,
  transactions,
} from "../../../../database/schema/index.ts";
import {
  buildPermitNonce,
  deriveTokenAccount,
  findAgentRegistry,
  findPolicy,
  getMintDecimals,
  serializePermitV2,
} from "../../../solana/src/index.ts";
import { eventRecord } from "../events/event.service.ts";
import { EvaluationService } from "../sentinel/evaluation.service.ts";
import { newId, now } from "../shared.ts";
import { currentSlot, readAuthorizationSequence } from "../solana/onchain.service.ts";
import {
  getConnection,
  liliaProgramId,
  sentinelPublicKeyBase58,
  signWithSentinel,
  toRawAmount,
} from "../solana/solana-client.ts";

export type IssuePermitV2Input = {
  assessmentId: string;
  sourceTokenAccount?: string;
  destinationTokenAccount?: string;
  expiresInSlots?: number;
};

export class PermitV2Service {
  private readonly evaluation: EvaluationService;
  constructor(private readonly db: LiliaDatabase) {
    this.evaluation = new EvaluationService(db);
  }

  /**
   * Issue a canonical 308-byte Permit v2 signed by the Sentinel key.
   *
   * The on-chain sequence is read from the AgentRegistry rather than trusted
   * from the database, so a stale local mirror cannot produce a replayable
   * permit. The database sequence is updated afterwards only as an observability
   * mirror.
   */
  async issue(ownerId: string, input: IssuePermitV2Input) {
    const { assessment, agent, policy } = await this.evaluation.currentAssessment(
      input.assessmentId,
      ownerId,
    );

    if (!agent.transferAuthority) {
      throw new AppError(
        409,
        "AGENT_NOT_ON_CHAIN",
        "Register the agent on-chain before issuing a Solana permit",
      );
    }
    if (!agent.agentIdentityKey) {
      throw new AppError(
        409,
        "AGENT_IDENTITY_MISSING",
        "Agent identity key is required for on-chain permits",
      );
    }
    if (!policy.onChainPolicyPda || policy.onChainPolicyVersion < 1) {
      throw new AppError(
        409,
        "POLICY_NOT_PUBLISHED",
        "Publish the policy on-chain before issuing a Solana permit",
      );
    }
    if (policy.onChainPolicyVersion !== policy.policyVersion) {
      throw new AppError(
        409,
        "POLICY_VERSION_DRIFT",
        "On-chain policy version does not match the backend; publish the policy again",
      );
    }

    const details = assessment.transactionDetails as {
      sender: string;
      recipient: string;
      mint: string;
      amount: string;
    };
    const programId = liliaProgramId();
    const transferAuthority = new PublicKey(agent.transferAuthority);
    const agentIdentityKey = new PublicKey(agent.agentIdentityKey);
    const mint = new PublicKey(details.mint);
    const recipient = new PublicKey(details.recipient);

    const decimals = await getMintDecimals(getConnection(), mint);
    const amountRaw = toRawAmount(details.amount, decimals);
    if (amountRaw <= 0n) {
      throw new AppError(400, "INVALID_AMOUNT", "Permit amount must be greater than zero");
    }
    const policyLimit = toRawAmount(policy.maxTransferAmount, decimals);
    if (amountRaw > policyLimit) {
      throw new AppError(
        409,
        "AMOUNT_EXCEEDS_POLICY",
        "Permit amount exceeds the on-chain policy maximum",
      );
    }
    if (policy.allowedMint && policy.allowedMint !== details.mint) {
      throw new AppError(409, "MINT_NOT_ALLOWED", "Mint is not allowed by this policy");
    }

    const sourceTokenAccount = input.sourceTokenAccount
      ? new PublicKey(input.sourceTokenAccount)
      : deriveTokenAccount(mint, transferAuthority);
    const destinationTokenAccount = input.destinationTokenAccount
      ? new PublicKey(input.destinationTokenAccount)
      : deriveTokenAccount(mint, recipient);

    const slot = await currentSlot();
    const ttlSlots = input.expiresInSlots ?? env.LILIA_PERMIT_TTL_SLOTS;
    const expiresAtSlot = BigInt(slot + ttlSlots);

    const sequence = await readAuthorizationSequence(transferAuthority);
    const nonce = buildPermitNonce(sequence);
    const agentRegistryPda = findAgentRegistry(transferAuthority, programId);
    const policyPda = policy.onChainPolicyPda
      ? new PublicKey(policy.onChainPolicyPda)
      : findPolicy(transferAuthority, programId);

    const canonicalMessage = serializePermitV2({
      agentRegistryPda,
      agentPublicKey: agentIdentityKey,
      policyPda,
      policyVersion: policy.policyVersion,
      transferAuthority,
      sourceTokenAccount,
      destinationTokenAccount,
      mint,
      mintDecimals: decimals,
      amount: amountRaw,
      expiresAtSlot,
      nonce,
    });
    const signature = signWithSentinel(canonicalMessage);
    const signerPublicKey = sentinelPublicKeyBase58();
    const permitHash = createHash("sha256").update(canonicalMessage).digest("hex");

    const id = newId();
    const transactionId = newId();
    const createdAt = now();
    const expiresAt = new Date(Date.now() + ttlSlots * env.LILIA_SLOT_TIME_MS).toISOString();

    await this.db.transaction(async (tx) => {
      await tx.insert(permits).values({
        id,
        agentId: agent.id,
        policyId: policy.id,
        assessmentId: assessment.id,
        permitHash,
        // The canonical binary message is the v2 signed payload.
        signedPayload: canonicalMessage.toString("hex"),
        signature: signature.toString("base64url"),
        signerPublicKey,
        expiresAt,
        status: "issued",
        permitVersion: 2,
        sequence: sequence.toString(),
        nonce: nonce.toString("hex"),
        agentRegistryPda: agentRegistryPda.toBase58(),
        agentPublicKey: agentIdentityKey.toBase58(),
        policyPda: policyPda.toBase58(),
        policyVersion: policy.policyVersion,
        transferAuthority: transferAuthority.toBase58(),
        sourceTokenAccount: sourceTokenAccount.toBase58(),
        destinationTokenAccount: destinationTokenAccount.toBase58(),
        mint: details.mint,
        mintDecimals: decimals,
        amountRaw: amountRaw.toString(),
        expiresAtSlot: expiresAtSlot.toString(),
        canonicalMessage: canonicalMessage.toString("hex"),
        createdAt,
      });
      await tx.insert(transactions).values({
        id: transactionId,
        agentId: agent.id,
        policyId: policy.id,
        permitId: id,
        sender: transferAuthority.toBase58(),
        recipient: details.recipient,
        mint: details.mint,
        amount: details.amount,
        status: "authorized",
        flowVersion: 2,
        transactionSignature: null,
        failureReason: null,
        createdAt,
        updatedAt: createdAt,
      });
      await tx
        .update(agents)
        // Mirror the on-chain counter; it only advances when a transfer lands.
        .set({ authorizationSequence: sequence.toString(), updatedAt: createdAt })
        .where(eq(agents.id, agent.id));
      await tx.insert(securityEvents).values(
        eventRecord({
          agentId: agent.id,
          eventType: "authorization.issued.v2",
          severity: "info",
          description:
            "A canonical Permit v2 was signed by the Sentinel authority for on-chain enforcement.",
          transactionId,
          metadata: {
            permitId: id,
            assessmentId: assessment.id,
            sequence: sequence.toString(),
            expiresAtSlot: expiresAtSlot.toString(),
            policyVersion: policy.policyVersion,
          },
        }),
      );
    });

    return {
      id,
      permitVersion: 2,
      transactionId,
      agentId: agent.id,
      policyId: policy.id,
      assessmentId: assessment.id,
      sequence: sequence.toString(),
      nonce: nonce.toString("hex"),
      agentRegistryPda: agentRegistryPda.toBase58(),
      agentPublicKey: agentIdentityKey.toBase58(),
      policyPda: policyPda.toBase58(),
      policyVersion: policy.policyVersion,
      transferAuthority: transferAuthority.toBase58(),
      sourceTokenAccount: sourceTokenAccount.toBase58(),
      destinationTokenAccount: destinationTokenAccount.toBase58(),
      mint: details.mint,
      mintDecimals: decimals,
      amount: amountRaw.toString(),
      amountDecimal: details.amount,
      expiresAtSlot: expiresAtSlot.toString(),
      expiresAt,
      canonicalMessage: canonicalMessage.toString("hex"),
      signature: signature.toString("base64url"),
      signerPublicKey,
      permitHash,
      status: "issued",
    };
  }
}
