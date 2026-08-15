"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import BrandMark from "../../components/brand-mark";
import {
  AUCKLAND_TIME_ZONE,
  SERVICES,
  calculateBookingMoney,
  formatDuration,
  formatMoney,
  formatTime,
  getServiceSelectionSummary,
} from "../../lib/booking-config";

const stepNames = ["Service", "Location", "Date & time", "Your details", "Review & pay", "Confirmed"];
const weekdayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const comboComponentIds = new Set(["haircut", "beard", "wax"]);
const beardService = SERVICES.find(service => service.id === "beard");

declare global {
  interface Window {
    turnstile?: {
      render(element: HTMLElement, options: { sitekey: string; action: string; theme: string; callback(token: string): void; "expired-callback"(): void; "error-callback"(): void }): string;
      reset(widgetId?: string): void;
      remove(widgetId: string): void;
    };
  }
}

function aucklandDate(offsetDays = 0) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: AUCKLAND_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(Date.now() + offsetDays * 86_400_000));
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function readableDate(value: string) {
  if (!value) return "Not selected";
  return new Intl.DateTimeFormat("en-NZ", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: AUCKLAND_TIME_ZONE }).format(new Date(`${value}T12:00:00+12:00`));
}

function isoDateFromUtc(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthStart(value: string) {
  return `${value.slice(0, 7)}-01`;
}

function shiftMonth(value: string, offset: number) {
  const [year, month] = value.split("-").map(Number);
  return isoDateFromUtc(new Date(Date.UTC(year, month - 1 + offset, 1)));
}

function monthLabel(value: string) {
  return new Intl.DateTimeFormat("en-NZ", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}

function calendarDaysForMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const mondayIndex = (firstDay.getUTCDay() + 6) % 7;
  const calendarStart = new Date(firstDay);
  calendarStart.setUTCDate(firstDay.getUTCDate() - mondayIndex);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(calendarStart);
    date.setUTCDate(calendarStart.getUTCDate() + index);
    return {
      iso: isoDateFromUtc(date),
      day: date.getUTCDate(),
      currentMonth: date.getUTCMonth() === month - 1,
    };
  });
}

export default function BookingClient() {
  const [step, setStep] = useState(1);
  const [serviceSelections, setServiceSelections] = useState<Record<string, number>>({});
  const [location, setLocation] = useState<"studio" | "mobile" | "">("");
  const [suburb, setSuburb] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [startMinutes, setStartMinutes] = useState<number | null>(null);
  const [availableStarts, setAvailableStarts] = useState<number[]>([]);
  const [calendarReady, setCalendarReady] = useState<boolean | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [calendarError, setCalendarError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [referenceImage, setReferenceImage] = useState<File | null>(null);
  const [details, setDetails] = useState({ name: "", mobile: "", email: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitNotice, setSubmitNotice] = useState("");
  const [checkoutNotice, setCheckoutNotice] = useState("");
  const [turnstileSiteKey, setTurnstileSiteKey] = useState("");
  const [turnstileReady, setTurnstileReady] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const turnstileContainer = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetId = useRef<string | null>(null);

  const minDate = useMemo(() => aucklandDate(), []);
  const maxDate = useMemo(() => aucklandDate(365), []);
  const [visibleMonth, setVisibleMonth] = useState(() => monthStart(minDate));
  const calendarDays = useMemo(() => calendarDaysForMonth(visibleMonth), [visibleMonth]);
  const previousMonthAvailable = visibleMonth.slice(0, 7) > minDate.slice(0, 7);
  const nextMonthAvailable = visibleMonth.slice(0, 7) < maxDate.slice(0, 7);
  const selectionSummary = useMemo(() => getServiceSelectionSummary(Object.entries(serviceSelections).map(([id, priceCents]) => ({ id, priceCents }))), [serviceSelections]);
  const serviceKey = selectionSummary?.serviceIds.join(",") ?? "";
  const money = selectionSummary && location ? calculateBookingMoney(selectionSummary.servicePriceCents, location) : null;

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/security/config", { signal: controller.signal })
      .then(response => response.ok ? response.json() : null)
      .then((result: { turnstileSiteKey?: string } | null) => setTurnstileSiteKey(result?.turnstileSiteKey ?? ""))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      const queryService = params.get("service");
      const matched = SERVICES.find(option => option.id === queryService || option.name === queryService);
      if (matched) {
        setServiceSelections({ [matched.id]: matched.priceOptionsCents[0] });
      }
      if (params.get("location") === "mobile") setLocation("mobile");
      if (params.get("payment") === "cancelled") setSubmitNotice("Payment was cancelled. Your time has not been confirmed; you can review the booking and try again.");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!appointmentDate || !serviceKey) return;
    const controller = new AbortController();
    fetch(`/api/availability?date=${encodeURIComponent(appointmentDate)}&services=${encodeURIComponent(serviceKey)}`, { signal: controller.signal })
      .then(async response => {
        const result = await response.json() as { starts?: number[]; calendarReady?: boolean; error?: string };
        if (!response.ok) throw new Error(result.error || "Availability could not be loaded.");
        setAvailableStarts(result.starts ?? []);
        setCalendarReady(Boolean(result.calendarReady));
        setStartMinutes(current => current !== null && result.starts?.includes(current) ? current : null);
      })
      .catch(error => { if (error instanceof Error && error.name !== "AbortError") setCalendarError(error instanceof Error ? error.message : "Availability could not be loaded."); })
      .finally(() => { if (!controller.signal.aborted) setLoadingSlots(false); });
    return () => controller.abort();
  }, [appointmentDate, serviceKey]);

  useEffect(() => {
    if (!turnstileSiteKey || !turnstileReady || !turnstileContainer.current || !window.turnstile || turnstileWidgetId.current) return;
    const widgetId = window.turnstile.render(turnstileContainer.current, {
      sitekey: turnstileSiteKey,
      action: "booking",
      theme: "dark",
      callback: token => setTurnstileToken(token),
      "expired-callback": () => setTurnstileToken(""),
      "error-callback": () => setTurnstileToken(""),
    });
    turnstileWidgetId.current = widgetId;
    return () => {
      window.turnstile?.remove(widgetId);
      turnstileWidgetId.current = null;
    };
  }, [turnstileReady, turnstileSiteKey]);

  const canContinue = step === 1
    ? Boolean(selectionSummary)
    : step === 2
      ? Boolean(location && (location !== "mobile" || suburb.trim()))
      : step === 3
        ? Boolean(appointmentDate && startMinutes !== null)
        : step === 4
          ? Boolean(details.name.trim() && details.mobile.trim().length >= 7 && /^\S+@\S+\.\S+$/.test(details.email))
          : Boolean(accepted && (!turnstileSiteKey || turnstileToken));

  const summary = (
    <div className="summary-lines">
      <div><span>Services</span><b>{selectionSummary?.serviceName ?? "Not selected"}</b></div>
      <div><span>Location</span><b>{location === "studio" ? "114 Cargill Street, Papakura" : location === "mobile" ? `Mobile — ${suburb || "Auckland"}` : "Not selected"}</b></div>
      <div><span>Date & time</span><b>{appointmentDate && startMinutes !== null ? `${readableDate(appointmentDate)}, ${formatTime(startMinutes)}` : "Not selected"}</b></div>
      <div><span>Estimated duration</span><b>{selectionSummary ? formatDuration(selectionSummary.durationMinutes) : "Not selected"}</b></div>
      <div><span>Service price</span><b>{selectionSummary ? formatMoney(selectionSummary.servicePriceCents) : "Not selected"}</b></div>
      {location === "mobile" && <div><span>Travel fee</span><b>{formatMoney(10_000)} minimum</b></div>}
      <div><span>20% service deposit</span><b>{money ? formatMoney(money.baseDepositCents) : "Not selected"}</b></div>
      <div><span>Online processing included</span><b>{money ? formatMoney(money.processingFeeCents) : "Not selected"}</b></div>
      <div><span>Pay securely today</span><b>{money ? formatMoney(money.depositCents) : "Not selected"}</b></div>
      <div><span>Due at appointment</span><b>{money ? formatMoney(money.balanceCents) : "Not selected"}</b></div>
      <div className="total"><span>Total</span><b>{money ? `${formatMoney(money.totalCents)}${location === "mobile" ? " minimum" : ""}` : "Not selected"}</b></div>
    </div>
  );

  const next = () => {
    if (canContinue && step < 5) {
      setStep(value => value + 1);
      setCheckoutNotice("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  const back = () => {
    if (step > 1) {
      setStep(value => value - 1);
      setSubmitNotice("");
      setCheckoutNotice("");
    }
  };

  function selectAppointmentDate(date: string) {
    setAppointmentDate(date);
    setStartMinutes(null);
    setAvailableStarts([]);
    setCalendarError("");
    setLoadingSlots(true);
  }

  function resetSelectedTime() {
    setAppointmentDate("");
    setStartMinutes(null);
    setAvailableStarts([]);
    setCalendarReady(null);
    setCalendarError("");
    setLoadingSlots(false);
  }

  function toggleService(serviceId: string) {
    const service = SERVICES.find(option => option.id === serviceId);
    if (!service) return;
    const nextSelections = { ...serviceSelections };
    if (nextSelections[serviceId] !== undefined) {
      delete nextSelections[serviceId];
    } else {
      if (serviceId === "combo") comboComponentIds.forEach(id => delete nextSelections[id]);
      if (comboComponentIds.has(serviceId)) delete nextSelections.combo;
      nextSelections[serviceId] = service.priceOptionsCents[0];
    }
    setServiceSelections(nextSelections);
    resetSelectedTime();
  }

  async function startCheckout() {
    if (!canContinue || !selectionSummary || !location || startMinutes === null) return;
    if (calendarReady === false) {
      setCheckoutNotice("This is the unpublished local preview, so no payment was attempted. Once the Stripe account and booking database are connected, this button will open Stripe’s secure checkout for the exact deposit shown above.");
      return;
    }
    setSubmitting(true);
    setSubmitNotice("");
    setCheckoutNotice("");
    const form = new FormData();
    form.set("serviceSelections", JSON.stringify(Object.entries(serviceSelections).map(([id, priceCents]) => ({ id, priceCents }))));
    form.set("location", location);
    form.set("suburb", suburb);
    form.set("appointmentDate", appointmentDate);
    form.set("startMinutes", String(startMinutes));
    form.set("name", details.name);
    form.set("mobile", details.mobile);
    form.set("email", details.email);
    form.set("notes", details.notes);
    form.set("marketing", marketing ? "yes" : "no");
    form.set("turnstileToken", turnstileToken);
    if (referenceImage) form.set("referenceImage", referenceImage);
    try {
      const response = await fetch("/api/bookings", { method: "POST", body: form });
      const result = await response.json() as { checkoutUrl?: string; error?: string; setupRequired?: boolean };
      if (result.setupRequired) {
        setCheckoutNotice(result.error || "Stripe must be connected before a payment can be taken.");
        return;
      }
      if (!response.ok || !result.checkoutUrl) throw new Error(result.error || "Secure checkout could not be opened.");
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      setCheckoutNotice(error instanceof Error ? error.message : "Secure checkout could not be opened.");
    } finally {
      setSubmitting(false);
      if (turnstileWidgetId.current) window.turnstile?.reset(turnstileWidgetId.current);
      setTurnstileToken("");
    }
  }

  return (
    <main className="inner-page">
      <header className="inner-header"><Link href="/"><BrandMark compact /></Link><a href="/manage">Manage booking ↗</a></header>
      <div className="booking-wrap">
        <div className="booking-title"><div><p className="eyebrow"><span /> Secure your time</p><h1>Book your<br /><em>appointment.</em></h1></div><p>Choose your service and reserve a real Auckland-time appointment at 114 Cargill Street, Papakura, or anywhere across Auckland.</p></div>
        {submitNotice && <div className="info-box booking-alert" role="status">{submitNotice}</div>}
        <ol className="progress" aria-label="Booking progress">
          {stepNames.map((name, index) => <li key={name} className={step === index + 1 ? "active" : step > index + 1 ? "complete" : ""} aria-current={step === index + 1 ? "step" : undefined}>{name}</li>)}
        </ol>
        <details className="mobile-summary"><summary>Booking summary <span>+</span></summary>{summary}</details>
        <div className="booking-layout">
          <section className="booking-stage" aria-live="polite">
            {step === 1 && <>
              <div className="stage-head"><div><span>STEP 01 / 06</span><h2>Choose services</h2><p>Select one or more compatible services. The calendar reserves the full combined duration.</p></div></div>
              <div className="choice-grid">{SERVICES.map(service => <label className={`choice-card choice-card--service ${serviceSelections[service.id] !== undefined ? "selected" : ""}`} key={service.id}><input type="checkbox" name="services" value={service.id} checked={serviceSelections[service.id] !== undefined} onChange={() => toggleService(service.id)} /><i className="select-indicator" /><strong>{service.name}</strong><span>{service.description}</span><small>{service.priceOptionsCents.map(formatMoney).join(" / ")} • {formatDuration(service.durationMinutes)}</small></label>)}</div>
              <div className="service-selection-note" role="status"><b>{selectionSummary ? `${selectionSummary.services.length} selected • ${formatDuration(selectionSummary.durationMinutes)} • ${formatMoney(selectionSummary.servicePriceCents)}` : "Select at least one service"}</b><span>The combo replaces individual Haircut, Beard and Wax selections. Other add-ons can be combined freely.</span></div>
              {serviceSelections.beard !== undefined && beardService && <fieldset className="price-choice"><legend>Choose the beard service price</legend>{beardService.priceOptionsCents.map(price => <label key={price} className={serviceSelections.beard === price ? "selected" : ""}><input type="radio" name="beard-price" checked={serviceSelections.beard === price} onChange={() => setServiceSelections(current => ({ ...current, beard: price }))} />{formatMoney(price)}</label>)}</fieldset>}
            </>}
            {step === 2 && <>
              <div className="stage-head"><div><span>STEP 02 / 06</span><h2>Choose location</h2><p>Visit the Papakura studio or request mobile grooming anywhere in Auckland.</p></div></div>
              <div className="choice-grid">
                <label className={`choice-card ${location === "studio" ? "selected" : ""}`}><input type="radio" name="location" checked={location === "studio"} onChange={() => setLocation("studio")} /><i className="select-indicator" /><strong>Papakura studio</strong><span>114 Cargill Street, Papakura.</span><small>APPOINTMENT ONLY</small></label>
                <label className={`choice-card ${location === "mobile" ? "selected" : ""}`}><input type="radio" name="location" checked={location === "mobile"} onChange={() => setLocation("mobile")} /><i className="select-indicator" /><strong>Mobile service</strong><span>Home, accommodation, workplace or approved event location across Auckland.</span><small>$100 MINIMUM TRAVEL FEE • NO MINIMUM BOOKING VALUE</small></label>
              </div>
              {location === "mobile" && <div className="form-grid" style={{ marginTop: 24 }}><div className="field field--full"><label htmlFor="suburb">Auckland suburb</label><input id="suburb" value={suburb} onChange={event => setSuburb(event.target.value)} placeholder="Enter your suburb" autoComplete="address-level2" maxLength={120} /><small>The $100 minimum travel fee is included in the total shown. Any special parking or access arrangement is agreed before payment.</small></div></div>}
            </>}
            {step === 3 && <>
              <div className="stage-head"><div><span>STEP 03 / 06</span><h2>Select a time</h2><p>Working hours are 9:00am–8:00pm. Every time below is shown in Auckland/New Zealand time.</p></div></div>
              <div className="booking-calendar" aria-label="Choose an appointment date" aria-describedby="booking-calendar-note">
                <div className="booking-calendar-head">
                  <button type="button" aria-label="Show previous month" disabled={!previousMonthAvailable} onClick={() => setVisibleMonth(current => shiftMonth(current, -1))}>Previous</button>
                  <div><span>Appointment date</span><strong aria-live="polite">{monthLabel(visibleMonth)}</strong></div>
                  <button type="button" aria-label="Show next month" disabled={!nextMonthAvailable} onClick={() => setVisibleMonth(current => shiftMonth(current, 1))}>Next</button>
                </div>
                <div className="calendar-weekdays" aria-hidden="true">{weekdayLabels.map(day => <span key={day}>{day}</span>)}</div>
                <div className="calendar-days">
                  {calendarDays.map(date => {
                    const disabled = date.iso < minDate || date.iso > maxDate;
                    const today = date.iso === minDate;
                    const selected = date.iso === appointmentDate;
                    const className = [!date.currentMonth ? "outside" : "", today ? "today" : "", selected ? "selected" : ""].filter(Boolean).join(" ");
                    return <button type="button" key={date.iso} className={className} disabled={disabled} aria-label={`${today ? "Today, " : ""}${readableDate(date.iso)}`} aria-pressed={selected} aria-current={today ? "date" : undefined} onClick={() => selectAppointmentDate(date.iso)}><span>{date.day}</span>{today && <small>Today</small>}</button>;
                  })}
                </div>
                <p className="booking-calendar-note" id="booking-calendar-note">Choose from today up to 12 months ahead. Dates use Auckland time.</p>
              </div>
              {appointmentDate && <div className="calendar-panel"><div className="calendar-heading"><div><strong>{readableDate(appointmentDate)}</strong><span>{calendarReady === false ? "Preview availability" : "Live availability"}</span></div><small>9:00am–8:00pm • Auckland time</small></div>{loadingSlots ? <p className="slot-status">Checking available times…</p> : calendarError ? <p className="slot-status slot-status--error">{calendarError}</p> : availableStarts.length ? <div className="time-grid">{availableStarts.map(start => <button className={startMinutes === start ? "selected" : ""} type="button" key={start} onClick={() => setStartMinutes(start)}>{formatTime(start)}</button>)}</div> : <p className="slot-status">No times are available on this date. Please choose another day.</p>}{calendarReady === false && <p className="calendar-preview-note">This local preview shows the full calendar layout. Booked-time blocking activates when the database migration is applied.</p>}</div>}
            </>}
            {step === 4 && <>
              <div className="stage-head"><div><span>STEP 04 / 06</span><h2>Your details</h2><p>Guest booking only. The confirmation and secure management link will be emailed to you.</p></div></div>
              <div className="form-grid">
                <div className="field"><label htmlFor="full-name">Full name</label><input id="full-name" autoComplete="name" value={details.name} onChange={event => setDetails({ ...details, name: event.target.value })} maxLength={100} required /></div>
                <div className="field"><label htmlFor="mobile">Mobile number</label><input id="mobile" type="tel" autoComplete="tel" value={details.mobile} onChange={event => setDetails({ ...details, mobile: event.target.value })} maxLength={30} required /></div>
                <div className="field field--full"><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" value={details.email} onChange={event => setDetails({ ...details, email: event.target.value })} maxLength={254} required /></div>
                <div className="field field--full"><label htmlFor="notes">Service notes <span>(optional)</span></label><textarea id="notes" value={details.notes} onChange={event => setDetails({ ...details, notes: event.target.value })} placeholder="Style, finish or access notes" maxLength={2000} /></div>
                <div className="field field--full"><label htmlFor="reference-image">Reference image <span>(optional)</span></label><input id="reference-image" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={event => setReferenceImage(event.target.files?.[0] ?? null)} /><small>JPG, PNG, WebP or HEIC up to 5 MB. Stored privately and removed 90 days after the appointment.</small></div>
              </div>
              <label className="check-row"><input type="checkbox" checked={marketing} onChange={event => setMarketing(event.target.checked)} /> <span>Send me occasional Fade Plug updates. Optional and unchecked by default.</span></label>
            </>}
            {step === 5 && <>
              <div className="stage-head"><div><span>STEP 05 / 06</span><h2>Review & pay</h2><p>Pay 20% now to reserve the appointment. The remaining balance is paid at the appointment.</p></div></div>
              <div className="payment-options"><div className="payment-option payment-option--selected"><span>Due securely now</span><b>{money ? formatMoney(money.depositCents) : "—"}</b><small>{money ? `${formatMoney(money.baseDepositCents)} deposit + ${formatMoney(money.processingFeeCents)} processing` : "20% deposit + processing"}</small></div><div className="payment-option"><span>Due at appointment</span><b>{money ? formatMoney(money.balanceCents) : "—"}</b><small>No online-processing fee included</small></div></div>
              <div className="payment-methods" aria-label="Payment methods"><span>Visa</span><span>Mastercard</span><span>Amex</span><span>Apple Pay</span><span>Google Pay</span><span>Stripe secure checkout</span></div>
              <div className="info-box"><b>Simple cancellation terms:</b> cancel at least 24 hours beforehand for a refund of everything paid online, or move the booking once free. Inside 24 hours and for no-shows, the service deposit is retained and the processing cost has already been incurred. If Fade Plug cancels, choose a full refund or transfer.</div>
              <label className="check-row"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} /> <span>I accept the <a href="/cancellation-policy">cancellation policy</a>, <a href="/terms">booking terms</a> and <a href="/privacy">privacy notice</a>.</span></label>
              <div className="integration-ready"><b>Secure checkout</b><span>The exact Stripe processing cost is already included above. Card details never pass through or remain on this website.</span></div>
              {turnstileSiteKey && <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" onLoad={() => setTurnstileReady(true)} /><div className="turnstile-wrap"><div ref={turnstileContainer} /><p>Protected by Cloudflare Turnstile.</p></div></>}
              {checkoutNotice && <div className="checkout-preview" id="checkout-preview" role="status"><b>Preview mode — no payment taken</b><p>{checkoutNotice}</p><span>Your service, time and details remain on this page so you can keep reviewing the design.</span></div>}
            </>}
            <div className="stage-actions"><button className="button button--ghost" type="button" onClick={back} disabled={step === 1 || submitting}>Back</button>{step < 5 ? <button className="button" type="button" onClick={next} disabled={!canContinue}>Continue <span>→</span></button> : <button className="button" type="button" onClick={startCheckout} disabled={!canContinue || submitting} aria-expanded={Boolean(checkoutNotice)} aria-controls="checkout-preview">{submitting ? "Opening secure checkout…" : calendarReady === false ? "Preview secure checkout" : "Pay deposit & processing"} <span>↗</span></button>}</div>
          </section>
          <aside className="booking-summary"><p className="eyebrow"><span /> Your booking</p><h2>Summary</h2>{summary}<p className="summary-note">Times are held for 30 minutes while secure payment is completed. Confirmation is sent by email after the deposit succeeds.</p></aside>
        </div>
      </div>
    </main>
  );
}
