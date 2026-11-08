import { SimulateTab } from "@/app/console/tabs";
import { PageSkeleton } from "@/components/PageSkeleton";
import { fetchAgents, fetchPolicies } from "@/lib/api/server.api";
import { mapAgent, mapPolicy } from "@/lib/mappers";
import { Suspense } from "react";

async function SimulateData() {
  const [agentRows, policyRows] = await Promise.all([fetchAgents(), fetchPolicies()]);
  const policies = policyRows.map(mapPolicy);
  const agents = agentRows.map((row) => mapAgent(row, "", 1000));
  return <SimulateTab agents={agents} policies={policies} />;
}

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <SimulateData />
    </Suspense>
  );
}
