"use client";

import { useEffect, useMemo, useState } from "react";
import BrandMark from "../../components/brand-mark";

const serviceOptions = [
  ["Signature Haircut", "A considered cut shaped around your requested finish."],
  ["Zero / Skin Fade", "Precision fade work with clean transitions."],
  ["Beard Sculpting", "Shape, balance and sharp definition."],
  ["Haircut + Beard", "A coordinated complete-grooming service."],
  ["Hair Design", "Custom detail discussed before the appointment."],
  ["Mobile Grooming", "Premium grooming at an approved location."],
];

const stepNames = ["Service", "Location", "Date & time", "Your details", "Review & pay", "Confirmed"];

export default function BookingClient() {
  const [step, setStep] = useState(1);
  const [service, setService] = useState("");
  const [location, setLocation] = useState<"studio" | "mobile" | "">("");
  const [suburb, setSuburb] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredWindow, setPreferredWindow] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [details, setDetails] = useState({ name: "", mobile: "", email: "", notes: "" });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryService = params.get("service");
    if (queryService && serviceOptions.some(([name]) => name === queryService)) setService(queryService);
    if (params.get("location") === "mobile") setLocation("mobile");
  }, []);

  const minDate = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const canContinue = step === 1 ? Boolean(service) : step === 2 ? Boolean(location && (location !== "mobile" || suburb.trim())) : step === 3 ? Boolean(preferredDate && preferredWindow) : step === 4 ? Boolean(details.name.trim() && details.mobile.trim() && details.email.includes("@")) : accepted;

  const summary = (
    <div className="summary-lines">
      <div><span>Service</span><b>{service || "Not selected"}</b></div>
      <div><span>Location</span><b>{location === "studio" ? "Papakura studio" : location === "mobile" ? `Mobile${suburb ? ` — ${suburb}` : ""}` : "Not selected"}</b></div>
      <div><span>Date & time</span><b>{preferredDate ? `${preferredDate} / ${preferredWindow}` : "Not selected"}</b></div>
      <div><span>Duration</span><b>[TO CONFIRM]</b></div>
      <div><span>Service price</span><b>[TO CONFIRM]</b></div>
      {location === "mobile" && <div><span>Travel fee</span><b>[TO CONFIRM]</b></div>}
      <div><span>Deposit</span><b>[TO CONFIRM]</b></div>
      <div className="total"><span>Total</span><b>[TO CONFIRM]</b></div>
    </div>
  );

  const next = () => { if (canContinue && step < 5) { setStep(value => value + 1); window.scrollTo({ top: 0, behavior: "smooth" }); } };
  const back = () => { if (step > 1) setStep(value => value - 1); };

  return (
    <main className="inner-page">
      <header className="inner-header"><a href="/"><BrandMark compact /></a><a href="/manage">Manage booking ↗</a></header>
      <div className="booking-wrap">
        <div className="booking-title"><div><p className="eyebrow"><span /> Secure your time</p><h1>Book your<br /><em>appointment.</em></h1></div><p>This people-free booking prototype is ready for the confirmed service menu, live availability and secure payment provider.</p></div>
        <ol className="progress" aria-label="Booking progress">
          {stepNames.map((name, index) => <li key={name} className={step === index + 1 ? "active" : step > index + 1 ? "complete" : ""} aria-current={step === index + 1 ? "step" : undefined}>{name}</li>)}
        </ol>
        <details className="mobile-summary"><summary>Booking summary <span>+</span></summary>{summary}</details>
        <div className="booking-layout">
          <section className="booking-stage" aria-live="polite">
            {step === 1 && <>
              <div className="stage-head"><div><span>STEP 01 / 06</span><h2>Choose a service</h2><p>Final durations and prices will appear beside each service after the menu is approved.</p></div></div>
              <div className="choice-grid">{serviceOptions.map(([name, description]) => <label className={`choice-card ${service === name ? "selected" : ""}`} key={name}><input type="radio" name="service" value={name} checked={service === name} onChange={() => setService(name)} /><i className="select-indicator" /><strong>{name}</strong><span>{description}</span><small>[DURATION] • [PRICE]</small></label>)}</div>
            </>}
            {step === 2 && <>
              <div className="stage-head"><div><span>STEP 02 / 06</span><h2>Choose location</h2><p>Select the Papakura studio or request premium mobile grooming.</p></div></div>
              <div className="choice-grid">
                <label className={`choice-card ${location === "studio" ? "selected" : ""}`}><input type="radio" name="location" checked={location === "studio"} onChange={() => setLocation("studio")} /><i className="select-indicator" /><strong>Papakura studio</strong><span>Exact directions are shared privately after confirmation.</span><small>APPOINTMENT ONLY</small></label>
                <label className={`choice-card ${location === "mobile" ? "selected" : ""}`}><input type="radio" name="location" checked={location === "mobile"} onChange={() => setLocation("mobile")} /><i className="select-indicator" /><strong>Mobile service</strong><span>Home, accommodation, studio, workplace or approved event location.</span><small>ZONE CHECK REQUIRED</small></label>
              </div>
              {location === "mobile" && <div className="form-grid" style={{ marginTop: 24 }}><div className="field field--full"><label htmlFor="suburb">Auckland suburb</label><input id="suburb" value={suburb} onChange={event => setSuburb(event.target.value)} placeholder="Enter suburb first" autoComplete="address-level2" /><small>The supported-area list and travel fee are pending confirmation. Your exact address is collected only after the suburb is approved.</small></div></div>}
            </>}
            {step === 3 && <>
              <div className="stage-head"><div><span>STEP 03 / 06</span><h2>Request a time</h2><p>No fake availability: this prototype collects a preference until a live Auckland-time calendar is connected.</p></div></div>
              <div className="info-box"><strong>Live calendar required.</strong> Available dates and 44px time buttons will replace this preference form when the booking provider is connected.</div>
              <div className="form-grid"><div className="field"><label htmlFor="preferred-date">Preferred date</label><input id="preferred-date" type="date" min={minDate} value={preferredDate} onChange={event => setPreferredDate(event.target.value)} /></div><div className="field"><label htmlFor="preferred-window">Preferred window</label><select id="preferred-window" value={preferredWindow} onChange={event => setPreferredWindow(event.target.value)}><option value="">Select a preference</option><option>Morning preference</option><option>Afternoon preference</option><option>Evening preference</option></select></div></div>
            </>}
            {step === 4 && <>
              <div className="stage-head"><div><span>STEP 04 / 06</span><h2>Your details</h2><p>Guest booking only. No account is required.</p></div></div>
              <div className="form-grid">
                <div className="field"><label htmlFor="full-name">Full name</label><input id="full-name" autoComplete="name" value={details.name} onChange={event => setDetails({ ...details, name: event.target.value })} required /></div>
                <div className="field"><label htmlFor="mobile">Mobile number</label><input id="mobile" type="tel" autoComplete="tel" value={details.mobile} onChange={event => setDetails({ ...details, mobile: event.target.value })} required /></div>
                <div className="field field--full"><label htmlFor="email">Email</label><input id="email" type="email" autoComplete="email" value={details.email} onChange={event => setDetails({ ...details, email: event.target.value })} required /></div>
                <div className="field field--full"><label htmlFor="notes">Haircut notes <span>(optional)</span></label><textarea id="notes" value={details.notes} onChange={event => setDetails({ ...details, notes: event.target.value })} placeholder="Style, finish or access notes" /></div>
                <div className="field field--full"><label htmlFor="reference">Reference image <span>(optional)</span></label><input id="reference" type="file" accept="image/*" disabled /><small>Enabled when secure private storage is connected. It will never be displayed publicly.</small></div>
              </div>
              <label className="check-row"><input type="checkbox" /> <span>Send me occasional Fade Plug updates. Optional and unchecked by default.</span></label>
            </>}
            {step === 5 && <>
              <div className="stage-head"><div><span>STEP 05 / 06</span><h2>Review & pay</h2><p>Your complete cost and policy deadline must be visible before a live payment can be taken.</p></div></div>
              <div className="payment-options"><div className="payment-option"><span>Deposit option</span><b>[DEPOSIT TO CONFIRM]</b></div><div className="payment-option"><span>Full payment</span><b>[TOTAL TO CONFIRM]</b></div></div>
              <div className="payment-methods" aria-label="Planned payment methods"><span>Card</span><span>Apple Pay</span><span>Google Pay</span><span>Secure provider</span></div>
              <div className="info-box"><b>Policy facts required:</b> cancellation deadline, refund conditions, late-arrival policy and no-show policy must be approved before launch.</div>
              <label className="check-row"><input type="checkbox" checked={accepted} onChange={event => setAccepted(event.target.checked)} /> <span>I accept the <a href="/cancellation-policy">cancellation policy</a>, <a href="/terms">terms</a> and <a href="/privacy">privacy notice</a>.</span></label>
              <div className="integration-lock"><b>Checkout is intentionally locked.</b> Connect the confirmed service menu, live calendar, policy terms and secure payment account to begin accepting paid bookings.</div>
            </>}
            <div className="stage-actions"><button className="button button--ghost" type="button" onClick={back} disabled={step === 1}>Back</button>{step < 5 ? <button className="button" type="button" onClick={next} disabled={!canContinue}>Continue <span>→</span></button> : <button className="button" type="button" disabled>Secure payment unavailable</button>}</div>
          </section>
          <aside className="booking-summary"><p className="eyebrow"><span /> Your booking</p><h2>Summary</h2>{summary}<p className="summary-note">Your chosen date is a preference, not confirmed availability, until the live booking provider is connected.</p></aside>
        </div>
      </div>
    </main>
  );
}
