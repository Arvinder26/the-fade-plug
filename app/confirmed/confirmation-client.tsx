"use client";

import { useEffect, useState } from "react";
import InnerHeader from "../../components/inner-header";
import { AUCKLAND_TIME_ZONE, formatDuration, formatMoney, formatTime } from "../../lib/booking-config";

type Booking = {
  reference: string;
  serviceName: string;
  durationMinutes: number;
  locationLabel: string;
  appointmentDate: string;
  appointmentIso: string;
  startMinutes: number;
  status: string;
  depositCents: number;
  processingFeeCents: number;
  balanceCents: number;
  cancellationDeadline: string;
  manageToken?: string;
};

export default function ConfirmationClient() {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const reference = fragment.get("reference") ?? "";
    const token = fragment.get("token") ?? "";
    if (token) window.history.replaceState(null, "", window.location.pathname);
    let attempts = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      attempts += 1;
      try {
        const response = await fetch("/api/bookings/confirmation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference, token }) });
        const result = await response.json() as { booking?: Booking; error?: string };
        if (!response.ok || !result.booking) throw new Error(result.error || "Booking details could not be loaded.");
        setBooking({ ...result.booking, manageToken: token });
        if (result.booking.status === "pending_payment" && attempts < 6) timeout = setTimeout(load, 1200);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Booking details could not be loaded.");
      }
    };
    void load();
    return () => { if (timeout) clearTimeout(timeout); };
  }, []);

  function addToCalendar() {
    if (!booking) return;
    const start = new Date(booking.appointmentIso);
    const end = new Date(start.getTime() + booking.durationMinutes * 60_000);
    const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const content = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Fade Plug//Booking//EN", "BEGIN:VEVENT", `UID:${booking.reference}@fadeplug.co.nz`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`, `SUMMARY:Fade Plug — ${booking.serviceName}`, `LOCATION:${booking.locationLabel.replaceAll(",", "\\,")}`, `DESCRIPTION:Booking ${booking.reference}. Balance due at appointment: ${formatMoney(booking.balanceCents)}.`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([content], { type: "text/calendar" }));
    link.download = `${booking.reference}.ics`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return <main className="inner-page"><InnerHeader /><section className="confirmation-card"><div className="confirmation-icon">✓</div><p className="eyebrow" style={{ marginTop: 25 }}><span /> {booking?.status === "confirmed" ? "Deposit received" : "Securing your time"}</p><h1>{booking?.status === "confirmed" ? <>Booking<br />confirmed.</> : <>Payment<br />received.</>}</h1>{!booking && !error && <p>We are matching the secure payment to your appointment…</p>}{error && <div className="info-box" role="alert">{error}</div>}{booking && <><p>{booking.status === "confirmed" ? "Your appointment is reserved and a confirmation has been sent to your email." : "Payment succeeded. The booking confirmation is being finalised; refresh shortly if it remains pending."}</p><div className="summary-lines"><div><span>Booking reference</span><b>{booking.reference}</b></div><div><span>Service</span><b>{booking.serviceName}</b></div><div><span>Date & time</span><b>{booking.appointmentDate} at {formatTime(booking.startMinutes)}</b></div><div><span>Estimated duration</span><b>{formatDuration(booking.durationMinutes)}</b></div><div><span>Barber</span><b>Puneet Bhardwaj</b></div><div><span>Location</span><b>{booking.locationLabel}</b></div><div><span>20% service deposit</span><b>{formatMoney(booking.depositCents - booking.processingFeeCents)}</b></div><div><span>Online processing</span><b>{formatMoney(booking.processingFeeCents)}</b></div><div><span>Paid online</span><b>{formatMoney(booking.depositCents)}</b></div><div><span>Remaining balance</span><b>{formatMoney(booking.balanceCents)}</b></div><div><span>Cancellation deadline</span><b>{new Intl.DateTimeFormat("en-NZ", { dateStyle: "medium", timeStyle: "short", timeZone: AUCKLAND_TIME_ZONE }).format(new Date(booking.cancellationDeadline))}</b></div></div><div className="stage-actions"><button className="button" type="button" onClick={addToCalendar}>Add to calendar</button><a className="button button--ghost" href={`/manage#reference=${encodeURIComponent(booking.reference)}&token=${encodeURIComponent(booking.manageToken ?? "")}`}>Manage booking</a></div></>}</section></main>;
}
