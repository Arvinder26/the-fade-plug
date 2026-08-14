import type { Metadata } from "next";
import PolicyPage from "../../components/policy-page";

export const metadata: Metadata = { title: "Booking Terms", description: "Fade Plug appointment and payment terms.", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return <PolicyPage eyebrow="Booking terms" title="The agreement" intro="These launch-ready placeholders identify every term that still requires business approval before paid bookings are enabled." sections={[
    { heading: "Appointment service", body: "Fade Plug operates by appointment in Papakura and offers mobile service in selected Auckland areas. The final service, duration, location and full price will be shown before payment." },
    { heading: "Deposits and payment", body: "[DEPOSIT REQUIREMENT TO CONFIRM]. [REMAINING BALANCE TIMING TO CONFIRM]. Payments will be processed by a secure provider; Fade Plug will not collect or store raw card details." },
    { heading: "Mobile appointments", body: "[SUPPORTED AREAS], [TRAVEL FEES], [MINIMUM VALUE], parking and access requirements must be confirmed before a mobile booking is accepted." },
    { heading: "Changes and cancellations", body: "The separate cancellation policy forms part of these terms. The exact deadline and financial outcome will be displayed for the individual booking." },
    { heading: "Contact", body: "Business phone, email, legal entity information and NZBN [IF APPLICABLE] will be inserted here after confirmation." },
  ]} />;
}
