import type { LiliaDatabase } from "@lilia/api/plugins/database.ts";
import { agents, policies, securityEvents, transactions } from "@lilia/db/schema/index.ts";
import { and, count, eq, inArray } from "drizzle-orm";

export class SecurityService {
  constructor(private readonly db: LiliaDatabase) {}
  async overview(ownerId: string) {
    const ownedAgents = this.db
      .select({ id: agents.id })
      .from(agents)
      .where(eq(agents.ownerId, ownerId));
    const [
      totalAgents,
      activeAgents,
      disabledAgents,
      totalPolicies,
      activePolicies,
      totalTx,
      authorizedTx,
      rejected,
      confirmed,
      eventRows,
    ] = await Promise.all([
      this.db.$count(agents, eq(agents.ownerId, ownerId)),
      this.db.$count(agents, and(eq(agents.ownerId, ownerId), eq(agents.status, "active"))),
      this.db.$count(agents, and(eq(agents.ownerId, ownerId), eq(agents.status, "disabled"))),
      this.db.$count(policies, eq(policies.ownerId, ownerId)),
      this.db.$count(policies, and(eq(policies.ownerId, ownerId), eq(policies.isActive, true))),
      this.db.$count(transactions, inArray(transactions.agentId, ownedAgents)),
      this.db.$count(
        transactions,
        and(inArray(transactions.agentId, ownedAgents), eq(transactions.status, "authorized")),
      ),
      this.db.$count(
        securityEvents,
        and(
          eq(securityEvents.eventType, "sentinel.rejected"),
          inArray(securityEvents.agentId, ownedAgents),
        ),
      ),
      this.db.$count(
        transactions,
        and(inArray(transactions.agentId, ownedAgents), eq(transactions.status, "confirmed")),
      ),
      this.db
        .select({ severity: securityEvents.severity, total: count() })
        .from(securityEvents)
        .where(inArray(securityEvents.agentId, ownedAgents))
        .groupBy(securityEvents.severity),
    ]);
    return {
      totalAgents,
      activeAgents,
      disabledAgents,
      totalPolicies,
      activePolicies,
      totalTransactionIntents: totalTx,
      authorizedTransactionIntents: authorizedTx,
      rejectedEvaluations: rejected,
      confirmedTransactions: confirmed,
      securityEventsBySeverity: Object.fromEntries(
        eventRows.map((row) => [row.severity, row.total]),
      ),
    };
  }
}
