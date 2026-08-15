import { getBookingDb, getRuntimeEnv, isConstraintError, requestBodyTooLarge, sendBookingEmail, type BookingRow } from "../../../../lib/booking-server";

function hex(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(bytes), value => value.toString(16).padStart(2, "0")).join("");
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}

async function verifyStripeSignature(body: string, signature: string, secret: string) {
  const values = Object.fromEntries(signature.split(",").map(item => item.split("=") as [string, string]));
  const timestamp = values.t;
  const supplied = signature.split(",").filter(item => item.startsWith("v1=")).map(item => item.slice(3));
  if (!timestamp || !supplied.length || !/^\d+$/.test(timestamp) || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = hex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${body}`)));
  return supplied.some(value => safeEqual(value, expected));
}

type StripeSession = {
  id: string;
  payment_intent?: string;
  payment_status?: string;
  amount_total?: number;
  currency?: string;
  client_reference_id?: string;
  metadata?: { booking_id?: string; booking_reference?: string };
};

export async function POST(request: Request) {
  try {
    const runtime = getRuntimeEnv();
    if (!runtime.STRIPE_WEBHOOK_SECRET) return Response.json({ error: "Stripe webhook secret is not configured." }, { status: 503 });
    if (requestBodyTooLarge(request, 1_048_576)) return Response.json({ error: "Webhook payload is too large." }, { status: 413 });
    const body = await request.text();
    const signature = request.headers.get("stripe-signature") ?? "";
    if (!await verifyStripeSignature(body, signature, runtime.STRIPE_WEBHOOK_SECRET)) return Response.json({ error: "Invalid Stripe signature." }, { status: 400 });

    let event: { id?: string; type?: string; data?: { object?: StripeSession } };
    try {
      event = JSON.parse(body) as typeof event;
    } catch {
      return Response.json({ error: "Invalid webhook payload." }, { status: 400 });
    }
    if (!event.id || !event.type || !["checkout.session.completed", "checkout.session.expired"].includes(event.type)) return Response.json({ received: true });
    const session = event.data?.object;
    const bookingId = session?.metadata?.booking_id;
    if (!session?.id || !bookingId) return Response.json({ error: "Webhook booking details are missing." }, { status: 400 });

    const db = getBookingDb();
    const booking = await db.prepare("SELECT * FROM bookings WHERE id = ? LIMIT 1").bind(bookingId).first<BookingRow>();
    if (!booking || session.client_reference_id !== booking.id || session.metadata?.booking_reference !== booking.reference || (booking.stripe_session_id && session.id !== booking.stripe_session_id)) return Response.json({ error: "Webhook booking details do not match." }, { status: 400 });

    if (event.type === "checkout.session.completed") {
      if (session.payment_status !== "paid" || session.amount_total !== booking.deposit_cents || session.currency?.toLowerCase() !== "nzd") return Response.json({ error: "Webhook payment details do not match." }, { status: 400 });
      let results: D1Result[];
      try {
        results = await db.batch([
          db.prepare("INSERT INTO processed_webhook_events (id, event_type, processed_at) VALUES (?, ?, ?)").bind(event.id, event.type, Date.now()),
          db.prepare("UPDATE bookings SET status = 'confirmed', payment_status = 'deposit_paid', stripe_session_id = ?, stripe_payment_intent_id = ?, updated_at = ? WHERE id = ? AND status = 'pending_payment' AND (stripe_session_id IS NULL OR stripe_session_id = ?)").bind(session.id, session.payment_intent ?? null, Date.now(), bookingId, session.id),
        ]);
      } catch (error) {
        if (isConstraintError(error)) return Response.json({ received: true, duplicate: true });
        throw error;
      }
      if (Number(results[1]?.meta?.changes ?? 0) > 0) {
        const updated = await db.prepare("SELECT * FROM bookings WHERE id = ? LIMIT 1").bind(bookingId).first<BookingRow>();
        if (updated) await sendBookingEmail(updated, undefined, "confirmed");
      }
    }
    if (event.type === "checkout.session.expired") {
      try {
        await db.batch([
          db.prepare("INSERT INTO processed_webhook_events (id, event_type, processed_at) VALUES (?, ?, ?)").bind(event.id, event.type, Date.now()),
          db.prepare("DELETE FROM booking_slots WHERE booking_id = ? AND EXISTS (SELECT 1 FROM bookings WHERE id = ? AND status = 'pending_payment')").bind(bookingId, bookingId),
          db.prepare("UPDATE bookings SET status = 'expired', updated_at = ? WHERE id = ? AND status = 'pending_payment'").bind(Date.now(), bookingId),
        ]);
      } catch (error) {
        if (isConstraintError(error)) return Response.json({ received: true, duplicate: true });
        throw error;
      }
    }
    return Response.json({ received: true });
  } catch {
    return Response.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
