import { OverviewTab } from "@/app/console/tabs";
import { PageSkeleton } from "@/components/PageSkeleton";
import { fetchDashboardData } from "@/lib/api/server.api";
import { Suspense } from "react";
import { Unavailable } from "@/components/Unavailable";

async function OverviewData() {
  try {
  const { agents, policies, transactions, events } = await fetchDashboardData();
  return (
    <OverviewTab agents={agents} policies={policies} transactions={transactions} events={events} />
  );
  } catch (error) {
    return <Unavailable message={error instanceof Error ? error.message : undefined} />;
  }
}

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OverviewData />
    </Suspense>
  );
}
