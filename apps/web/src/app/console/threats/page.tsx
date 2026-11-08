import { ThreatsTab } from "@/app/console/tabs";
import { PageSkeleton } from "@/components/PageSkeleton";
import { Unavailable } from "@/components/Unavailable";
import { fetchEvents } from "@/lib/api/server.api";
import { mapSecurityEvent } from "@/lib/mappers";
import { Suspense } from "react";

async function ThreatsData() {
  try {
    const eventRows = await fetchEvents();
    const events = eventRows.map((row) => mapSecurityEvent(row, "System"));
    return <ThreatsTab events={events} />;
  } catch (error) {
    return <Unavailable message={error instanceof Error ? error.message : undefined} />;
  }
}

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ThreatsData />
    </Suspense>
  );
}
