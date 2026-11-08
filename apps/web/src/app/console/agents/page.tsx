import { AgentsTab } from "@/app/console/tabs";
import { PageSkeleton } from "@/components/PageSkeleton";
import { fetchAgents, fetchPolicies } from "@/lib/api/server.api";
import { mapAgent, mapPolicy } from "@/lib/mappers";
import { Suspense } from "react";
import { Unavailable } from "@/components/Unavailable";

async function AgentsData() {
  try {
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
  } catch (error) {
    return <Unavailable message={error instanceof Error ? error.message : undefined} />;
  }
}

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <AgentsData />
    </Suspense>
  );
}
