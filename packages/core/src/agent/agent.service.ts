import { AppError } from "@lilia/api/middleware/error-handler.ts";
import type { LiliaDatabase } from "@lilia/api/plugins/database.ts";
import { AgentRepository } from "@lilia/core/agent/agent.repository.ts";
import { eventRecord } from "@lilia/core/events/event.service.ts";
import { decodeJson, newId, now } from "@lilia/core/shared.ts";
import { agents, permits, policies, securityEvents, transactions } from "@lilia/db/schema/index.ts";
import { and, eq } from "drizzle-orm";

export class AgentService {
  private readonly repository: AgentRepository;
  constructor(private readonly db: LiliaDatabase) {
    this.repository = new AgentRepository(db);
  }

  async create(
    ownerId: string,
    input: {
      name: string;
      description: string;
      publicKey: string;
      metadata: Record<string, unknown>;
    },
  ) {
    const timestamp = now();
    const id = newId();
    const record = {
      id,
      ownerId,
      name: input.name,
      description: input.description,
      publicKey: input.publicKey,
      metadata: JSON.stringify(input.metadata),
      status: "active" as const,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.db.transaction(async (tx) => {
      await tx.insert(agents).values(record);
      await tx.insert(securityEvents).values(
        eventRecord({
          agentId: id,
          eventType: "agent.registered",
          severity: "info",
          description: "Agent registered in the Lilia backend registry.",
          metadata: { onChain: false },
        }),
      );
    });
    const row = await this.repository.find(id);
    if (!row) throw new AppError(500, "PERSISTENCE_ERROR", "Agent could not be created");
    return this.present(row);
  }

  async get(ownerId: string, id: string) {
    const row = await this.repository.findOwned(id, ownerId);
    if (!row) throw new AppError(404, "AGENT_NOT_FOUND", "Agent not found");
    const policyRows = await this.db
      .select({
        id: policies.id,
        name: policies.name,
        isActive: policies.isActive,
        policyVersion: policies.policyVersion,
      })
      .from(policies)
      .where(and(eq(policies.agentId, id), eq(policies.ownerId, ownerId)));
    return { ...this.present(row), policies: policyRows };
  }

  async requireOwned(ownerId: string, id: string) {
    const row = await this.repository.findOwned(id, ownerId);
    if (!row) throw new AppError(404, "AGENT_NOT_FOUND", "Agent not found");
    return row;
  }

  async list(ownerId: string, page: number, limit: number, status?: "active" | "disabled") {
    const result = await this.repository.list(ownerId, page, limit, status);
    return { items: result.items.map((row) => this.present(row)), total: result.total };
  }

  async update(
    ownerId: string,
    id: string,
    input: { name?: string; description?: string; metadata?: Record<string, unknown> },
  ) {
    const current = await this.requireOwned(ownerId, id);
    const changes: Partial<typeof agents.$inferInsert> = { updatedAt: now() };
    if (input.name !== undefined) changes.name = input.name;
    if (input.description !== undefined) changes.description = input.description;
    if (input.metadata !== undefined) changes.metadata = JSON.stringify(input.metadata);
    const updated = await this.repository.update(current.id, changes);
    if (!updated) throw new AppError(500, "PERSISTENCE_ERROR", "Agent update failed");
    return this.present(updated);
  }

  async disable(ownerId: string, id: string) {
    await this.requireOwned(ownerId, id);
    await this.db.transaction(async (tx) => {
      await tx
        .update(agents)
        .set({ status: "disabled", updatedAt: now() })
        .where(eq(agents.id, id));
      await tx
        .update(permits)
        .set({ status: "revoked" })
        .where(and(eq(permits.agentId, id), eq(permits.status, "issued")));
      await tx
        .update(transactions)
        .set({
          status: "rejected",
          failureReason: "Agent disabled before transaction preparation",
          updatedAt: now(),
        })
        .where(and(eq(transactions.agentId, id), eq(transactions.status, "authorized")));
      await tx.insert(securityEvents).values(
        eventRecord({
          agentId: id,
          eventType: "agent.disabled",
          severity: "high",
          description: "Agent was disabled by its owner.",
        }),
      );
    });
    const updated = await this.repository.find(id);
    if (!updated) throw new AppError(500, "PERSISTENCE_ERROR", "Agent could not be disabled");
    return this.present(updated);
  }

  private present(row: typeof agents.$inferSelect) {
    return { ...row, metadata: decodeJson<Record<string, unknown>>(row.metadata) };
  }
}
