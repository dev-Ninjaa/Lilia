import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Database } from "bun:sqlite";
import { env } from "../apps/api/src/config/env.ts";

// Seeds the Devnet demo agent and policy once, only into a database with no agents.
const db = new Database(resolve(env.DATABASE_URL));
const { count } = db.query("SELECT COUNT(*) AS count FROM agents").get() as { count: number };
if (count > 0) {
  console.log(`Seed skipped: ${count} agent(s) already present`);
} else {
  db.exec(readFileSync(resolve("database/seed/devnet-demo.sql"), "utf8"));
  console.log("Seeded Devnet demo agent and policy");
}
db.close();
