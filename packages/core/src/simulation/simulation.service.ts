import { AppError } from "@lilia/api/middleware/error-handler.ts";
import type { LiliaDatabase } from "@lilia/api/plugins/database.ts";
import { AgentService } from "@lilia/core/agent/agent.service.ts";
import { EvaluationService } from "@lilia/core/sentinel/evaluation.service.ts";
import { decodeJson, newId, now, pageOffset } from "@lilia/core/shared.ts";
import { agents, policies, simulations } from "@lilia/db/schema/index.ts";
import { and, count, desc, eq } from "drizzle-orm";

export class SimulationService {
  private readonly agents: AgentService;
  private readonly evaluation: EvaluationService;
  constructor(private readonly db: LiliaDatabase) {
    this.agents = new AgentService(db);
    this.evaluation = new EvaluationService(db);
  }
  async run(
    ownerId: string,
    input: {
      agentId: string;
      policyId: string;
      recipient: string;
      mint: string;
      amount: string;
      context?: Record<string, unknown>;
    },
  ) {
    const agent = await this.agents.requireOwned(ownerId, input.agentId);
    const policy = (
      await this.db
        .select()
        .from(policies)
        .where(
          and(
            eq(policies.id, input.policyId),
            eq(policies.agentId, input.agentId),
            eq(policies.ownerId, ownerId),
          ),
        )
        .limit(1)
    )[0];
    if (!policy) throw new AppError(404, "POLICY_NOT_FOUND", "Policy not found for this agent");
    const decision = this.evaluation.evaluatePreview(policy, input, agent.status === "active");
    const id = newId();
    const hypotheticalInput = { ...input, hypothetical: true };
    const result = {
      ...decision,
      decision: decision.approved ? "approved" : "rejected",
      blockchainExecution: "not_performed",
    };
    const createdAt = now();
    await this.db.insert(simulations).values({
      id,
      agentId: agent.id,
      policyId: policy.id,
      input: JSON.stringify(hypotheticalInput),
      result: JSON.stringify(result),
      status: "completed",
      createdAt,
    });
    return {
      id,
      agentId: agent.id,
      policyId: policy.id,
      input: hypotheticalInput,
      result,
      status: "hypothetical_evaluation",
      createdAt,
    };
  }
  async list(ownerId: string, page: number, limit: number, agentId?: string) {
    if (agentId) await this.agents.requireOwned(ownerId, agentId);
    const filter = agentId
      ? and(eq(agents.ownerId, ownerId), eq(simulations.agentId, agentId))
      : eq(agents.ownerId, ownerId);
    const [rows, totals] = await Promise.all([
      this.db
        .select({ simulation: simulations })
        .from(simulations)
        .innerJoin(agents, eq(simulations.agentId, agents.id))
        .where(filter)
        .orderBy(desc(simulations.createdAt))
        .limit(limit)
        .offset(pageOffset(page, limit)),
      this.db
        .select({ total: count() })
        .from(simulations)
        .innerJoin(agents, eq(simulations.agentId, agents.id))
        .where(filter),
    ]);
    return {
      items: rows.map(({ simulation }) => ({
        ...simulation,
        input: decodeJson<Record<string, unknown>>(simulation.input),
        result: decodeJson<Record<string, unknown>>(simulation.result),
      })),
      total: totals[0]?.total ?? 0,
    };
  }
}
