import { uuidSchema } from "@lilia/schemas/common.ts";
import { z } from "zod";
export const authorizeSchema = z.object({ assessmentId: uuidSchema });
