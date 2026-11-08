import { PoliciesTab } from "@/app/console/tabs";
import { fetchAgents, fetchPolicies } from "@/lib/api/server.api";
import { mapAgent, mapPolicy } from "@/lib/mappers";

export default async function PoliciesPage() {
  const [agentRows, policyRows] = await Promise.all([fetchAgents(), fetchPolicies()]);
  const policies = policyRows.map(mapPolicy);
  const agents = agentRows.map((row) => mapAgent(row, "", 1000));
  return <PoliciesTab agents={agents} policies={policies} />;
}
