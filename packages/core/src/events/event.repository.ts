import { and, desc, eq } from "drizzle-orm";
import type { LiliaDatabase } from "../../../../apps/api/src/plugins/database.ts";
import { securityEvents } from "../../../../database/schema/index.ts";

export class EventRepository {
  constructor(private readonly db: LiliaDatabase) {}
  async create(record: typeof securityEvents.$inferInsert) {
    await this.db.insert(securityEvents).values(record);
    return (
      await this.db.select().from(securityEvents).where(eq(securityEvents.id, record.id)).limit(1)
    )[0];
  }
  async get(id: string) {
    return (
      await this.db.select().from(securityEvents).where(eq(securityEvents.id, id)).limit(1)
    )[0];
  }
  async listForAgent(agentId: string, page: number, limit: number) {
    return this.db
      .select()
      .from(securityEvents)
      .where(eq(securityEvents.agentId, agentId))
      .orderBy(desc(securityEvents.createdAt))
      .limit(limit)
      .offset((page - 1) * limit);
  }
  async countForAgent(agentId: string) {
    return this.db.$count(securityEvents, eq(securityEvents.agentId, agentId));
  }
}
