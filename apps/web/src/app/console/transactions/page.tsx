import { FeedTab } from "@/app/console/tabs";
import { fetchAgents, fetchTransactions } from "@/lib/api/server.api";
import { mapTransaction } from "@/lib/mappers";

export default async function FeedPage() {
  const [agentRows, txRows] = await Promise.all([fetchAgents(), fetchTransactions()]);
  const nameByAgent = new Map(agentRows.map((a) => [a.id, a.name]));
  const transactions = txRows.map((row) =>
    mapTransaction(row, nameByAgent.get(row.agentId) ?? row.agentId),
  );
  return <FeedTab transactions={transactions} />;
}
