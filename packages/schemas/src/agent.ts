import { metadataSchema, uuidSchema } from "@lilia/schemas/common.ts";
import { z } from "zod";

export const createAgentSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().max(1000).default(""),
  publicKey: z.string().trim().min(1).max(128),
  metadata: metadataSchema,
});
export const updateAgentSchema = createAgentSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0);
export const agentIdParams = z.object({ agentId: uuidSchema });
export const agentListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(["active", "disabled"]).optional(),
});
