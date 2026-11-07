import { eq } from "drizzle-orm";
import type { LiliaDatabase } from "../../../../apps/api/src/plugins/database.ts";
import { permits } from "../../../../database/schema/index.ts";
import { EvaluationService } from "../sentinel/evaluation.service.ts";
import { PermitService } from "./permit.service.ts";

export class AuthorizationService {
  private readonly evaluation: EvaluationService;
  private readonly permits: PermitService;
  constructor(private readonly db: LiliaDatabase) {
    this.evaluation = new EvaluationService(db);
    this.permits = new PermitService(db);
  }
  async authorize(ownerId: string, assessmentId: string) {
    const { assessment, agent, policy } = await this.evaluation.currentAssessment(
      assessmentId,
      ownerId,
    );
    const permit = await this.permits.issue({
      agentId: agent.id,
      agentPublicKey: agent.publicKey,
      policyId: policy.id,
      policyVersion: policy.policyVersion,
      details: assessment.transactionDetails,
      assessmentId: assessment.id,
    });
    return permit;
  }
  async findPermit(id: string) {
    return (await this.db.select().from(permits).where(eq(permits.id, id)).limit(1))[0];
  }
}
