import { OverviewTab } from "@/app/console/tabs";
import { fetchDashboardData } from "@/lib/api/server.api";

export default async function OverviewPage() {
  const { agents, policies, transactions, events } = await fetchDashboardData();
  return (
    <OverviewTab agents={agents} policies={policies} transactions={transactions} events={events} />
  );
}
