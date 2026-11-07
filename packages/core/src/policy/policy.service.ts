import { and, eq } from "drizzle-orm";
import { AppError } from "../../../../apps/api/src/middleware/error-handler.ts";
import type { LiliaDatabase } from "../../../../apps/api/src/plugins/database.ts";
import {
  permits,
  policies,
  securityEvents,
  transactions,
} from "../../../../database/schema/index.ts";
import { AgentService } from "../agent/agent.service.ts";
import { eventRecord } from "../events/event.service.ts";
import { decodeJson, newId, now } from "../shared.ts";
import { PolicyRepository } from "./policy.repository.ts";

type PolicyFields = {
  name: string;
  maxTransferAmount: string;
  allowedRecipients: string[];
  blockedRecipients: string[];
  allowedMint: string | null;
  expiresAt: string | null;
};

export class PolicyService {
  private readonly repository: PolicyRepository;
  private readonly agents: AgentService;
  constructor(private readonly db: LiliaDatabase) {
    this.repository = new PolicyRepository(db);
    this.agents = new AgentService(db);
  }
  async create(ownerId: string, input: PolicyFields & { agentId: string }) {
    await this.agents.requireOwned(ownerId, input.agentId);
    const timestamp = now();
    const id = newId();
    await this.db.transaction(async (tx) => {
      await tx.insert(policies).values({
        id,
        ownerId,
        agentId: input.agentId,
        name: input.name,
        maxTransferAmount: input.maxTransferAmount,
        allowedRecipients: JSON.stringify(input.allowedRecipients),
        blockedRecipients: JSON.stringify(input.blockedRecipients),
        allowedMint: input.allowedMint,
        expiresAt: input.expiresAt,
        isActive: true,
        policyVersion: 1,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
      await tx.insert(securityEvents).values(
        eventRecord({
          agentId: input.agentId,
          eventType: "policy.created",
          severity: "info",
          description: "A spending policy was created.",
          metadata: { policyId: id },
        }),
      );
    });
    const row = await this.repository.find(id);
    if (!row) throw new AppError(500, "PERSISTENCE_ERROR", "Policy could not be created");
    return this.present(row);
  }
  async get(ownerId: string, id: string) {
    const row = await this.requireOwned(ownerId, id);
    return this.present(row);
  }
  async requireOwned(ownerId: string, id: string) {
    const row = await this.repository.findOwned(id, ownerId);
    if (!row) throw new AppError(404, "POLICY_NOT_FOUND", "Policy not found");
    return row;
  }
  async list(ownerId: string, page: number, limit: number, agentId?: string) {
    if (agentId) await this.agents.requireOwned(ownerId, agentId);
    const result = await this.repository.list(ownerId, page, limit, agentId);
    return { items: result.items.map((row) => this.present(row)), total: result.total };
  }
  async update(ownerId: string, id: string, input: Partial<PolicyFields>) {
    const row = await this.requireOwned(ownerId, id);
    if (!row.isActive)
      throw new AppError(409, "POLICY_INACTIVE", "Inactive policies cannot be updated");
    const changes: Partial<typeof policies.$inferInsert> = {
      policyVersion: row.policyVersion + 1,
      updatedAt: now(),
    };
    if (input.name !== undefined) changes.name = input.name;
    if (input.maxTransferAmount !== undefined) changes.maxTransferAmount = input.maxTransferAmount;
    if (input.allowedRecipients !== undefined)
      changes.allowedRecipients = JSON.stringify(input.allowedRecipients);
    if (input.blockedRecipients !== undefined)
      changes.blockedRecipients = JSON.stringify(input.blockedRecipients);
    if (input.allowedMint !== undefined) changes.allowedMint = input.allowedMint;
    if (input.expiresAt !== undefined) changes.expiresAt = input.expiresAt;
    await this.db.transaction(async (tx) => {
      await tx.update(policies).set(changes).where(eq(policies.id, id));
      await tx
        .update(permits)
        .set({ status: "revoked" })
        .where(and(eq(permits.policyId, id), eq(permits.status, "issued")));
      await tx
        .update(transactions)
        .set({
          status: "rejected",
          failureReason: "Policy updated before transaction preparation",
          updatedAt: now(),
        })
        .where(and(eq(transactions.policyId, id), eq(transactions.status, "authorized")));
      await tx.insert(securityEvents).values(
        eventRecord({
          agentId: row.agentId,
          eventType: "policy.updated",
          severity: "medium",
          description: "A spending policy was updated; outstanding permits were revoked.",
          metadata: { policyId: id, policyVersion: row.policyVersion + 1 },
        }),
      );
    });
    const updated = await this.repository.find(id);
    if (!updated) throw new AppError(500, "PERSISTENCE_ERROR", "Policy update failed");
    return this.present(updated);
  }
  async deactivate(ownerId: string, id: string) {
    const row = await this.requireOwned(ownerId, id);
    await this.db.transaction(async (tx) => {
      await tx
        .update(policies)
        .set({ isActive: false, policyVersion: row.policyVersion + 1, updatedAt: now() })
        .where(eq(policies.id, id));
      await tx
        .update(permits)
        .set({ status: "revoked" })
        .where(and(eq(permits.policyId, id), eq(permits.status, "issued")));
      await tx
        .update(transactions)
        .set({
          status: "rejected",
          failureReason: "Policy deactivated before transaction preparation",
          updatedAt: now(),
        })
        .where(and(eq(transactions.policyId, id), eq(transactions.status, "authorized")));
      await tx.insert(securityEvents).values(
        eventRecord({
          agentId: row.agentId,
          eventType: "policy.deactivated",
          severity: "high",
          description: "A spending policy was deactivated and outstanding permits were revoked.",
          metadata: { policyId: id, policyVersion: row.policyVersion + 1 },
        }),
      );
    });
    const updated = await this.repository.find(id);
    if (!updated) throw new AppError(500, "PERSISTENCE_ERROR", "Policy could not be deactivated");
    return this.present(updated);
  }
  private present(row: typeof policies.$inferSelect) {
    return {
      ...row,
      allowedRecipients: decodeJson<string[]>(row.allowedRecipients),
      blockedRecipients: decodeJson<string[]>(row.blockedRecipients),
    };
  }
}
