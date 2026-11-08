import { ThreatsTab } from "@/app/console/tabs";
import { PageSkeleton } from "@/components/PageSkeleton";
import { fetchEvents } from "@/lib/api/server.api";
import { mapSecurityEvent } from "@/lib/mappers";
import { Suspense } from "react";

async function ThreatsData() {
  const eventRows = await fetchEvents();
  const events = eventRows.map((row) => mapSecurityEvent(row, "System"));
  return <ThreatsTab events={events} />;
}

export default function Page() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <ThreatsData />
    </Suspense>
  );
}
