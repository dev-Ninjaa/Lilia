import { eq } from "drizzle-orm";
import { AppError } from "../../../../apps/api/src/middleware/error-handler.ts";
import type { LiliaDatabase } from "../../../../apps/api/src/plugins/database.ts";
import { assessments, securityEvents } from "../../../../database/schema/index.ts";
import { eventRecord } from "../events/event.service.ts";
import { decodeJson, newId, now } from "../shared.ts";
import type { RiskResult } from "./risk.types.ts";

export class RiskAssessmentService {
  constructor(private readonly db: LiliaDatabase) {}
  async create(input: {
    agentId: string;
    policyId: string;
    transactionDetails: Record<string, unknown>;
    result: RiskResult;
    policyVersion: number;
  }) {
    const id = newId();
    const timestamp = now();
    await this.db.transaction(async (tx) => {
      await tx.insert(assessments).values({
        id,
        agentId: input.agentId,
        policyId: input.policyId,
        transactionDetails: JSON.stringify(input.transactionDetails),
        riskScore: input.result.riskScore,
        riskLevel: input.result.riskLevel,
        approved: input.result.approved,
        reasons: JSON.stringify(input.result.reasons),
        riskProvider: "deterministic",
        policyVersion: input.policyVersion,
        createdAt: timestamp,
      });
      await tx.insert(securityEvents).values(
        eventRecord({
          agentId: input.agentId,
          eventType: input.result.approved ? "sentinel.approved" : "sentinel.rejected",
          severity: input.result.approved
            ? "info"
            : input.result.riskLevel === "critical"
              ? "critical"
              : "high",
          description: input.result.approved
            ? "Transaction passed deterministic policy evaluation."
            : "Transaction was rejected by deterministic policy evaluation.",
          metadata: {
            assessmentId: id,
            riskScore: input.result.riskScore,
            reasons: input.result.reasons,
          },
        }),
      );
    });
    return this.find(id);
  }
  async find(id: string) {
    const row = (
      await this.db.select().from(assessments).where(eq(assessments.id, id)).limit(1)
    )[0];
    if (!row) throw new AppError(404, "ASSESSMENT_NOT_FOUND", "Risk assessment not found");
    return {
      ...row,
      transactionDetails: decodeJson<Record<string, unknown>>(row.transactionDetails),
      reasons: decodeJson<RiskResult["reasons"]>(row.reasons),
    };
  }
}
