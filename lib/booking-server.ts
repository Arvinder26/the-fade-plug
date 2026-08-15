import { env } from "cloudflare:workers";
import {
  AUCKLAND_TIME_ZONE,
  CLOSING_MINUTES,
  OPENING_MINUTES,
  SLOT_INTERVAL_MINUTES,
  formatMoney,
  formatTime,
  getSlotMinutes,
} from "./booking-config";

export type BookingRow = {
  id: string;
  reference: string;
  manage_token_hash: string;
  manage_token_nonce: string;
  customer_name: string;
  phone: string;
  email: string;
  service_id: string;
  service_name: string;
  service_price_cents: number;
  duration_minutes: number;
  location: "studio" | "mobile";
  suburb: string | null;
  travel_fee_cents: number;
  appointment_date: string;
  start_minutes: number;
  end_minutes: number;
  status: string;
  payment_status: string;
  total_cents: number;
  deposit_cents: number;
  processing_fee_cents: number;
  balance_cents: number;
  stripe_session_id: string | null;
  stripe_payment_intent_id: string | null;
  notes: string | null;
  reference_image_key: string | null;
  cancellation_deadline: string;
  reschedule_count: number;
  expires_at: number;
  created_at: number;
  updated_at: number;
};

export type RuntimeEnv = {
  DB?: D1Database;
  UPLOADS?: R2Bucket;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  BOOKING_TOKEN_SECRET?: string;
  RESEND_API_KEY?: string;
  BOOKING_FROM_EMAIL?: string;
  BOOKING_NOTIFICATION_EMAIL?: string;
  SITE_URL?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
};

export function getRuntimeEnv() {
  return env as unknown as RuntimeEnv;
}

export function getBookingDb() {
  const db = getRuntimeEnv().DB;
  if (!db) throw new Error("Booking database is not connected.");
  return db;
}

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export function requestBodyTooLarge(request: Request, maximumBytes: number) {
  const value = request.headers.get("content-length");
  if (!value) return false;
  const length = Number(value);
  return !Number.isFinite(length) || length < 0 || length > maximumBytes;
}

export async function readLimitedJson<T>(request: Request, maximumBytes: number): Promise<T | null> {
  if (requestBodyTooLarge(request, maximumBytes) || !request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximumBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes)) as T;
  } catch {
    return null;
  }
}

export function clientIp(request: Request) {
  return request.headers.get("cf-connecting-ip")?.trim()
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
}

export async function hashToken(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

function base64Url(bytes: ArrayBuffer) {
  const binary = Array.from(new Uint8Array(bytes), byte => String.fromCharCode(byte)).join("");
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export async function createBookingManageToken(bookingId: string, nonce: string) {
  const secret = getRuntimeEnv().BOOKING_TOKEN_SECRET;
  if (!secret || secret.length < 32) throw new Error("Secure booking-link signing is not configured.");
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64Url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${bookingId}:${nonce}`)));
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

export async function enforceRateLimit(request: Request, scope: string, limit: number, windowSeconds: number, discriminator = "") {
  const db = getRuntimeEnv().DB;
  if (!db) return { allowed: true, retryAfterSeconds: 0 };

  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const resetAt = windowStart + windowMs;
  const identity = discriminator || clientIp(request);
  const key = await hashToken(`${scope}:${windowStart}:${identity}`);
  const result = await db.prepare(`INSERT INTO request_rate_limits (key, request_count, reset_at) VALUES (?, 1, ?)
    ON CONFLICT(key) DO UPDATE SET request_count = request_count + 1
    RETURNING request_count`).bind(key, resetAt).first<{ request_count: number }>();

  if (crypto.getRandomValues(new Uint8Array(1))[0] === 0) {
    await db.prepare("DELETE FROM request_rate_limits WHERE reset_at < ?").bind(now - 86_400_000).run().catch(() => undefined);
  }

  return {
    allowed: Number(result?.request_count ?? limit + 1) <= limit,
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
  };
}

export async function verifyTurnstile(request: Request, token: string, expectedAction: string) {
  const secret = getRuntimeEnv().TURNSTILE_SECRET_KEY;
  const hostname = new URL(request.url).hostname;
  if (!secret) return hostname === "localhost" || hostname === "127.0.0.1";
  if (!token || token.length > 2048) return false;

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret, response: token, remoteip: clientIp(request), idempotency_key: crypto.randomUUID() }),
  });
  if (!response.ok) return false;
  const result = await response.json() as { success?: boolean; action?: string; hostname?: string };
  return result.success === true && result.action === expectedAction && (!result.hostname || result.hostname === hostname);
}

export async function findAuthorizedBooking(db: D1Database, input: { reference?: string; email?: string; token?: string }, allowEmail = false) {
  const reference = input.reference?.trim().toUpperCase() ?? "";
  if (!reference) return null;
  const row = await db.prepare("SELECT * FROM bookings WHERE reference = ? LIMIT 1").bind(reference).first<BookingRow>();
  if (!row) return null;
  if (input.token && safeEqual(row.manage_token_hash, await hashToken(input.token))) return row;
  if (allowEmail && input.email && row.email.toLowerCase() === input.email.trim().toLowerCase()) return row;
  return null;
}

export function getAucklandToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: AUCKLAND_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function aucklandDateTimeToUtc(date: string, minutes: number) {
  const [year, month, day] = date.split("-").map(Number);
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  const intendedUtc = Date.UTC(year, month - 1, day, hour, minute);
  let guess = intendedUtc;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: AUCKLAND_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(guess)).map(part => [part.type, part.value]));
    const representedUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute));
    guess -= representedUtc - intendedUtc;
  }
  return new Date(guess);
}

export function validateBookingDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const today = getAucklandToday();
  const max = new Date(`${today}T12:00:00Z`);
  max.setUTCDate(max.getUTCDate() + 365);
  return date >= today && date <= max.toISOString().slice(0, 10);
}

export function allStartTimes(durationMinutes: number) {
  const starts: number[] = [];
  for (let start = OPENING_MINUTES; start + durationMinutes <= CLOSING_MINUTES; start += SLOT_INTERVAL_MINUTES) starts.push(start);
  return starts;
}

export function availableStartTimesForDate(date: string, durationMinutes: number) {
  const starts = allStartTimes(durationMinutes);
  if (date !== getAucklandToday()) return starts;
  const timeParts = Object.fromEntries(new Intl.DateTimeFormat("en-NZ", {
    timeZone: AUCKLAND_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date()).map(part => [part.type, part.value]));
  const nextBookableMinute = Number(timeParts.hour) * 60 + Number(timeParts.minute) + SLOT_INTERVAL_MINUTES;
  return starts.filter(start => start >= nextBookableMinute);
}

async function applyRetentionRules(db: D1Database) {
  const runtime = getRuntimeEnv();
  const imageCutoff = new Date();
  imageCutoff.setUTCDate(imageCutoff.getUTCDate() - 90);
  const oldImages = await db.prepare("SELECT id, reference_image_key FROM bookings WHERE reference_image_key IS NOT NULL AND appointment_date < ? LIMIT 25").bind(imageCutoff.toISOString().slice(0, 10)).all<{ id: string; reference_image_key: string }>();
  for (const row of oldImages.results) {
    if (runtime.UPLOADS) await runtime.UPLOADS.delete(row.reference_image_key);
    await db.prepare("UPDATE bookings SET reference_image_key = NULL, updated_at = ? WHERE id = ?").bind(Date.now(), row.id).run();
  }

  const personalCutoff = new Date();
  personalCutoff.setUTCMonth(personalCutoff.getUTCMonth() - 24);
  await db.prepare("UPDATE bookings SET customer_name = 'Deleted customer', phone = '', email = 'deleted+' || id || '@invalid.local', suburb = NULL, notes = NULL, marketing_consent = 0, manage_token_hash = 'revoked', manage_token_nonce = '', updated_at = ? WHERE appointment_date < ? AND customer_name <> 'Deleted customer'")
    .bind(Date.now(), personalCutoff.toISOString().slice(0, 10)).run();
}

export async function clearExpiredHolds(db: D1Database) {
  const now = Date.now();
  await db.batch([
    db.prepare("DELETE FROM booking_slots WHERE booking_id IN (SELECT id FROM bookings WHERE status = 'pending_payment' AND expires_at < ?)").bind(now),
    db.prepare("UPDATE bookings SET status = 'expired', updated_at = ? WHERE status = 'pending_payment' AND expires_at < ?").bind(now, now),
  ]);
  await applyRetentionRules(db);
}

export async function getAvailableStarts(db: D1Database, date: string, durationMinutes: number, excludeBookingId?: string) {
  await clearExpiredHolds(db);
  const query = excludeBookingId
    ? db.prepare("SELECT slot_minutes FROM booking_slots WHERE appointment_date = ? AND booking_id <> ?").bind(date, excludeBookingId)
    : db.prepare("SELECT slot_minutes FROM booking_slots WHERE appointment_date = ?").bind(date);
  const result = await query.all<{ slot_minutes: number }>();
  const occupied = new Set(result.results.map(row => row.slot_minutes));
  return availableStartTimesForDate(date, durationMinutes).filter(start => getSlotMinutes(start, durationMinutes).every(slot => !occupied.has(slot)));
}

export function publicBooking(row: BookingRow) {
  const appointment = aucklandDateTimeToUtc(row.appointment_date, row.start_minutes);
  const beforeDeadline = Date.now() < new Date(row.cancellation_deadline).getTime();
  return {
    reference: row.reference,
    customerName: row.customer_name,
    serviceId: row.service_id,
    serviceIds: row.service_id.split(",").filter(Boolean),
    serviceName: row.service_name,
    durationMinutes: row.duration_minutes,
    location: row.location,
    locationLabel: row.location === "studio" ? "114 Cargill Street, Papakura" : `Mobile service — ${row.suburb ?? "Auckland"}`,
    appointmentDate: row.appointment_date,
    startMinutes: row.start_minutes,
    appointmentIso: appointment.toISOString(),
    status: row.status,
    paymentStatus: row.payment_status,
    totalCents: row.total_cents,
    depositCents: row.deposit_cents,
    processingFeeCents: row.processing_fee_cents,
    balanceCents: row.balance_cents,
    cancellationDeadline: row.cancellation_deadline,
    canCancelForRefund: beforeDeadline,
    canReschedule: row.status === "confirmed" && beforeDeadline && row.reschedule_count < 1,
    rescheduleCount: row.reschedule_count,
    hasReferenceImage: Boolean(row.reference_image_key),
  };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}

export async function sendBookingEmail(row: BookingRow, manageToken?: string, kind: "confirmed" | "rescheduled" | "cancelled" = "confirmed") {
  const runtime = getRuntimeEnv();
  if (!runtime.RESEND_API_KEY || !runtime.BOOKING_FROM_EMAIL) return { sent: false, reason: "Email is not connected." };
  let origin = "https://fadeplug.co.nz";
  try {
    const configured = new URL(runtime.SITE_URL ?? origin);
    if (configured.protocol === "https:" || configured.hostname === "localhost") origin = configured.origin;
  } catch {
    // Keep the secure production fallback when SITE_URL is malformed.
  }
  let secureToken = manageToken;
  if (!secureToken && row.manage_token_nonce) {
    try {
      secureToken = await createBookingManageToken(row.id, row.manage_token_nonce);
    } catch {
      secureToken = undefined;
    }
  }
  const manageUrl = secureToken ? `${origin}/manage#reference=${encodeURIComponent(row.reference)}&token=${encodeURIComponent(secureToken)}` : `${origin}/manage`;
  const subjects = {
    confirmed: `Fade Plug booking confirmed — ${row.reference}`,
    rescheduled: `Fade Plug booking updated — ${row.reference}`,
    cancelled: `Fade Plug booking cancelled — ${row.reference}`,
  };
  const heading = kind === "confirmed" ? "Your time is reserved." : kind === "rescheduled" ? "Your booking has moved." : "Your booking is cancelled.";
  const appointment = `${row.appointment_date} at ${formatTime(row.start_minutes)}`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#161616"><h1>${escapeHtml(heading)}</h1><p>Hi ${escapeHtml(row.customer_name)},</p><p>${kind === "cancelled" ? "Your appointment has been cancelled." : "Here are your Fade Plug appointment details."}</p><table style="width:100%;border-collapse:collapse"><tr><td style="padding:10px 0;border-bottom:1px solid #ddd">Reference</td><td style="text-align:right;font-weight:bold">${escapeHtml(row.reference)}</td></tr><tr><td style="padding:10px 0;border-bottom:1px solid #ddd">Service</td><td style="text-align:right;font-weight:bold">${escapeHtml(row.service_name)}</td></tr><tr><td style="padding:10px 0;border-bottom:1px solid #ddd">Date & time</td><td style="text-align:right;font-weight:bold">${escapeHtml(appointment)}</td></tr><tr><td style="padding:10px 0;border-bottom:1px solid #ddd">Location</td><td style="text-align:right;font-weight:bold">${escapeHtml(row.location === "studio" ? "114 Cargill Street, Papakura" : `Mobile — ${row.suburb ?? "Auckland"}`)}</td></tr><tr><td style="padding:10px 0;border-bottom:1px solid #ddd">20% service deposit</td><td style="text-align:right;font-weight:bold">${formatMoney(row.deposit_cents - row.processing_fee_cents)}</td></tr><tr><td style="padding:10px 0;border-bottom:1px solid #ddd">Online processing</td><td style="text-align:right;font-weight:bold">${formatMoney(row.processing_fee_cents)}</td></tr><tr><td style="padding:10px 0;border-bottom:1px solid #ddd">Paid online</td><td style="text-align:right;font-weight:bold">${formatMoney(row.deposit_cents)}</td></tr><tr><td style="padding:10px 0">Due at appointment</td><td style="text-align:right;font-weight:bold">${formatMoney(row.balance_cents)}</td></tr></table><p><a href="${escapeHtml(manageUrl)}">Manage this booking</a></p><p>Need help? Call 022 302 2464 or reply to this email.</p></div>`;
  const recipients = [{ to: row.email, subject: subjects[kind] }];
  if (runtime.BOOKING_NOTIFICATION_EMAIL && runtime.BOOKING_NOTIFICATION_EMAIL.toLowerCase() !== row.email.toLowerCase()) recipients.push({ to: runtime.BOOKING_NOTIFICATION_EMAIL, subject: `${subjects[kind]} — ${row.customer_name}` });

  const responses = await Promise.all(recipients.map((recipient, index) => fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${runtime.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `${row.id}-${kind}-${index}`,
    },
    body: JSON.stringify({ from: runtime.BOOKING_FROM_EMAIL, to: [recipient.to], subject: recipient.subject, html }),
  })));
  return { sent: responses.every(response => response.ok) };
}

export async function sendManageAccessEmail(row: BookingRow) {
  const runtime = getRuntimeEnv();
  if (!runtime.RESEND_API_KEY || !runtime.BOOKING_FROM_EMAIL || !row.manage_token_nonce) return { sent: false, reason: "Email access is not connected." };
  const token = await createBookingManageToken(row.id, row.manage_token_nonce);
  let origin = "https://fadeplug.co.nz";
  try {
    const configured = new URL(runtime.SITE_URL ?? origin);
    if (configured.protocol === "https:" || configured.hostname === "localhost") origin = configured.origin;
  } catch {
    // Keep the secure production fallback when SITE_URL is malformed.
  }
  const manageUrl = `${origin}/manage#reference=${encodeURIComponent(row.reference)}&token=${encodeURIComponent(token)}`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#161616"><h1>Manage your Fade Plug booking.</h1><p>Hi ${escapeHtml(row.customer_name)},</p><p>Use the secure link below to view, reschedule or cancel booking ${escapeHtml(row.reference)}. If you did not request this email, no action is required.</p><p><a href="${escapeHtml(manageUrl)}">Open your booking securely</a></p><p>This link should be kept private. Need help? Call 022 302 2464 or reply to this email.</p></div>`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${runtime.RESEND_API_KEY}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `${row.id}-manage-${Math.floor(Date.now() / 600_000)}`,
    },
    body: JSON.stringify({ from: runtime.BOOKING_FROM_EMAIL, to: [row.email], subject: `Secure Fade Plug booking link — ${row.reference}`, html }),
  });
  return { sent: response.ok };
}

export function isConstraintError(error: unknown) {
  return error instanceof Error && /unique|constraint|booking_slots/i.test(`${error.message} ${String(error.cause ?? "")}`);
}
