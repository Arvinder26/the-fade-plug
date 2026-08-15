import { enforceRateLimit, findAuthorizedBooking, getBookingDb, getRuntimeEnv, hashToken, isSameOriginRequest, publicBooking, readLimitedJson, requestBodyTooLarge, sendManageAccessEmail } from "../../../lib/booking-server";

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) return Response.json({ error: "This request was blocked." }, { status: 403 });
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json") || requestBodyTooLarge(request, 4_096)) return Response.json({ error: "Use the secure booking form to continue." }, { status: 400 });
    const ipLimit = await enforceRateLimit(request, "manage-lookup-ip", 10, 15 * 60);
    if (!ipLimit.allowed) return Response.json({ error: "Too many lookup attempts. Please wait and try again." }, { status: 429, headers: { "Retry-After": String(ipLimit.retryAfterSeconds) } });
    const input = await readLimitedJson<{ reference?: string; email?: string; token?: string }>(request, 4_096);
    if (!input) return Response.json({ error: "Enter valid booking details." }, { status: 400 });
    const reference = input.reference?.trim().toUpperCase() ?? "";
    const email = input.email?.trim().toLowerCase() ?? "";
    const token = input.token ?? "";
    if (!reference || reference.length > 40 || email.length > 254 || token.length > 100) return Response.json({ error: "Enter valid booking details." }, { status: 400 });

    const db = getBookingDb();
    if (token) {
      const booking = await findAuthorizedBooking(db, { reference, token });
      if (!booking) return Response.json({ error: "This secure booking link is invalid." }, { status: 404 });
      return Response.json({ booking: publicBooking(booking) });
    }

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "Enter your booking reference and email." }, { status: 400 });
    if (!getRuntimeEnv().RESEND_API_KEY || !getRuntimeEnv().BOOKING_FROM_EMAIL) return Response.json({ error: "Secure email access is not connected yet. Please use the private link in your confirmation email." }, { status: 503 });
    const credentialKey = await hashToken(`${reference}:${email}`);
    const credentialLimit = await enforceRateLimit(request, "manage-lookup-booking", 3, 60 * 60, credentialKey);
    if (!credentialLimit.allowed) return Response.json({ error: "A secure link was recently requested. Please check your email or try again later." }, { status: 429, headers: { "Retry-After": String(credentialLimit.retryAfterSeconds) } });
    const booking = await findAuthorizedBooking(db, { reference, email }, true);
    if (booking) await sendManageAccessEmail(booking);
    return Response.json({ linkSent: true, message: "If those details match a booking, a secure management link has been sent to that email address." }, { status: 202 });
  } catch {
    return Response.json({ error: "Secure booking lookup is not connected in this preview." }, { status: 503 });
  }
}
