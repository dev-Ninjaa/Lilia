import { and, desc, eq } from "drizzle-orm";
import { AppError } from "../../../../apps/api/src/middleware/error-handler.ts";
import type { LiliaDatabase } from "../../../../apps/api/src/plugins/database.ts";
import { agents, policies } from "../../../../database/schema/index.ts";
import { AgentService } from "../agent/agent.service.ts";
import { PolicyService } from "../policy/policy.service.ts";
import { RiskAssessmentService } from "../risk/risk.service.ts";
import type { RiskResult } from "../risk/risk.types.ts";
import { RulesEngine } from "./rules.engine.ts";

export class EvaluationService {
  private readonly agents: AgentService;
  private readonly policies: PolicyService;
  private readonly engine = new RulesEngine();
  private readonly assessments: RiskAssessmentService;
  constructor(private readonly db: LiliaDatabase) {
    this.agents = new AgentService(db);
    this.policies = new PolicyService(db);
    this.assessments = new RiskAssessmentService(db);
  }

  async evaluate(
    ownerId: string,
    input: {
      agentId: string;
      recipient: string;
      mint: string;
      amount: string;
      context?: Record<string, unknown>;
    },
    policyId?: string,
  ) {
    const agent = await this.agents.requireOwned(ownerId, input.agentId);
    if (agent.status !== "active")
      throw new AppError(
        409,
        "AGENT_DISABLED",
        "Disabled agents cannot evaluate or authorize transactions",
      );
    let policy: typeof policies.$inferSelect | undefined;
    if (policyId) {
      policy = await this.policies.requireOwned(ownerId, policyId);
      if (policy.agentId !== agent.id)
        throw new AppError(
          400,
          "POLICY_AGENT_MISMATCH",
          "Policy does not belong to the requested agent",
        );
    } else {
      policy = (
        await this.db
          .select()
          .from(policies)
          .where(
            and(
              eq(policies.agentId, agent.id),
              eq(policies.ownerId, ownerId),
              eq(policies.isActive, true),
            ),
          )
          .orderBy(desc(policies.updatedAt))
          .limit(1)
      )[0];
    }
    if (!policy)
      throw new AppError(
        409,
        "ACTIVE_POLICY_REQUIRED",
        "No active policy is available for this agent",
      );
    const details = {
      sender: agent.publicKey,
      recipient: input.recipient,
      mint: input.mint,
      amount: input.amount,
      context: input.context ?? {},
    };
    const result = this.engine.evaluate(policy, details);
    const assessment = await this.assessments.create({
      agentId: agent.id,
      policyId: policy.id,
      transactionDetails: details,
      result,
      policyVersion: policy.policyVersion,
    });
    return { ...assessment, decision: result.approved ? "approved" : "rejected" };
  }

  async getOwned(ownerId: string, id: string) {
    const assessment = await this.assessments.find(id);
    await this.agents.requireOwned(ownerId, assessment.agentId);
    return { ...assessment, decision: assessment.approved ? "approved" : "rejected" };
  }

  async currentAssessment(id: string, ownerId: string) {
    const assessment = await this.assessments.find(id);
    await this.agents.requireOwned(ownerId, assessment.agentId);
    const agent = await this.agents.requireOwned(ownerId, assessment.agentId);
    const policy = await this.policies.requireOwned(ownerId, assessment.policyId);
    if (!assessment.approved)
      throw new AppError(409, "ASSESSMENT_REJECTED", "Rejected assessments cannot be authorized");
    if (agent.status !== "active")
      throw new AppError(409, "AGENT_DISABLED", "Disabled agents cannot receive permits");
    if (
      !policy.isActive ||
      (policy.expiresAt !== null && Date.parse(policy.expiresAt) <= Date.now())
    ) {
      throw new AppError(409, "POLICY_INACTIVE", "Policy is inactive or expired");
    }
    if (policy.policyVersion !== assessment.policyVersion) {
      throw new AppError(
        409,
        "ASSESSMENT_OUTDATED",
        "Assessment was made under a previous policy version",
      );
    }
    return { assessment, agent, policy };
  }

  evaluatePreview(
    policy: typeof policies.$inferSelect,
    input: { recipient: string; mint: string; amount: string },
    agentActive = true,
  ): RiskResult {
    return this.engine.evaluate(policy, input, agentActive);
  }
}
