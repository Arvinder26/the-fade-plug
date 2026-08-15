import type { Metadata } from "next";
import PolicyPage from "../../components/policy-page";

export const metadata: Metadata = { title: "Booking Terms", description: "Fade Plug appointment and payment terms.", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return <PolicyPage eyebrow="Booking terms" title="The agreement" intro="These terms explain what is reserved, what you pay and how mobile appointments work before you confirm a booking." sections={[
    { heading: "Appointment service", body: "Fade Plug operates by appointment from 114 Cargill Street, Papakura, and offers mobile grooming across Auckland. Compatible services may be combined into one continuous appointment, with the full combined duration reserved. The Haircut + Beard + Wax combo cannot also be booked with its individual component services. Durations are practical estimates and may vary slightly according to the requested finish, hair and service conditions." },
    { heading: "Deposit and remaining payment", body: "A 20% service deposit is paid through Stripe to reserve the selected time. The exact online card-processing cost is included in the checkout total and shown separately before payment. The remaining 80% of the service and travel price is due at the appointment. The booking is confirmed only after payment succeeds and the confirmation email is issued. Raw card details are handled by Stripe and are not stored by this website." },
    { heading: "Mobile appointments", body: "Mobile service is available across Auckland with a $100 minimum travel fee and no minimum booking value. The booking summary includes the minimum travel fee. Suitable access, safe working space, power and any unusual parking arrangement must be agreed before payment; no undisclosed extra fee will be added." },
    { heading: "Service suitability", body: "Reference images are guidance rather than a guarantee of an identical result. Puneet may recommend an adjusted finish where hair condition, timing or safety requires it. Any material service or price change is agreed before work begins." },
    { heading: "Changes and cancellations", body: "The cancellation policy forms part of these terms. It provides a refund of the full online payment or one free transfer at least 24 hours beforehand. Inside 24 hours and for no-shows, the service deposit is retained and the online-processing cost has already been incurred." },
    { heading: "Contact", body: "Fade Plug is located at 114 Cargill Street, Papakura. Call 022 302 2464 or email bhardwajpuneet0786@gmail.com." },
  ]} />;
}
