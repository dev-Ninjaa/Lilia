import { type SQL, and, count, desc, eq, inArray } from "drizzle-orm";
import { AppError } from "../../../../apps/api/src/middleware/error-handler.ts";
import type { LiliaDatabase } from "../../../../apps/api/src/plugins/database.ts";
import { agents, securityEvents, transactions } from "../../../../database/schema/index.ts";
import { decodeJson, newId, now, pageOffset } from "../shared.ts";
import { EventRepository } from "./event.repository.ts";

type EventInput = {
  agentId?: string | null;
  transactionId?: string | null;
  eventType: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  description: string;
  metadata?: Record<string, unknown>;
  source?: "backend" | "blockchain";
};

export function eventRecord(input: EventInput) {
  return {
    id: newId(),
    agentId: input.agentId ?? null,
    transactionId: input.transactionId ?? null,
    eventType: input.eventType,
    severity: input.severity,
    description: input.description,
    metadata: JSON.stringify(input.metadata ?? {}),
    source: input.source ?? "backend",
    createdAt: now(),
  } as const;
}

export class EventService {
  private readonly repository: EventRepository;
  constructor(private readonly db: LiliaDatabase) {
    this.repository = new EventRepository(db);
  }

  async create(input: EventInput) {
    const row = await this.repository.create(eventRecord(input));
    if (!row) throw new AppError(500, "PERSISTENCE_ERROR", "Security event could not be recorded");
    return this.present(row);
  }

  async listOwned(
    ownerId: string,
    query: {
      page: number;
      limit: number;
      eventType?: string;
      severity?: "info" | "low" | "medium" | "high" | "critical";
      agentId?: string;
    },
  ) {
    if (query.agentId) await this.requireAgent(ownerId, query.agentId);
    const ownedIds = this.db
      .select({ id: agents.id })
      .from(agents)
      .where(eq(agents.ownerId, ownerId));
    const filters: SQL[] = [inArray(securityEvents.agentId, ownedIds)];
    if (query.eventType) filters.push(eq(securityEvents.eventType, query.eventType));
    if (query.severity) filters.push(eq(securityEvents.severity, query.severity));
    if (query.agentId) filters.push(eq(securityEvents.agentId, query.agentId));
    const filter = and(...filters);
    const [rows, totals] = await Promise.all([
      this.db
        .select()
        .from(securityEvents)
        .where(filter)
        .orderBy(desc(securityEvents.createdAt))
        .limit(query.limit)
        .offset(pageOffset(query.page, query.limit)),
      this.db.select({ total: count() }).from(securityEvents).where(filter),
    ]);
    return { items: rows.map((row) => this.present(row)), total: totals[0]?.total ?? 0 };
  }

  async getOwned(ownerId: string, id: string) {
    const row = await this.repository.get(id);
    if (!row) throw new AppError(404, "EVENT_NOT_FOUND", "Security event not found");
    if (row.agentId) await this.requireAgent(ownerId, row.agentId);
    else if (row.transactionId) {
      const tx = (
        await this.db
          .select({ ownerId: agents.ownerId })
          .from(transactions)
          .innerJoin(agents, eq(transactions.agentId, agents.id))
          .where(eq(transactions.id, row.transactionId))
          .limit(1)
      )[0];
      if (!tx || tx.ownerId !== ownerId)
        throw new AppError(404, "EVENT_NOT_FOUND", "Security event not found");
    } else throw new AppError(404, "EVENT_NOT_FOUND", "Security event not found");
    return this.present(row);
  }

  async agentEvents(ownerId: string, agentId: string, page: number, limit: number) {
    await this.requireAgent(ownerId, agentId);
    const [items, totals] = await Promise.all([
      this.db
        .select()
        .from(securityEvents)
        .where(eq(securityEvents.agentId, agentId))
        .orderBy(securityEvents.createdAt)
        .limit(limit)
        .offset(pageOffset(page, limit)),
      this.repository.countForAgent(agentId),
    ]);
    return { items: items.map((row) => this.present(row)), total: totals };
  }

  private async requireAgent(ownerId: string, agentId: string) {
    const agent = (
      await this.db
        .select({ id: agents.id })
        .from(agents)
        .where(and(eq(agents.id, agentId), eq(agents.ownerId, ownerId)))
        .limit(1)
    )[0];
    if (!agent) throw new AppError(404, "AGENT_NOT_FOUND", "Agent not found");
  }
  private present(row: typeof securityEvents.$inferSelect) {
    return { ...row, metadata: decodeJson<Record<string, unknown>>(row.metadata) };
  }
}
