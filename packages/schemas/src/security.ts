import { z } from "zod";
import { paginationSchema, uuidSchema } from "./common.ts";
export const securityQuery = paginationSchema.extend({
  eventType: z.string().max(100).optional(),
  severity: z.enum(["info", "low", "medium", "high", "critical"]).optional(),
  agentId: uuidSchema.optional(),
});
export const agentEventsQuery = paginationSchema;
export const eventIdParams = z.object({ eventId: uuidSchema });
export const securityAgentParams = z.object({ agentId: uuidSchema });
