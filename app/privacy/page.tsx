import type { Metadata } from "next";
import PolicyPage from "../../components/policy-page";

export const metadata: Metadata = { title: "Privacy Notice", description: "How Fade Plug handles booking information.", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return <PolicyPage eyebrow="Privacy notice" title="Your privacy" intro="The booking experience is designed to collect only the information needed to provide, manage and support an appointment." sections={[
    { heading: "Information collected", body: "A live booking may collect your name, mobile number, email, selected service, appointment preferences, private service address for mobile bookings, optional notes and an optional reference image." },
    { heading: "How it is used", body: "Booking information is used to schedule and deliver the service, process payment, send confirmations and support rescheduling or cancellation. Marketing consent is separate, optional and unchecked by default." },
    { heading: "Payments and storage", body: "Card details will be handled directly by the connected secure payment provider and will not be stored by this website. Final booking and file-storage providers must be named here after integration." },
    { heading: "Sharing and retention", body: "[DATA SHARING AND RETENTION PERIODS TO CONFIRM]. Customer addresses and uploaded references are never displayed publicly." },
    { heading: "Your choices", body: "Instructions for access, correction and deletion requests will be added with the confirmed privacy contact: [EMAIL]." },
  ]} />;
}
