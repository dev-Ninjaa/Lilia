import { Database } from "bun:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { env } from "../apps/api/src/config/env.ts";

const filename = resolve(env.DATABASE_URL);
mkdirSync(dirname(filename), { recursive: true });
const db = new Database(filename, { create: true });
db.exec("PRAGMA foreign_keys = ON");
db.exec(
  "CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)",
);
const name = "0001_initial.sql";
const applied = db.query("SELECT name FROM schema_migrations WHERE name = ?").get(name);
if (!applied) {
  const sql = readFileSync(resolve("database/migrations", name), "utf8");
  db.transaction(() => {
    db.exec(sql);
    db.query("INSERT INTO schema_migrations (name, applied_at) VALUES (?, ?)").run(
      name,
      new Date().toISOString(),
    );
  })();
  console.log(`Applied migration ${name}`);
} else {
  console.log(`Migration ${name} already applied`);
}
db.close();
