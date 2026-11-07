import { z } from "zod";
import { addressSchema, amountSchema, uuidSchema } from "./common.ts";

export const policyFields = {
  name: z.string().trim().min(1).max(100),
  maxTransferAmount: amountSchema,
  allowedRecipients: z.array(addressSchema).max(500),
  blockedRecipients: z.array(addressSchema).max(500),
  allowedMint: addressSchema.nullable(),
  expiresAt: z.string().datetime().nullable(),
};
export const createPolicySchema = z.object({ agentId: uuidSchema, ...policyFields });
export const updatePolicySchema = z
  .object(policyFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0);
export const policyIdParams = z.object({ policyId: uuidSchema });
export const policyListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  agentId: uuidSchema.optional(),
});
