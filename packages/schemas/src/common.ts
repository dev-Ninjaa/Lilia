import { z } from "zod";

export const uuidSchema = z.string().uuid();
export const amountSchema = z
  .string()
  .regex(/^(0|[1-9]\d*)(\.\d{1,18})?$/, "Must be a non-negative decimal amount");
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export const metadataSchema = z.record(z.unknown()).default({});
export const addressSchema = z.string().trim().min(1).max(128);
export const transferSchema = z.object({
  recipient: addressSchema,
  mint: addressSchema,
  amount: amountSchema,
  context: z.record(z.unknown()).optional().default({}),
});
export type TransferInput = z.infer<typeof transferSchema>;
