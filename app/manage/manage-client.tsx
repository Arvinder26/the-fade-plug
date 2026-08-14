"use client";

import { useState } from "react";
import InnerHeader from "../../components/inner-header";

export default function ManageClient() {
  const [reference, setReference] = useState("");
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");

  return <main className="inner-page"><InnerHeader /><section className="manage-panel"><p className="eyebrow"><span /> Private self-service</p><h1>Manage your<br />booking.</h1><p>View your appointment, exact cancellation deadline, rescheduling options and any refund or credit outcome through a secure private link.</p><form className="manage-form" onSubmit={event => { event.preventDefault(); setNotice("Secure lookup will activate when the live booking provider is connected. No appointment data has been submitted."); }}><div className="form-grid"><div className="field field--full"><label htmlFor="reference">Booking reference</label><input id="reference" value={reference} onChange={event => setReference(event.target.value)} placeholder="e.g. [BOOKING REFERENCE]" required /></div><div className="field field--full"><label htmlFor="manage-email">Booking email</label><input id="manage-email" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" required /></div></div><button className="button" style={{ marginTop: 24 }} type="submit">Find booking <span>↗</span></button>{notice && <div className="info-box" role="status">{notice}</div>}<p className="secure-note">Your booking will only be shown after the private details are verified. Need help after the self-service deadline? Contact details are pending confirmation.</p></form></section></main>;
}
