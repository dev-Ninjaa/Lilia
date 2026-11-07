import { z } from "zod";
import { addressSchema, amountSchema, paginationSchema, uuidSchema } from "./common.ts";

export const evaluateSchema = z.object({
  agentId: uuidSchema,
  policyId: uuidSchema.optional(),
  recipient: addressSchema,
  mint: addressSchema,
  amount: amountSchema,
  context: z.record(z.unknown()).optional().default({}),
});
export const simulationSchema = evaluateSchema.extend({ policyId: uuidSchema });
export const prepareSchema = z.object({
  permitId: uuidSchema,
  sender: addressSchema,
  recipient: addressSchema,
  mint: addressSchema,
  amount: amountSchema,
});
export const submitSchema = z.object({
  transactionId: uuidSchema,
  signedTransaction: z.string().min(1).max(100_000),
});
export const transactionListQuery = paginationSchema.extend({
  agentId: uuidSchema.optional(),
  status: z.string().max(50).optional(),
});
export const signatureParams = z.object({
  signature: z
    .string()
    .min(32)
    .max(100)
    .regex(/^[1-9A-HJ-NP-Za-km-z]+$/),
});
export const assessmentParams = z.object({ assessmentId: uuidSchema });
export const eventParams = z.object({ eventId: uuidSchema });
