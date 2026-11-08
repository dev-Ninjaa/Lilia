import { randomBytes } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import {
  MAX_MINT_DECIMALS,
  PERMIT_V2_DOMAIN,
  PERMIT_V2_DOMAIN_LENGTH,
  PERMIT_V2_LENGTH,
  PERMIT_V2_VERSION,
} from "./constants.ts";

export type PubkeyLike = PublicKey | string;
export type BigNumberLike = bigint | number | string;

/** Input payload for the canonical Permit v2 message. */
export interface PermitPayloadV2 {
  agentRegistryPda: PubkeyLike;
  agentPublicKey: PubkeyLike;
  policyPda: PubkeyLike;
  policyVersion: number;
  transferAuthority: PubkeyLike;
  sourceTokenAccount: PubkeyLike;
  destinationTokenAccount: PubkeyLike;
  mint: PubkeyLike;
  mintDecimals: number;
  amount: BigNumberLike;
  expiresAtSlot: BigNumberLike;
  /** 32 bytes: first 8 bytes are the little-endian sequence, remaining 24 are entropy. */
  nonce: Uint8Array | string;
}

/** JSON-friendly representation returned by the deserializer. */
export interface ParsedPermitV2 {
  domain: string;
  version: number;
  agentRegistryPda: string;
  agentPublicKey: string;
  policyPda: string;
  policyVersion: number;
  transferAuthority: string;
  sourceTokenAccount: string;
  destinationTokenAccount: string;
  mint: string;
  mintDecimals: number;
  amount: bigint;
  expiresAtSlot: bigint;
  nonce: string;
  sequence: bigint;
  entropy: string;
}

function toBigInt(value: BigNumberLike, field: string): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error(`${field} must be a non-negative safe integer`);
    }
    return BigInt(value);
  }
  if (!/^\d+$/.test(value)) throw new Error(`${field} must be a decimal integer string`);
  return BigInt(value);
}

function toPublicKey(value: PubkeyLike): PublicKey {
  return value instanceof PublicKey ? value : new PublicKey(value);
}

function nonceBytes(nonce: Uint8Array | string): Buffer {
  const bytes =
    typeof nonce === "string"
      ? Buffer.from(nonce, /^[0-9a-fA-F]{64}$/.test(nonce) ? "hex" : "base64")
      : Buffer.from(nonce);
  if (bytes.length !== 32) throw new Error("Permit nonce must be exactly 32 bytes");
  return bytes;
}

/**
 * Build the 32-byte nonce: 8-byte little-endian sequence followed by 24 bytes
 * of entropy. The on-chain program reads the first 8 bytes as the replay
 * counter, so the sequence must match `AgentRegistry.next_authorization_sequence`.
 */
export function buildPermitNonce(sequence: BigNumberLike, entropy?: Uint8Array): Buffer {
  const seq = toBigInt(sequence, "sequence");
  if (seq >= 2n ** 64n) throw new Error("sequence must fit in u64");
  const nonce = Buffer.alloc(32);
  nonce.writeBigUInt64LE(seq, 0);
  if (entropy) {
    if (entropy.length !== 24) throw new Error("Permit entropy must be exactly 24 bytes");
    nonce.set(entropy, 8);
  } else {
    randomBytes(24).copy(nonce, 8);
  }
  return nonce;
}

/** Read the sequence from a 32-byte permit nonce. */
export function permitSequence(nonce: Uint8Array | string): bigint {
  return nonceBytes(nonce).readBigUInt64LE(0);
}

/** Read the 24-byte entropy tail of a permit nonce. */
export function permitEntropy(nonce: Uint8Array | string): Buffer {
  return nonceBytes(nonce).subarray(8, 32);
}

/** Serialize the canonical 308-byte Permit v2 message. */
export function serializePermitV2(payload: PermitPayloadV2): Buffer {
  const policyVersion = payload.policyVersion;
  if (!Number.isInteger(policyVersion) || policyVersion < 0 || policyVersion > 0xffff_ffff) {
    throw new Error("policyVersion must fit in u32");
  }
  if (
    !Number.isInteger(payload.mintDecimals) ||
    payload.mintDecimals < 0 ||
    payload.mintDecimals > MAX_MINT_DECIMALS
  ) {
    throw new Error(`mintDecimals must be 0-${MAX_MINT_DECIMALS}`);
  }
  const amount = toBigInt(payload.amount, "amount");
  if (amount <= 0n) throw new Error("amount must be greater than zero");
  if (amount >= 2n ** 64n) throw new Error("amount must fit in u64");
  const expiresAtSlot = toBigInt(payload.expiresAtSlot, "expiresAtSlot");
  if (expiresAtSlot >= 2n ** 64n) throw new Error("expiresAtSlot must fit in u64");

  const out = Buffer.alloc(PERMIT_V2_LENGTH);
  out.write(PERMIT_V2_DOMAIN, 0, "utf8");
  out.writeUInt8(PERMIT_V2_VERSION, 30);
  toPublicKey(payload.agentRegistryPda).toBuffer().copy(out, 31);
  toPublicKey(payload.agentPublicKey).toBuffer().copy(out, 63);
  toPublicKey(payload.policyPda).toBuffer().copy(out, 95);
  out.writeUInt32LE(policyVersion, 127);
  toPublicKey(payload.transferAuthority).toBuffer().copy(out, 131);
  toPublicKey(payload.sourceTokenAccount).toBuffer().copy(out, 163);
  toPublicKey(payload.destinationTokenAccount).toBuffer().copy(out, 195);
  toPublicKey(payload.mint).toBuffer().copy(out, 227);
  out.writeUInt8(payload.mintDecimals, 259);
  out.writeBigUInt64LE(amount, 260);
  out.writeBigUInt64LE(expiresAtSlot, 268);
  nonceBytes(payload.nonce).copy(out, 276);
  return out;
}

/** Deserialize and validate a canonical 308-byte Permit v2 message. */
export function deserializePermitV2(data: Uint8Array): ParsedPermitV2 {
  const bytes = Buffer.from(data);
  if (bytes.length !== PERMIT_V2_LENGTH) {
    throw new Error(`Permit must be exactly ${PERMIT_V2_LENGTH} bytes`);
  }
  const domainBytes = bytes.subarray(0, PERMIT_V2_DOMAIN_LENGTH);
  const domain = domainBytes.subarray(0, PERMIT_V2_DOMAIN.length).toString("utf8");
  if (domainBytes.subarray(PERMIT_V2_DOMAIN.length).some((byte) => byte !== 0)) {
    throw new Error("Permit domain padding must be zero");
  }
  if (domain !== PERMIT_V2_DOMAIN) throw new Error("Invalid permit domain");
  const version = bytes.readUInt8(30);
  if (version !== PERMIT_V2_VERSION) throw new Error("Unsupported permit version");
  const mintDecimals = bytes.readUInt8(259);
  if (mintDecimals > MAX_MINT_DECIMALS) throw new Error("Invalid mint decimals");
  const amount = bytes.readBigUInt64LE(260);
  if (amount <= 0n) throw new Error("Permit amount must be greater than zero");
  const nonce = bytes.subarray(276, 308);
  return {
    domain,
    version,
    agentRegistryPda: new PublicKey(bytes.subarray(31, 63)).toBase58(),
    agentPublicKey: new PublicKey(bytes.subarray(63, 95)).toBase58(),
    policyPda: new PublicKey(bytes.subarray(95, 127)).toBase58(),
    policyVersion: bytes.readUInt32LE(127),
    transferAuthority: new PublicKey(bytes.subarray(131, 163)).toBase58(),
    sourceTokenAccount: new PublicKey(bytes.subarray(163, 195)).toBase58(),
    destinationTokenAccount: new PublicKey(bytes.subarray(195, 227)).toBase58(),
    mint: new PublicKey(bytes.subarray(227, 259)).toBase58(),
    mintDecimals,
    amount,
    expiresAtSlot: bytes.readBigUInt64LE(268),
    nonce: nonce.toString("hex"),
    sequence: nonce.readBigUInt64LE(0),
    entropy: nonce.subarray(8, 32).toString("hex"),
  };
}
