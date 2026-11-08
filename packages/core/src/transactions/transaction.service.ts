import { createHash, createPublicKey, verify } from "node:crypto";
import { AppError } from "@lilia/api/middleware/error-handler.ts";
import type { LiliaDatabase } from "@lilia/api/plugins/database.ts";
import { AgentService } from "@lilia/core/agent/agent.service.ts";
import { AuthorizationService } from "@lilia/core/authorization/authorization.service.ts";
import { EventService } from "@lilia/core/events/event.service.ts";
import { newId, now, pageOffset } from "@lilia/core/shared.ts";
import { currentSlot } from "@lilia/core/solana/onchain.service.ts";
import { isSolanaConfigured } from "@lilia/core/solana/solana-client.ts";
import { TransactionRepository } from "@lilia/core/transactions/transaction.repository.ts";
import { agents, permits, policies, securityEvents, transactions } from "@lilia/db/schema/index.ts";
import { and, count, desc, eq, inArray } from "drizzle-orm";

type PrepareInput = {
  permitId: string;
  sender: string;
  recipient: string;
  mint: string;
  amount: string;
};

export class TransactionService {
  private readonly agents: AgentService;
  private readonly authorization: AuthorizationService;
  private readonly repository: TransactionRepository;
  private readonly events: EventService;
  constructor(private readonly db: LiliaDatabase) {
    this.agents = new AgentService(db);
    this.authorization = new AuthorizationService(db);
    this.repository = new TransactionRepository(db);
    this.events = new EventService(db);
  }

  async prepare(ownerId: string, input: PrepareInput) {
    const permit = await this.authorization.findPermit(input.permitId);
    if (!permit) throw new AppError(404, "PERMIT_NOT_FOUND", "Authorization permit not found");
    const agent = await this.agents.requireOwned(ownerId, permit.agentId);
    const policy = (
      await this.db.select().from(policies).where(eq(policies.id, permit.policyId)).limit(1)
    )[0];
    if (agent.status !== "active")
      throw new AppError(
        409,
        "AGENT_DISABLED",
        "Disabled agents cannot prepare transaction intents",
      );
    if (!policy || policy.ownerId !== ownerId || !policy.isActive || policy.policyVersion < 1) {
      throw new AppError(409, "POLICY_INACTIVE", "Permit policy is no longer active");
    }
    if (policy.policyVersion !== permitPolicyVersion(permit.signedPayload)) {
      throw new AppError(
        409,
        "PERMIT_OUTDATED",
        "Permit was signed under a different policy version",
      );
    }
    if (policy.expiresAt && Date.parse(policy.expiresAt) <= Date.now()) {
      throw new AppError(409, "POLICY_EXPIRED", "Permit policy has expired");
    }
    if (permit.status !== "issued" || Date.parse(permit.expiresAt) <= Date.now()) {
      throw new AppError(
        409,
        "PERMIT_UNAVAILABLE",
        "Permit has expired, been revoked, or already been consumed",
      );
    }
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(permit.signedPayload) as Record<string, unknown>;
    } catch {
      throw new AppError(500, "PERMIT_INTEGRITY_ERROR", "Stored permit payload is invalid");
    }
    const expectedHash = createHash("sha256").update(permit.signedPayload, "utf8").digest("hex");
    const matches =
      payload.agentId === agent.id &&
      payload.agentPublicKey === agent.publicKey &&
      payload.policyId === policy.id &&
      payload.sender === input.sender &&
      payload.recipient === input.recipient &&
      payload.mint === input.mint &&
      payload.amount === input.amount &&
      payload.expiresAt === permit.expiresAt &&
      permit.permitHash === expectedHash;
    if (!matches)
      throw new AppError(
        409,
        "PERMIT_DETAILS_MISMATCH",
        "Transfer details do not exactly match the signed permit",
      );
    let validSignature = false;
    try {
      validSignature = verify(
        null,
        Buffer.from(permit.signedPayload, "utf8"),
        createPublicKey(permit.signerPublicKey),
        Buffer.from(permit.signature, "base64url"),
      );
    } catch {
      validSignature = false;
    }
    if (!validSignature)
      throw new AppError(409, "PERMIT_SIGNATURE_INVALID", "Permit signature verification failed");
    const timestamp = now();
    const intent = (
      await this.db
        .select()
        .from(transactions)
        .where(and(eq(transactions.permitId, permit.id), eq(transactions.status, "authorized")))
        .limit(1)
    )[0];
    if (!intent)
      throw new AppError(
        409,
        "TRANSACTION_INTENT_UNAVAILABLE",
        "Authorized transaction intent is no longer available",
      );
    const detailsMatch =
      intent.agentId === agent.id &&
      intent.policyId === policy.id &&
      intent.sender === input.sender &&
      intent.recipient === input.recipient &&
      intent.mint === input.mint &&
      intent.amount === input.amount;
    if (!detailsMatch)
      throw new AppError(
        409,
        "PERMIT_DETAILS_MISMATCH",
        "Transfer details do not match the authorized transaction intent",
      );
    await this.db.transaction(async (tx) => {
      const consumed = await tx
        .update(permits)
        .set({ status: "consumed" })
        .where(and(eq(permits.id, permit.id), eq(permits.status, "issued")))
        .returning({ id: permits.id });
      if (consumed.length === 0)
        throw new AppError(
          409,
          "PERMIT_UNAVAILABLE",
          "Permit has already been consumed or revoked",
        );
      const prepared = await tx
        .update(transactions)
        .set({ status: "prepared", updatedAt: timestamp, failureReason: null })
        .where(and(eq(transactions.id, intent.id), eq(transactions.status, "authorized")))
        .returning({ id: transactions.id });
      if (prepared.length === 0)
        throw new AppError(
          409,
          "TRANSACTION_INTENT_UNAVAILABLE",
          "Authorized transaction intent is no longer available",
        );
      await tx.insert(securityEvents).values({
        id: newId(),
        agentId: agent.id,
        transactionId: intent.id,
        eventType: "transaction.prepared",
        severity: "info",
        description:
          "Transaction intent prepared locally; no Solana transaction was built or submitted.",
        metadata: JSON.stringify({
          permitId: permit.id,
          state: "prepared_pending_solana_integration",
        }),
        source: "backend",
        createdAt: timestamp,
      });
    });
    return {
      transactionId: intent.id,
      status: "prepared_pending_solana_integration",
      transaction: {
        sender: input.sender,
        recipient: input.recipient,
        mint: input.mint,
        amount: input.amount,
      },
      blockchainTransactionBuilt: false,
    };
  }

  /** Mark unsettled transactions whose permit slot has passed: the hook rejects them on-chain. */
  private async reconcileExpired() {
    if (!isSolanaConfigured()) return;
    let slot: bigint;
    try {
      slot = BigInt(await currentSlot());
    } catch {
      return; // RPC unreachable: leave statuses untouched.
    }
    const open = await this.db
      .select({ id: transactions.id, permitId: permits.id, expiresAtSlot: permits.expiresAtSlot })
      .from(transactions)
      .innerJoin(permits, eq(transactions.permitId, permits.id))
      .where(inArray(transactions.status, ["authorized", "prepared", "submitted"]));
    for (const row of open) {
      if (!row.expiresAtSlot || BigInt(row.expiresAtSlot) >= slot) continue;
      await this.db
        .update(transactions)
        .set({
          status: "failed",
          errorCode: "PERMIT_EXPIRED",
          failureReason: "Permit expired before a confirmed transfer was recorded.",
          updatedAt: now(),
        })
        .where(eq(transactions.id, row.id));
      await this.db
        .update(permits)
        .set({ status: "expired" })
        .where(and(eq(permits.id, row.permitId), eq(permits.status, "issued")));
    }
  }

  async list(
    ownerId: string,
    query: { page: number; limit: number; agentId?: string; status?: string },
  ) {
    await this.reconcileExpired();
    if (query.agentId) await this.agents.requireOwned(ownerId, query.agentId);
    const filters = [eq(agents.ownerId, ownerId)];
    if (query.agentId) filters.push(eq(transactions.agentId, query.agentId));
    if (query.status) filters.push(eq(transactions.status, query.status));
    const filter = and(...filters);
    const [rows, totals] = await Promise.all([
      this.db
        .select({ transaction: transactions })
        .from(transactions)
        .innerJoin(agents, eq(transactions.agentId, agents.id))
        .where(filter)
        .orderBy(desc(transactions.createdAt))
        .limit(query.limit)
        .offset(pageOffset(query.page, query.limit)),
      this.db
        .select({ total: count() })
        .from(transactions)
        .innerJoin(agents, eq(transactions.agentId, agents.id))
        .where(filter),
    ]);
    return { items: rows.map((row) => row.transaction), total: totals[0]?.total ?? 0 };
  }

  async getBySignature(ownerId: string, signature: string) {
    const row = await this.repository.findBySignature(signature);
    if (!row)
      throw new AppError(
        404,
        "TRANSACTION_NOT_FOUND",
        "No locally recorded transaction has this signature",
      );
    await this.agents.requireOwned(ownerId, row.agentId);
    return {
      ...row,
      blockchainEvidence: row.status === "confirmed" ? "confirmation_recorded" : "none",
    };
  }

  async submitUnavailable() {
    throw new AppError(
      503,
      "SOLANA_INTEGRATION_NOT_CONFIGURED",
      "Solana transaction submission is not configured; no transaction was submitted",
    );
  }
}

function permitPolicyVersion(payload: string): number | undefined {
  try {
    return (JSON.parse(payload) as { policyVersion?: number }).policyVersion;
  } catch {
    return undefined;
  }
}
