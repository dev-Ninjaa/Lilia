import type { LiliaDatabase } from "@lilia/api/plugins/database.ts";
import { transactions } from "@lilia/db/schema/index.ts";
import { and, eq } from "drizzle-orm";

export class TransactionRepository {
  constructor(private readonly db: LiliaDatabase) {}
  async findBySignature(signature: string) {
    return (
      await this.db
        .select()
        .from(transactions)
        .where(eq(transactions.transactionSignature, signature))
        .limit(1)
    )[0];
  }
  async insert(record: typeof transactions.$inferInsert) {
    await this.db.insert(transactions).values(record);
    return (
      await this.db
        .select()
        .from(transactions)
        .where(and(eq(transactions.id, record.id)))
        .limit(1)
    )[0];
  }
}
