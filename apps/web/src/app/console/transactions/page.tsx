import { FeedTab } from "@/app/console/tabs";
import { PageSkeleton } from "@/components/PageSkeleton";
import { Unavailable } from "@/components/Unavailable";
import { fetchAgents, fetchTransactions } from "@/lib/api/server.api";
import { mapTransaction } from "@/lib/mappers";
import { Suspense } from "react";

async function FeedData() {
  try {
    const [agentRows, txRows] = await Promise.all([fetchAgents(), fetchTransactions()]);
    const nameByAgent = new Map(agentRows.map((a) => [a.id, a.name]));
    const transactions = txRows.map((row) =>
      mapTransaction(row, nameByAgent.get(row.agentId) ?? row.agentId),
    );
    return <FeedTab transactions={transactions} />;
  } catch (error) {
    return <Unavailable message={error instanceof Error ? error.message : undefined} />;
  }
}

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <FeedData />
    </Suspense>
  );
}
