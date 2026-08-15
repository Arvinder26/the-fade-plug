import { availableStartTimesForDate, enforceRateLimit, getAvailableStarts, getBookingDb, validateBookingDate } from "../../../lib/booking-server";
import { getServiceDurationSummary } from "../../../lib/booking-config";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const date = url.searchParams.get("date") ?? "";
  const serviceIds = (url.searchParams.get("services") ?? url.searchParams.get("service") ?? "").split(",").filter(Boolean);
  const selection = getServiceDurationSummary(serviceIds);
  if (!selection || !validateBookingDate(date)) return Response.json({ error: "Choose valid compatible services and a date within the next 12 months." }, { status: 400 });

  try {
    const rateLimit = await enforceRateLimit(request, "availability", 120, 5 * 60);
    if (!rateLimit.allowed) return Response.json({ error: "Too many availability checks. Please wait and try again." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } });
    const starts = await getAvailableStarts(getBookingDb(), date, selection.durationMinutes);
    return Response.json({ starts, calendarReady: true, timeZone: "Pacific/Auckland" });
  } catch {
    return Response.json({ starts: availableStartTimesForDate(date, selection.durationMinutes), calendarReady: false, timeZone: "Pacific/Auckland" });
  }
}
