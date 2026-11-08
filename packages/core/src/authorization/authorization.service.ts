import type { LiliaDatabase } from "@lilia/api/plugins/database.ts";
import { PermitService } from "@lilia/core/authorization/permit.service.ts";
import { EvaluationService } from "@lilia/core/sentinel/evaluation.service.ts";
import { permits } from "@lilia/db/schema/index.ts";
import { eq } from "drizzle-orm";

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
