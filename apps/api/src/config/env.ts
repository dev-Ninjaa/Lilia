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
  SOLANA_RPC_COMMITMENT: z.enum(["processed", "confirmed", "finalized"]).default("confirmed"),
  LILIA_PROGRAM_ID: z
    .string()
    .trim()
    .min(32)
    .default("51yqX5byrtqTYt1MS2cfo98UqPskzmbdW8SEBvj3FTbz"),
  /** Base58 Ed25519 key the on-chain SentinelAuthority trusts. Derived from the signing key if empty. */
  LILIA_SENTINEL_PUBLIC_KEY: z.string().trim().optional().default(""),
  /** Path to a Solana CLI keypair JSON used for on-chain administration. */
  LILIA_ADMIN_KEYPAIR_PATH: z.string().trim().optional().default(""),
  /** Inline Solana CLI keypair JSON (array of bytes). Prefer the path in production. */
  LILIA_ADMIN_KEYPAIR: z.string().trim().optional().default(""),
  LILIA_PERMIT_TTL_SLOTS: z.coerce.number().int().min(1).max(10_000).default(300),
  /** Estimated slot time used to translate wall-clock expiries into slots. */
  LILIA_SLOT_TIME_MS: z.coerce.number().int().min(100).max(2_000).default(400),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(
    `Invalid environment configuration: ${parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")}`,
  );
}

export const env = parsed.data;
