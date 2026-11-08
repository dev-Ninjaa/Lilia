import { ThreatsTab } from "@/app/console/tabs";
import { fetchEvents } from "@/lib/api/server.api";
import { mapSecurityEvent } from "@/lib/mappers";

export default async function ThreatsPage() {
  const eventRows = await fetchEvents();
  const events = eventRows.map((row) => mapSecurityEvent(row, "System"));
  return <ThreatsTab events={events} />;
}
