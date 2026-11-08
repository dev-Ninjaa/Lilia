import { ConsoleShell } from "@/components/ConsoleShell";
import { fetchSolanaStatus } from "@/lib/api/server.api";

export default async function ConsoleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const status = await fetchSolanaStatus().catch(() => null);
  return <ConsoleShell apiConnected={status?.configured ?? false}>{children}</ConsoleShell>;
}
