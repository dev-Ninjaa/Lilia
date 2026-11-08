import { TransfersTab } from "@/app/console/tabs";
import { PageSkeleton } from "@/components/PageSkeleton";
import { fetchAgents, fetchPolicies } from "@/lib/api/server.api";
import { mapAgent, mapPolicy } from "@/lib/mappers";
import { Suspense } from "react";
import { Unavailable } from "@/components/Unavailable";

async function TransfersData() {
  try {
  const [agentRows, policyRows] = await Promise.all([fetchAgents(), fetchPolicies()]);
  const policies = policyRows.map(mapPolicy);
  const agents = agentRows.map((row) => mapAgent(row, "", 1000));
  return <TransfersTab agents={agents} policies={policies} />;
  } catch (error) {
    return <Unavailable message={error instanceof Error ? error.message : undefined} />;
  }
}

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <TransfersData />
    </Suspense>
  );
}
