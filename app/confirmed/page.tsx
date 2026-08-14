import type { Metadata } from "next";
import InnerHeader from "../../components/inner-header";

export const metadata: Metadata = { title: "Booking Confirmation Preview", robots: { index: false, follow: false } };

export default function ConfirmedPage() {
  return <main className="inner-page"><InnerHeader /><section className="confirmation-card"><div className="confirmation-icon">✓</div><p className="eyebrow" style={{ marginTop: 25 }}><span /> Screen preview</p><h1>Booking<br />confirmed.</h1><p>This screen is a layout preview only. It is not proof of an appointment or payment.</p><div className="summary-lines"><div><span>Booking reference</span><b>[BOOKING REFERENCE]</b></div><div><span>Service</span><b>[SERVICE]</b></div><div><span>Date & time</span><b>[AUCKLAND DATE & TIME]</b></div><div><span>Barber</span><b>Puneet Bhardwaj</b></div><div><span>Location instructions</span><b>[PRIVATE INSTRUCTIONS]</b></div><div><span>Amount paid</span><b>[AMOUNT]</b></div><div><span>Remaining balance</span><b>[BALANCE]</b></div><div><span>Cancellation deadline</span><b>[EXACT DEADLINE]</b></div></div><div className="stage-actions"><button className="button" type="button" disabled>Add to calendar</button><a className="button button--ghost" href="/manage">Manage booking</a></div></section></main>;
}
