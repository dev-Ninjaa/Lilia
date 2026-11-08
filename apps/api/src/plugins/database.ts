import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { env, repoRoot } from "@lilia/api/config/env.ts";
import * as schema from "@lilia/db/schema/index.ts";
import { type BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";
import fp from "fastify-plugin";

export type LiliaDatabase = BunSQLiteDatabase<typeof schema>;

declare module "fastify" {
  interface FastifyInstance {
    db: LiliaDatabase;
    sqlite: Database;
  }
}

export default fp(async (app) => {
  const filename = resolve(repoRoot, env.DATABASE_URL);
  mkdirSync(dirname(filename), { recursive: true });
  const sqlite = new Database(filename, { create: true });
  sqlite.exec("PRAGMA foreign_keys = ON");
  sqlite.exec("PRAGMA journal_mode = WAL");
  sqlite.exec("PRAGMA busy_timeout = 5000");
  app.decorate("sqlite", sqlite);
  app.decorate("db", drizzle(sqlite, { schema }));
  app.addHook("onClose", async () => sqlite.close());
});
