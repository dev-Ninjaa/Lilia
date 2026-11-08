import { AppShell } from "@/components/AppShell";
import { Footer } from "@/components/Footer";
import { fetchDashboardData } from "@/lib/api/server.api";
import type { DashboardData } from "@/lib/api/server.api";

const EMPTY_DATA: DashboardData = {
  agents: [],
  policies: [],
  transactions: [],
  events: [],
  apiConnected: false,
};

/**
 * Server Component: fetches dashboard data server-side with the API key (never
 * shipped to the browser) and streams it to the client shell. Uncached reads
 * keep every request live; client mutations revalidate via router.refresh().
 */
export default async function Home() {
  let data = EMPTY_DATA;
  let loadError: string | null = null;
  try {
    data = await fetchDashboardData();
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Unexpected error.";
  }

  return (
    <>
      <AppShell data={data} loadError={loadError} />
      <Footer />
    </>
  );
}
