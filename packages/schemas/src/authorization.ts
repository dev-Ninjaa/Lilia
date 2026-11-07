import { z } from "zod";
import { uuidSchema } from "./common.ts";
export const authorizeSchema = z.object({ assessmentId: uuidSchema });
