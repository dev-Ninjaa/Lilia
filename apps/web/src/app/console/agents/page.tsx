import { AgentsTab } from "@/app/console/tabs";
import { fetchAgents, fetchPolicies } from "@/lib/api/server.api";
import { mapAgent, mapPolicy } from "@/lib/mappers";

export default async function AgentsPage() {
  const [agentRows, policyRows] = await Promise.all([fetchAgents(), fetchPolicies()]);
  const policies = policyRows.map(mapPolicy);
  const policyByAgent = new Map<string, string>();
  for (const policy of policies) {
    if (policy.agentId) policyByAgent.set(policy.agentId, policy.id);
  }
  const agents = agentRows.map((row) =>
    mapAgent(
      row,
      policyByAgent.get(row.id) ?? "",
      policies.find((p) => p.agentId === row.id)?.maxTransferAmount ?? 1000,
    ),
  );
  return <AgentsTab agents={agents} policies={policies} />;
}
