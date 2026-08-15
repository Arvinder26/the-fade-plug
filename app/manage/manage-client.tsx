"use client";

import { useEffect, useMemo, useState } from "react";
import InnerHeader from "../../components/inner-header";
import { AUCKLAND_TIME_ZONE, formatDuration, formatMoney, formatTime } from "../../lib/booking-config";

type Booking = {
  reference: string;
  customerName: string;
  serviceId: string;
  serviceIds: string[];
  serviceName: string;
  durationMinutes: number;
  locationLabel: string;
  appointmentDate: string;
  startMinutes: number;
  status: string;
  paymentStatus: string;
  totalCents: number;
  depositCents: number;
  processingFeeCents: number;
  balanceCents: number;
  cancellationDeadline: string;
  rescheduleCount: number;
  hasReferenceImage: boolean;
  canCancelForRefund: boolean;
  canReschedule: boolean;
};

function readableDate(value: string) {
  return new Intl.DateTimeFormat("en-NZ", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: AUCKLAND_TIME_ZONE }).format(new Date(`${value}T12:00:00+12:00`));
}

function aucklandToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: AUCKLAND_TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export default function ManageClient() {
  const [reference, setReference] = useState("");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newStart, setNewStart] = useState<number | null>(null);
  const [availableStarts, setAvailableStarts] = useState<number[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const minDate = useMemo(() => aucklandToday(), []);

  async function lookup(nextReference = reference, nextToken = token) {
    setLoading(true);
    setNotice("");
    try {
      const response = await fetch("/api/manage", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference: nextReference, email, token: nextToken }) });
      const result = await response.json() as { booking?: Booking; linkSent?: boolean; message?: string; error?: string };
      if (result.linkSent) {
        setBooking(null);
        setNotice(result.message || "Check your email for a secure management link.");
        return;
      }
      if (!response.ok || !result.booking) throw new Error(result.error || "Booking could not be found.");
      setBooking(result.booking);
    } catch (error) {
      setBooking(null);
      setNotice(error instanceof Error ? error.message : "Booking could not be found.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const linkedReference = fragment.get("reference") ?? "";
      const linkedToken = fragment.get("token") ?? "";
      if (linkedReference) setReference(linkedReference);
      if (linkedToken) {
        setToken(linkedToken);
        window.history.replaceState(null, "", window.location.pathname);
        void lookup(linkedReference, linkedToken);
      }
    }, 0);
    return () => window.clearTimeout(timer);
    // The secure-link lookup intentionally runs once on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!showReschedule || !newDate || !booking) return;
    const controller = new AbortController();
    fetch(`/api/availability?date=${encodeURIComponent(newDate)}&services=${encodeURIComponent((booking.serviceIds.length ? booking.serviceIds : [booking.serviceId]).join(","))}`, { signal: controller.signal })
      .then(async response => {
        const result = await response.json() as { starts?: number[]; error?: string };
        if (!response.ok) throw new Error(result.error || "Availability could not be loaded.");
        setAvailableStarts(result.starts ?? []);
      })
      .catch(error => { if (error instanceof Error && error.name !== "AbortError") setNotice(error.message); })
      .finally(() => setLoadingSlots(false));
    return () => controller.abort();
  }, [showReschedule, newDate, booking]);

  async function cancelBooking() {
    setLoading(true);
    setNotice("");
    try {
      const response = await fetch("/api/manage/cancel", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference, email, token }) });
      const result = await response.json() as { booking?: { status: string; paymentStatus: string }; outcome?: string; error?: string };
      if (!response.ok) throw new Error(result.error || "The booking could not be cancelled.");
      setBooking(current => current && result.booking ? { ...current, status: result.booking.status, paymentStatus: result.booking.paymentStatus } : current);
      setNotice(result.outcome ?? "Booking cancelled.");
      setShowCancel(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The booking could not be cancelled.");
    } finally {
      setLoading(false);
    }
  }

  async function rescheduleBooking() {
    if (newStart === null) return;
    setLoading(true);
    setNotice("");
    try {
      const response = await fetch("/api/manage/reschedule", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference, email, token, appointmentDate: newDate, startMinutes: newStart }) });
      const result = await response.json() as { booking?: { appointmentDate: string; startMinutes: number; cancellationDeadline: string; rescheduleCount: number }; error?: string };
      if (!response.ok || !result.booking) throw new Error(result.error || "The booking could not be rescheduled.");
      setBooking(current => current ? { ...current, ...result.booking, canReschedule: false } : current);
      setShowReschedule(false);
      setNotice("Your appointment was moved and an updated confirmation was emailed to you.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The booking could not be rescheduled.");
    } finally {
      setLoading(false);
    }
  }

  const beforeDeadline = booking?.canCancelForRefund ?? false;
  const active = booking?.status === "confirmed";

  return <main className="inner-page"><InnerHeader /><section className="manage-panel"><p className="eyebrow"><span /> Private self-service</p><h1>Manage your<br />booking.</h1><p>Use the secure link in your confirmation email, or enter the booking reference and matching email address.</p>
    {!booking && <form className="manage-form" onSubmit={event => { event.preventDefault(); void lookup(); }}><div className="form-grid"><div className="field field--full"><label htmlFor="reference">Booking reference</label><input id="reference" value={reference} onChange={event => setReference(event.target.value.toUpperCase())} placeholder="e.g. FP-20260815-A1B2C3D4E5F6" maxLength={40} required /></div><div className="field field--full"><label htmlFor="manage-email">Booking email</label><input id="manage-email" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" maxLength={254} required={!token} /></div></div><button className="button" style={{ marginTop: 24 }} type="submit" disabled={loading}>{loading ? "Checking…" : "Email secure link"} <span>↗</span></button><p className="secure-note">For privacy, booking details are only opened from the secure link sent to your email.</p></form>}
    {booking && <div className="manage-booking-card"><div className="manage-booking-head"><div><span className={`booking-status booking-status--${booking.status}`}>{booking.status.replaceAll("_", " ")}</span><h2>{booking.serviceName}</h2><p>{readableDate(booking.appointmentDate)} at {formatTime(booking.startMinutes)}</p></div><b>{booking.reference}</b></div><div className="summary-lines"><div><span>Estimated duration</span><b>{formatDuration(booking.durationMinutes)}</b></div><div><span>Location</span><b>{booking.locationLabel}</b></div><div><span>20% service deposit</span><b>{formatMoney(booking.depositCents - booking.processingFeeCents)}</b></div><div><span>Online processing</span><b>{formatMoney(booking.processingFeeCents)}</b></div><div><span>Paid online</span><b>{formatMoney(booking.depositCents)}</b></div><div><span>Due at appointment</span><b>{formatMoney(booking.balanceCents)}</b></div><div><span>Cancellation deadline</span><b>{new Intl.DateTimeFormat("en-NZ", { dateStyle: "medium", timeStyle: "short", timeZone: AUCKLAND_TIME_ZONE }).format(new Date(booking.cancellationDeadline))}</b></div><div><span>Reference image</span><b>{booking.hasReferenceImage ? "Stored privately" : "None supplied"}</b></div></div>
      {active && <div className="manage-actions"><button className="button" type="button" onClick={() => { setShowReschedule(value => !value); setShowCancel(false); }} disabled={!booking.canReschedule}>Reschedule</button><button className="button button--ghost" type="button" onClick={() => { setShowCancel(value => !value); setShowReschedule(false); }}>Cancel booking</button></div>}
      {active && !beforeDeadline && <p className="secure-note">Online rescheduling has closed because the appointment is less than 24 hours away. Contact Fade Plug if you need help.</p>}
      {showReschedule && <div className="manage-action-panel"><h3>Choose a new time</h3><p>One free transfer is included when completed at least 24 hours beforehand.</p><div className="field"><label htmlFor="new-date">New date</label><input id="new-date" type="date" min={minDate} value={newDate} onChange={event => { setNewDate(event.target.value); setNewStart(null); setAvailableStarts([]); setLoadingSlots(Boolean(event.target.value)); }} /></div>{loadingSlots ? <p className="slot-status">Checking times…</p> : newDate && <div className="time-grid">{availableStarts.map(start => <button className={newStart === start ? "selected" : ""} type="button" key={start} onClick={() => setNewStart(start)}>{formatTime(start)}</button>)}</div>}<button className="button" type="button" onClick={rescheduleBooking} disabled={newStart === null || loading}>Confirm new time</button></div>}
      {showCancel && <div className="manage-action-panel manage-action-panel--danger"><h3>Cancel this appointment?</h3><p>{beforeDeadline ? "You are outside the 24-hour window, so the full amount paid online will be refunded to the original payment method." : "This is inside the 24-hour window, so the 20% service deposit is retained and the processing cost is not refunded."}</p><button className="button" type="button" onClick={cancelBooking} disabled={loading}>{loading ? "Cancelling…" : "Yes, cancel booking"}</button><button className="button button--ghost" type="button" onClick={() => setShowCancel(false)}>Keep booking</button></div>}
      <button className="text-link manage-sign-out" type="button" onClick={() => { setBooking(null); setToken(""); setNotice(""); }}>Look up another booking</button>
    </div>}
    {notice && <div className="info-box" role="status">{notice}</div>}<p className="secure-note">Need help? Call <a href="tel:+64223022464">022 302 2464</a> or email <a href="mailto:bhardwajpuneet0786@gmail.com">bhardwajpuneet0786@gmail.com</a>.</p></section></main>;
}
