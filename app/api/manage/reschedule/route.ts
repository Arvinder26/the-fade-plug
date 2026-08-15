import {
  aucklandDateTimeToUtc,
  enforceRateLimit,
  findAuthorizedBooking,
  getAvailableStarts,
  getBookingDb,
  isConstraintError,
  isSameOriginRequest,
  readLimitedJson,
  requestBodyTooLarge,
  sendBookingEmail,
  validateBookingDate,
  type BookingRow,
} from "../../../../lib/booking-server";
import { getSlotMinutes } from "../../../../lib/booking-config";

export async function POST(request: Request) {
  try {
    if (!isSameOriginRequest(request)) return Response.json({ error: "This request was blocked." }, { status: 403 });
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json") || requestBodyTooLarge(request, 4_096)) return Response.json({ error: "Use the secure booking form to continue." }, { status: 400 });
    const rateLimit = await enforceRateLimit(request, "booking-reschedule", 10, 15 * 60);
    if (!rateLimit.allowed) return Response.json({ error: "Too many attempts. Please wait and try again." }, { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } });
    const input = await readLimitedJson<{ reference?: string; email?: string; token?: string; appointmentDate?: string; startMinutes?: number }>(request, 4_096);
    if (!input) return Response.json({ error: "A secure booking link is required." }, { status: 400 });
    if (!input.reference || !input.token || input.reference.length > 40 || input.token.length > 100) return Response.json({ error: "A secure booking link is required." }, { status: 400 });
    const db = getBookingDb();
    const booking = await findAuthorizedBooking(db, input);
    if (!booking) return Response.json({ error: "No booking matched those secure details." }, { status: 404 });
    if (booking.status !== "confirmed") return Response.json({ error: "Only confirmed appointments can be rescheduled." }, { status: 409 });
    if (booking.reschedule_count >= 1) return Response.json({ error: "The included reschedule has already been used. Please contact Fade Plug for help." }, { status: 409 });
    if (Date.now() >= new Date(booking.cancellation_deadline).getTime()) return Response.json({ error: "Online rescheduling closes 24 hours before the appointment. Please contact Fade Plug." }, { status: 409 });
    const appointmentDate = input.appointmentDate ?? "";
    const startMinutes = Number(input.startMinutes);
    if (!validateBookingDate(appointmentDate) || !Number.isInteger(startMinutes)) return Response.json({ error: "Choose a valid new appointment time." }, { status: 400 });
    const available = await getAvailableStarts(db, appointmentDate, booking.duration_minutes, booking.id);
    if (!available.includes(startMinutes)) return Response.json({ error: "That time has just been taken. Please choose another." }, { status: 409 });

    const appointment = aucklandDateTimeToUtc(appointmentDate, startMinutes);
    const deadline = new Date(appointment.getTime() - 24 * 60 * 60 * 1000).toISOString();
    await db.batch([
      db.prepare("INSERT INTO booking_action_locks (key, created_at) VALUES (?, ?)").bind(`reschedule:${booking.id}`, Date.now()),
      db.prepare("DELETE FROM booking_slots WHERE booking_id = ?").bind(booking.id),
      ...getSlotMinutes(startMinutes, booking.duration_minutes).map(slot => db.prepare("INSERT INTO booking_slots (appointment_date, slot_minutes, booking_id) VALUES (?, ?, ?)").bind(appointmentDate, slot, booking.id)),
      db.prepare("UPDATE bookings SET appointment_date = ?, start_minutes = ?, end_minutes = ?, cancellation_deadline = ?, reschedule_count = reschedule_count + 1, updated_at = ? WHERE id = ? AND status = 'confirmed' AND reschedule_count = 0").bind(appointmentDate, startMinutes, startMinutes + booking.duration_minutes, deadline, Date.now(), booking.id),
    ]);
    const updated = await db.prepare("SELECT * FROM bookings WHERE id = ? LIMIT 1").bind(booking.id).first<BookingRow>();
    if (updated) await sendBookingEmail(updated, undefined, "rescheduled");
    return Response.json({ booking: updated ? { reference: updated.reference, appointmentDate: updated.appointment_date, startMinutes: updated.start_minutes, cancellationDeadline: updated.cancellation_deadline, rescheduleCount: updated.reschedule_count } : null });
  } catch (error) {
    const conflict = isConstraintError(error);
    return Response.json({ error: conflict ? "That time is no longer available or the included reschedule has already been used." : "The booking could not be rescheduled. Please try again." }, { status: conflict ? 409 : 500 });
  }
}
