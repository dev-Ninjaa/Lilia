import { OverviewTab } from "@/app/console/tabs";
import { PageSkeleton } from "@/components/PageSkeleton";
import { fetchDashboardData } from "@/lib/api/server.api";
import { Suspense } from "react";

async function OverviewData() {
  const { agents, policies, transactions, events } = await fetchDashboardData();
  return (
    <OverviewTab agents={agents} policies={policies} transactions={transactions} events={events} />
  );
}

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <OverviewData />
    </Suspense>
  );
}
