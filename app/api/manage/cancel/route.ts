import { enforceRateLimit, findAuthorizedBooking, getBookingDb, getRuntimeEnv, isSameOriginRequest, readLimitedJson, requestBodyTooLarge, sendBookingEmail, type BookingRow } from "../../../../lib/booking-server";

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) return Response.json({ error: "This request was blocked." }, { status: 403 });
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json") || requestBodyTooLarge(request, 4_096)) return Response.json({ error: "Use the secure booking form to continue." }, { status: 400 });
    const rateLimit = await enforceRateLimit(request, "booking-cancel", 10, 15 * 60);
    if (!rateLimit.allowed) return Response.json({ error: "Too many attempts. Please wait and try again." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } });
    const input = await readLimitedJson<{ reference?: string; email?: string; token?: string }>(request, 4_096);
    if (!input) return Response.json({ error: "A secure booking link is required." }, { status: 400 });
    if (!input.reference || !input.token || input.reference.length > 40 || input.token.length > 100) return Response.json({ error: "A secure booking link is required." }, { status: 400 });
    const db = getBookingDb();
    const booking = await findAuthorizedBooking(db, input);
    if (!booking) return Response.json({ error: "No booking matched those secure details." }, { status: 404 });
    if (!(["confirmed", "pending_payment"] as string[]).includes(booking.status)) return Response.json({ error: "This booking cannot be cancelled again." }, { status: 409 });

    const beforeDeadline = Date.now() < new Date(booking.cancellation_deadline).getTime();
    let paymentStatus = booking.payment_status;
    if (booking.status === "confirmed" && beforeDeadline && booking.stripe_payment_intent_id) {
      const stripeKey = getRuntimeEnv().STRIPE_SECRET_KEY;
      if (stripeKey) {
        const refund = await fetch("https://api.stripe.com/v1/refunds", {
          method: "POST",
          headers: { Authorization: `Bearer ${stripeKey}`, "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": `booking-refund-${booking.id}` },
          body: new URLSearchParams({ payment_intent: booking.stripe_payment_intent_id, reason: "requested_by_customer" }),
        });
        paymentStatus = refund.ok ? "deposit_refunded" : "refund_pending";
      } else paymentStatus = "refund_pending";
    } else if (booking.status === "confirmed" && !beforeDeadline) paymentStatus = "deposit_retained";

    const results = await db.batch([
      db.prepare("DELETE FROM booking_slots WHERE booking_id = ?").bind(booking.id),
      db.prepare("UPDATE bookings SET status = 'cancelled', payment_status = ?, updated_at = ? WHERE id = ? AND status IN ('confirmed', 'pending_payment')").bind(paymentStatus, Date.now(), booking.id),
    ]);
    if (Number(results[1]?.meta?.changes ?? 0) < 1) return Response.json({ error: "This booking cannot be cancelled again." }, { status: 409 });
    const updated = await db.prepare("SELECT * FROM bookings WHERE id = ? LIMIT 1").bind(booking.id).first<BookingRow>();
    if (updated) await sendBookingEmail(updated, undefined, "cancelled");
    return Response.json({ booking: updated ? publicResult(updated) : null, outcome: beforeDeadline ? "Your refund of the full online payment has been started." : "The booking was cancelled after the 24-hour deadline, so the service deposit is retained and the processing cost is not refunded." });
  } catch {
    return Response.json({ error: "The booking could not be cancelled. Please try again." }, { status: 500 });
  }
}

function publicResult(row: BookingRow) {
  return {
    reference: row.reference,
    status: row.status,
    paymentStatus: row.payment_status,
  };
}
