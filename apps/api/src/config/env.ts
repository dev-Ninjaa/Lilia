import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1).default("./database/lilia.db"),
  LILIA_API_KEY: z.string().min(24, "LILIA_API_KEY must contain at least 24 characters"),
  LILIA_SIGNING_PRIVATE_KEY: z.string().optional().default(""),
  LILIA_SIGNING_PUBLIC_KEY: z.string().optional().default(""),
  GEMINI_API_KEY: z.string().optional().default(""),
  SOLANA_RPC_URL: z.string().url().optional().or(z.literal("")).default(""),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(
    `Invalid environment configuration: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`,
  );
}

export const env = parsed.data;
