import type { Metadata } from "next";
import PolicyPage from "../../components/policy-page";

export const metadata: Metadata = { title: "Cancellation Policy", description: "Fade Plug cancellation and rescheduling policy.", alternates: { canonical: "/cancellation-policy" } };

export default function CancellationPolicyPage() {
  return <PolicyPage eyebrow="Cancellation & rescheduling" title="Your options" intro="The final approved policy will be shown at checkout, in every confirmation and beside the exact cancellation deadline in the private manage-booking page." sections={[
    { heading: "Cancellation deadline", body: "[CANCELLATION WINDOW TO CONFIRM]. Each booking will show its exact deadline in Auckland/New Zealand time, so the outcome is never hidden in fine print." },
    { heading: "Refunds and credits", body: "[REFUND AND CREDIT CONDITIONS TO CONFIRM]. The checkout summary will state whether a deposit or payment is refundable, transferable or eligible for account credit." },
    { heading: "Rescheduling", body: "[RESCHEDULING CONDITIONS TO CONFIRM]. Eligible bookings can be moved through the secure link in the confirmation email or SMS." },
    { heading: "Late arrival and no-shows", body: "[LATE-ARRIVAL POLICY TO CONFIRM]. [NO-SHOW POLICY TO CONFIRM]. The language will remain calm, specific and visible before payment." },
    { heading: "Need help?", body: "If the self-service deadline has passed, contact Fade Plug using [PHONE] or [EMAIL]. These details will be added after confirmation." },
  ]} />;
}
