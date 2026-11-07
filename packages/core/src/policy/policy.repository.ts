import { and, count, desc, eq } from "drizzle-orm";
import type { LiliaDatabase } from "../../../../apps/api/src/plugins/database.ts";
import { policies } from "../../../../database/schema/index.ts";

export class PolicyRepository {
  constructor(private readonly db: LiliaDatabase) {}
  async find(id: string) {
    return (await this.db.select().from(policies).where(eq(policies.id, id)).limit(1))[0];
  }
  async findOwned(id: string, ownerId: string) {
    return (
      await this.db
        .select()
        .from(policies)
        .where(and(eq(policies.id, id), eq(policies.ownerId, ownerId)))
        .limit(1)
    )[0];
  }
  async list(ownerId: string, page: number, limit: number, agentId?: string) {
    const filter = agentId
      ? and(eq(policies.ownerId, ownerId), eq(policies.agentId, agentId))
      : eq(policies.ownerId, ownerId);
    const [items, rows] = await Promise.all([
      this.db
        .select()
        .from(policies)
        .where(filter)
        .orderBy(desc(policies.createdAt))
        .limit(limit)
        .offset((page - 1) * limit),
      this.db.select({ total: count() }).from(policies).where(filter),
    ]);
    return { items, total: rows[0]?.total ?? 0 };
  }
}
