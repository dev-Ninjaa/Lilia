import { and, count, desc, eq } from "drizzle-orm";
import type { LiliaDatabase } from "../../../../apps/api/src/plugins/database.ts";
import { agents } from "../../../../database/schema/index.ts";

export class AgentRepository {
  constructor(private readonly db: LiliaDatabase) {}
  async find(id: string) {
    return (await this.db.select().from(agents).where(eq(agents.id, id)).limit(1))[0];
  }
  async findOwned(id: string, ownerId: string) {
    return (
      await this.db
        .select()
        .from(agents)
        .where(and(eq(agents.id, id), eq(agents.ownerId, ownerId)))
        .limit(1)
    )[0];
  }
  async list(ownerId: string, page: number, limit: number, status?: "active" | "disabled") {
    const filter = status
      ? and(eq(agents.ownerId, ownerId), eq(agents.status, status))
      : eq(agents.ownerId, ownerId);
    const [items, totalRows] = await Promise.all([
      this.db
        .select()
        .from(agents)
        .where(filter)
        .orderBy(desc(agents.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      this.db.select({ total: count() }).from(agents).where(filter),
    ]);
    return { items, total: totalRows[0]?.total ?? 0 };
  }
  async insert(record: typeof agents.$inferInsert) {
    await this.db.insert(agents).values(record);
    return this.find(record.id);
  }
  async update(id: string, changes: Partial<typeof agents.$inferInsert>) {
    await this.db.update(agents).set(changes).where(eq(agents.id, id));
    return this.find(id);
  }
}
