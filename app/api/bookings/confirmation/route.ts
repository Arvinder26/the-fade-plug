import { enforceRateLimit, findAuthorizedBooking, getBookingDb, isSameOriginRequest, publicBooking, readLimitedJson, requestBodyTooLarge } from "../../../../lib/booking-server";

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) return Response.json({ error: "This request was blocked." }, { status: 403 });
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json") || requestBodyTooLarge(request, 4_096)) return Response.json({ error: "A valid secure booking request is required." }, { status: 400 });
    const rateLimit = await enforceRateLimit(request, "booking-confirmation", 30, 15 * 60);
    if (!rateLimit.allowed) return Response.json({ error: "Too many requests. Please wait and try again." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } });
    const input = await readLimitedJson<{ reference?: string; token?: string }>(request, 4_096);
    if (!input) return Response.json({ error: "A secure booking link is required." }, { status: 400 });
    if (!input.reference || !input.token || input.reference.length > 40 || input.token.length > 100) return Response.json({ error: "A secure booking link is required." }, { status: 400 });
    const row = await findAuthorizedBooking(getBookingDb(), input);
    if (!row) return Response.json({ error: "This secure booking link is invalid." }, { status: 404 });
    return Response.json({ booking: publicBooking(row) });
  } catch {
    return Response.json({ error: "Booking details are unavailable in this preview." }, { status: 503 });
  }
}
