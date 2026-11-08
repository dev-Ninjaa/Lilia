import { createPrivateKey, createPublicKey, sign as cryptoSign, verify } from "node:crypto";
import { readFileSync } from "node:fs";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { env } from "../../../../apps/api/src/config/env.ts";
import { AppError } from "../../../../apps/api/src/middleware/error-handler.ts";

let cachedConnection: Connection | undefined;
let cachedAdmin: Keypair | undefined;

export function isSolanaConfigured(): boolean {
  return env.SOLANA_RPC_URL.length > 0;
}

export function solanaCommitment(): "processed" | "confirmed" | "finalized" {
  return env.SOLANA_RPC_COMMITMENT;
}

export function liliaProgramId(): PublicKey {
  return new PublicKey(env.LILIA_PROGRAM_ID);
}

/** Return a memoized RPC connection, or fail with a 503 the API can surface. */
export function getConnection(): Connection {
  if (!isSolanaConfigured()) {
    throw new AppError(
      503,
      "SOLANA_NOT_CONFIGURED",
      "Solana RPC is not configured; set SOLANA_RPC_URL to enable on-chain flows",
    );
  }
  cachedConnection ??= new Connection(env.SOLANA_RPC_URL, solanaCommitment());
  return cachedConnection;
}

/** Extract the raw 32-byte Ed25519 public key from an SPKI PEM string. */
export function ed25519PublicKeyBytesFromPem(pem: string): Buffer {
  const der = createPublicKey(pem).export({ type: "spki", format: "der" });
  if (der.length < 32) throw new Error("Invalid Ed25519 public key");
  return Buffer.from(der.subarray(der.length - 32));
}

/**
 * Base58 Sentinel public key trusted by the on-chain SentinelAuthority.
 *
 * Prefers `LILIA_SENTINEL_PUBLIC_KEY`; otherwise derives it from the configured
 * Ed25519 signing key so the backend signature and the on-chain check agree.
 */
export function sentinelPublicKey(): PublicKey {
  if (env.LILIA_SENTINEL_PUBLIC_KEY) return new PublicKey(env.LILIA_SENTINEL_PUBLIC_KEY);
  if (env.LILIA_SIGNING_PUBLIC_KEY) {
    return new PublicKey(ed25519PublicKeyBytesFromPem(env.LILIA_SIGNING_PUBLIC_KEY));
  }
  throw new AppError(
    503,
    "SENTINEL_NOT_CONFIGURED",
    "No Sentinel public key is configured; set LILIA_SENTINEL_PUBLIC_KEY or the signing key pair",
  );
}

export function sentinelPublicKeyBase58(): string {
  return sentinelPublicKey().toBase58();
}

/** Sign a permit message with the configured Ed25519 Sentinel key. */
export function signWithSentinel(message: Uint8Array): Buffer {
  if (!env.LILIA_SIGNING_PRIVATE_KEY) {
    throw new AppError(
      503,
      "SIGNING_NOT_CONFIGURED",
      "Authorization signing is unavailable until an Ed25519 key pair is configured",
    );
  }
  const signature = cryptoSign(
    null,
    Buffer.from(message),
    createPrivateKey(env.LILIA_SIGNING_PRIVATE_KEY),
  );
  if (signature.length !== 64) throw new Error("Ed25519 signature must be 64 bytes");
  return signature;
}

/** Verify a 64-byte Ed25519 signature against the Sentinel public key. */
export function verifySentinelSignature(message: Uint8Array, signature: Uint8Array): boolean {
  try {
    const key = sentinelPublicKey();
    const publicKey = createPublicKey({
      key: {
        kty: "OKP",
        crv: "Ed25519",
        x: Buffer.from(key.toBytes()).toString("base64url"),
      },
      format: "jwk",
    });
    return verify(null, Buffer.from(message), publicKey, Buffer.from(signature));
  } catch {
    return false;
  }
}

function parseKeypair(serialized: string): Keypair {
  const bytes = Uint8Array.from(JSON.parse(serialized) as number[]);
  if (bytes.length !== 64) throw new Error("Solana keypair must contain 64 bytes");
  return Keypair.fromSecretKey(bytes);
}

/**
 * Load the administrative Solana keypair used to send program instructions.
 * This key must match the SentinelAuthority `upgrade_authority`.
 */
export function adminKeypair(): Keypair {
  if (cachedAdmin) return cachedAdmin;
  if (env.LILIA_ADMIN_KEYPAIR_PATH) {
    cachedAdmin = parseKeypair(readFileSync(env.LILIA_ADMIN_KEYPAIR_PATH, "utf8"));
    return cachedAdmin;
  }
  if (env.LILIA_ADMIN_KEYPAIR) {
    cachedAdmin = parseKeypair(env.LILIA_ADMIN_KEYPAIR);
    return cachedAdmin;
  }
  throw new AppError(
    503,
    "ADMIN_KEYPAIR_NOT_CONFIGURED",
    "On-chain administration requires LILIA_ADMIN_KEYPAIR_PATH or LILIA_ADMIN_KEYPAIR",
  );
}

export function adminPublicKey(): PublicKey {
  return adminKeypair().publicKey;
}

export function adminConfigured(): boolean {
  return Boolean(env.LILIA_ADMIN_KEYPAIR_PATH || env.LILIA_ADMIN_KEYPAIR);
}

/** Translate a wall-clock ISO timestamp into an approximate Solana slot. */
export function slotForTimestamp(iso: string, currentSlot: number): bigint {
  const deltaMs = Date.parse(iso) - Date.now();
  const deltaSlots = Math.ceil(deltaMs / env.LILIA_SLOT_TIME_MS);
  const slot = Math.max(0, currentSlot + deltaSlots);
  return BigInt(slot);
}

/** Convert a decimal token amount into raw units for a given mint precision. */
export function toRawAmount(amount: string, decimals: number): bigint {
  const [whole, fraction = ""] = amount.split(".");
  if (fraction.length > decimals) {
    throw new AppError(400, "AMOUNT_PRECISION", `Amount has more than ${decimals} decimal places`);
  }
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, "0") || "0");
}

/** Format raw token units back into a decimal string. */
export function fromRawAmount(raw: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const whole = raw / divisor;
  const fraction = (raw % divisor).toString().padStart(decimals, "0").replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

/** Convert a UUID into the 16-byte agent id the program stores. */
export function uuidToBytes16(uuid: string): number[] {
  const hex = uuid.replace(/-/g, "");
  if (!/^[0-9a-fA-F]{32}$/.test(hex)) throw new AppError(400, "INVALID_AGENT_ID", "Invalid UUID");
  return Array.from(Buffer.from(hex, "hex"));
}

/** Base58-encode raw bytes (re-exported so callers avoid importing bs58 directly). */
export function base58(bytes: Uint8Array): string {
  return bs58.encode(bytes);
}
