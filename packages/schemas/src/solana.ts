import { uuidSchema } from "@lilia/schemas/common.ts";
import { z } from "zod";

/** Base58 Solana address (32-byte public key). */
export const solanaAddressSchema = z
  .string()
  .trim()
  .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, "Must be a base58 Solana address");

/** Base58 transaction signature (64-byte Ed25519 signature). */
export const solanaSignatureSchema = z
  .string()
  .trim()
  .regex(/^[1-9A-HJ-NP-Za-km-z]{64,88}$/, "Must be a base58 Solana transaction signature");

export const authorizeV2Schema = z.object({
  assessmentId: uuidSchema,
  sourceTokenAccount: solanaAddressSchema.optional(),
  destinationTokenAccount: solanaAddressSchema.optional(),
  expiresInSlots: z.number().int().min(1).max(10_000).optional(),
});

export const recordSubmissionSchema = z.object({
  permitId: uuidSchema,
  transactionSignature: solanaSignatureSchema,
});

export const registerAgentOnChainSchema = z.object({
  transferAuthority: solanaAddressSchema,
  agentIdentityKey: solanaAddressSchema,
});

export const agentStatusOnChainSchema = z.object({
  isActive: z.boolean(),
});

export const publishPolicyOnChainSchema = z.object({
  mintDecimals: z.number().int().min(0).max(18),
});

export const sentinelInitializeSchema = z.object({
  publicKey: solanaAddressSchema,
});

export const sentinelRotateSchema = z.object({
  newPublicKey: solanaAddressSchema,
});
