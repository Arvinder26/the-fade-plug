import {
  aucklandDateTimeToUtc,
  createBookingManageToken,
  enforceRateLimit,
  getAvailableStarts,
  getBookingDb,
  getRuntimeEnv,
  hashToken,
  isSameOriginRequest,
  isConstraintError,
  requestBodyTooLarge,
  validateBookingDate,
  verifyTurnstile,
} from "../../../lib/booking-server";
import { calculateBookingMoney, getServiceSelectionSummary, getSlotMinutes, type ServiceSelection } from "../../../lib/booking-config";

function textValue(form: FormData, key: string) {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function singleLineValue(form: FormData, key: string) {
  return Array.from(textValue(form, key), character => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127 ? " " : character;
  }).join("").replace(/\s+/g, " ").trim();
}

function extensionFor(type: string) {
  return ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif" } as Record<string, string>)[type];
}

async function hasValidImageSignature(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 32).arrayBuffer());
  const ascii = (start: number, length: number) => String.fromCharCode(...bytes.slice(start, start + length));
  if (file.type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.type === "image/png") return bytes.slice(0, 8).every((value, index) => value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index]);
  if (file.type === "image/webp") return ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP";
  if (file.type === "image/heic" || file.type === "image/heif") return ascii(4, 4) === "ftyp" && ["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(ascii(8, 4));
  return false;
}

function checkoutOrigin(request: Request, configuredUrl?: string) {
  const requestOrigin = new URL(request.url).origin;
  if (!configuredUrl) return requestOrigin;
  try {
    const configured = new URL(configuredUrl);
    if (configured.protocol === "https:" || configured.hostname === "localhost") return configured.origin;
  } catch {
    // Ignore malformed configuration and use the trusted request origin.
  }
  return requestOrigin;
}

export async function POST(request: Request) {
  let uploadedKey = "";
  let createdBookingId = "";
  let cleanupDb: D1Database | undefined;
  try {
    if (!isSameOriginRequest(request)) return Response.json({ error: "This booking request was blocked." }, { status: 403 });
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) return Response.json({ error: "Use the secure booking form to continue." }, { status: 415 });
    if (requestBodyTooLarge(request, 6 * 1024 * 1024)) return Response.json({ error: "The booking request is too large." }, { status: 413 });
    const rateLimit = await enforceRateLimit(request, "booking-create", 6, 30 * 60);
    if (!rateLimit.allowed) return Response.json({ error: "Too many booking attempts. Please wait and try again." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } });

    const form = await request.formData();
    let serviceSelections: ServiceSelection[] = [];
    try {
      serviceSelections = JSON.parse(textValue(form, "serviceSelections")) as ServiceSelection[];
    } catch {
      return Response.json({ error: "Choose valid services." }, { status: 400 });
    }
    const selection = Array.isArray(serviceSelections) ? getServiceSelectionSummary(serviceSelections) : null;
    const location = singleLineValue(form, "location") as "studio" | "mobile";
    const suburb = singleLineValue(form, "suburb");
    const appointmentDate = textValue(form, "appointmentDate");
    const startMinutes = Number(textValue(form, "startMinutes"));
    const customerName = singleLineValue(form, "name");
    const phone = singleLineValue(form, "mobile");
    const email = singleLineValue(form, "email").toLowerCase();
    const notes = textValue(form, "notes");
    const marketingConsent = textValue(form, "marketing") === "yes" ? 1 : 0;
    const turnstileToken = textValue(form, "turnstileToken");
    const referenceImage = form.get("referenceImage");

    if (!selection) return Response.json({ error: "Choose valid compatible services and prices." }, { status: 400 });
    if (!(["studio", "mobile"] as string[]).includes(location) || (location === "mobile" && !suburb)) return Response.json({ error: "Choose a valid appointment location." }, { status: 400 });
    if (!validateBookingDate(appointmentDate) || !Number.isInteger(startMinutes)) return Response.json({ error: "Choose a valid appointment time." }, { status: 400 });
    if (!customerName || customerName.length > 100 || phone.length < 7 || phone.length > 30 || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) return Response.json({ error: "Enter your name, phone number and a valid email." }, { status: 400 });
    if (suburb.length > 120 || notes.length > 2_000) return Response.json({ error: "Some booking details are longer than allowed." }, { status: 400 });

    const runtime = getRuntimeEnv();
    if (!runtime.DB || !runtime.STRIPE_SECRET_KEY || !runtime.BOOKING_TOKEN_SECRET || runtime.BOOKING_TOKEN_SECRET.length < 32) {
      return Response.json({ setupRequired: true, error: "The local booking preview is ready. Connect the booking database, Stripe account and secure booking-link secret to accept a deposit." }, { status: 503 });
    }
    if (!await verifyTurnstile(request, turnstileToken, "booking")) return Response.json({ error: "The security check expired or could not be verified. Please try again." }, { status: 400 });
    if (referenceImage instanceof File && referenceImage.size > 0) {
      const extension = extensionFor(referenceImage.type);
      if (!extension || referenceImage.size > 5 * 1024 * 1024) return Response.json({ error: "Reference images must be JPG, PNG, WebP or HEIC and no larger than 5 MB." }, { status: 400 });
      if (!await hasValidImageSignature(referenceImage)) return Response.json({ error: "That reference image does not appear to be a valid image file." }, { status: 400 });
      if (!runtime.UPLOADS) return Response.json({ setupRequired: true, error: "Private reference-image storage must be connected before this file can be uploaded." }, { status: 503 });
    }

    const db = getBookingDb();
    cleanupDb = db;
    const available = await getAvailableStarts(db, appointmentDate, selection.durationMinutes);
    if (!available.includes(startMinutes)) return Response.json({ error: "That time has just been taken. Please choose another available time." }, { status: 409 });

    const id = crypto.randomUUID();
    const manageTokenNonce = crypto.randomUUID();
    const manageToken = await createBookingManageToken(id, manageTokenNonce);
    const manageTokenHash = await hashToken(manageToken);
    const randomCode = crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
    const reference = `FP-${appointmentDate.replaceAll("-", "")}-${randomCode}`;
    const money = calculateBookingMoney(selection.servicePriceCents, location);
    const appointment = aucklandDateTimeToUtc(appointmentDate, startMinutes);
    const cancellationDeadline = new Date(appointment.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const now = Date.now();
    const expiresAt = now + 31 * 60 * 1000;

    if (referenceImage instanceof File && referenceImage.size > 0 && runtime.UPLOADS) {
      uploadedKey = `booking-references/${id}/${crypto.randomUUID()}.${extensionFor(referenceImage.type)}`;
      await runtime.UPLOADS.put(uploadedKey, await referenceImage.arrayBuffer(), {
        httpMetadata: { contentType: referenceImage.type },
        customMetadata: { bookingId: id },
      });
    }

    const statements = [
      db.prepare(`INSERT INTO bookings (id, reference, manage_token_hash, manage_token_nonce, customer_name, phone, email, service_id, service_name, service_price_cents, duration_minutes, location, suburb, travel_fee_cents, appointment_date, start_minutes, end_minutes, status, payment_status, total_cents, deposit_cents, processing_fee_cents, balance_cents, notes, marketing_consent, reference_image_key, cancellation_deadline, reschedule_count, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_payment', 'pending', ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`)
        .bind(id, reference, manageTokenHash, manageTokenNonce, customerName, phone, email, selection.serviceIds.join(","), selection.serviceName, selection.servicePriceCents, selection.durationMinutes, location, suburb || null, money.travelFeeCents, appointmentDate, startMinutes, startMinutes + selection.durationMinutes, money.totalCents, money.depositCents, money.processingFeeCents, money.balanceCents, notes || null, marketingConsent, uploadedKey || null, cancellationDeadline, expiresAt, now, now),
      ...getSlotMinutes(startMinutes, selection.durationMinutes).map(slot => db.prepare("INSERT INTO booking_slots (appointment_date, slot_minutes, booking_id) VALUES (?, ?, ?)").bind(appointmentDate, slot, id)),
    ];
    createdBookingId = id;
    await db.batch(statements);

    const origin = checkoutOrigin(request, runtime.SITE_URL);
    const stripeBody = new URLSearchParams({
      mode: "payment",
      customer_email: email,
      client_reference_id: id,
      success_url: `${origin}/confirmed#reference=${encodeURIComponent(reference)}&token=${encodeURIComponent(manageToken)}`,
      cancel_url: `${origin}/book?payment=cancelled`,
      "line_items[0][price_data][currency]": "nzd",
      "line_items[0][price_data][unit_amount]": String(money.depositCents),
      "line_items[0][price_data][product_data][name]": `20% deposit + online processing — ${selection.serviceName}`,
      "line_items[0][price_data][product_data][description]": `${appointmentDate} at ${Math.floor(startMinutes / 60)}:${String(startMinutes % 60).padStart(2, "0")} · ${money.processingFeeCents / 100} NZD processing included · balance due at appointment`,
      "line_items[0][quantity]": "1",
      "metadata[booking_id]": id,
      "metadata[booking_reference]": reference,
      "payment_intent_data[metadata][booking_id]": id,
      "expires_at": String(Math.floor(expiresAt / 1000)),
    });
    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${runtime.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": `booking-${id}` },
      body: stripeBody,
    });
    const stripeSession = await stripeResponse.json() as { id?: string; url?: string; error?: { message?: string } };
    if (!stripeResponse.ok || !stripeSession.id || !stripeSession.url) throw new Error(stripeSession.error?.message ?? "Stripe could not create the secure checkout.");
    const checkoutUrl = new URL(stripeSession.url);
    if (checkoutUrl.protocol !== "https:" || checkoutUrl.hostname !== "checkout.stripe.com") throw new Error("Stripe returned an invalid checkout address.");
    await db.prepare("UPDATE bookings SET stripe_session_id = ?, updated_at = ? WHERE id = ?").bind(stripeSession.id, Date.now(), id).run().catch(() => undefined);
    return Response.json({ checkoutUrl: checkoutUrl.toString(), reference }, { status: 201 });
  } catch (error) {
    if (createdBookingId && cleanupDb) {
      await cleanupDb.batch([
        cleanupDb.prepare("DELETE FROM booking_slots WHERE booking_id = ?").bind(createdBookingId),
        cleanupDb.prepare("DELETE FROM bookings WHERE id = ?").bind(createdBookingId),
      ]).catch(() => undefined);
    }
    if (uploadedKey) await getRuntimeEnv().UPLOADS?.delete(uploadedKey).catch(() => undefined);
    const message = isConstraintError(error) ? "That time has just been taken. Please choose another available time." : "The booking could not be started. Please try again.";
    return Response.json({ error: message }, { status: isConstraintError(error) ? 409 : 500 });
  }
}
