import type { Metadata } from "next";
import PolicyPage from "../../components/policy-page";

export const metadata: Metadata = { title: "Privacy Notice", description: "How Fade Plug handles booking information.", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return <PolicyPage eyebrow="Privacy notice" title="Your privacy" intro="Fade Plug collects only the information reasonably needed to reserve, provide and support your appointment." sections={[
    { heading: "Information collected", body: "A booking may include your name, phone number, email, selected service, appointment time, Auckland suburb for mobile service, optional notes, an optional reference image, booking activity and payment status. Fade Plug does not receive or store your full card number." },
    { heading: "How it is used", body: "The information is used to check availability, reserve and deliver the service, process the deposit, send transactional emails, support rescheduling or cancellation, prevent booking abuse and meet accounting obligations. Marketing consent is separate, optional and unchecked by default." },
    { heading: "Providers and sharing", body: "Cloudflare hosts the website, booking database and private image storage and provides the Turnstile abuse-prevention check; Stripe processes card payments; and Resend sends confirmation and booking-management emails. Information is shared with these providers only for those services, or where disclosure is required by law. It is not sold." },
    { heading: "Retention periods", body: "Optional reference images are deleted 90 days after the appointment. Operational booking details and contact messages are kept for up to 24 months after the appointment, then deleted or anonymised unless still needed for a dispute or legal purpose. Short-lived, hashed request identifiers used for rate limiting are automatically removed after their security window. Transaction and accounting records required for New Zealand tax obligations are retained for at least seven tax years. Optional marketing details are kept until you unsubscribe or withdraw consent." },
    { heading: "Security and your choices", body: "Booking details and changes require a private management link. Entering a matching reference and email only sends that link to the booking email; it does not reveal the booking on screen. Images remain private and are never displayed publicly. To request access, correction or deletion, or to withdraw marketing consent, email bhardwajpuneet0786@gmail.com. Some transaction information may need to remain where the law requires it." },
  ]} />;
}
