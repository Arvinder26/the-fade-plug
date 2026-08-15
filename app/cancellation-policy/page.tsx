import type { Metadata } from "next";
import PolicyPage from "../../components/policy-page";

export const metadata: Metadata = { title: "Cancellation Policy", description: "Fade Plug cancellation and rescheduling policy.", alternates: { canonical: "/cancellation-policy" } };

export default function CancellationPolicyPage() {
  return <PolicyPage eyebrow="Cancellation & rescheduling" title="Your options" intro="Appointments reserve Puneet’s time exclusively. These terms aim to be fair to clients while covering the genuine impact of late changes." sections={[
    { heading: "24-hour deadline", body: "Cancel at least 24 hours before the appointment and the full amount paid online, including processing, is refunded to the original payment method. You may instead transfer the booking once at no charge. The exact deadline is shown in Auckland/New Zealand time in the confirmation email and manage-booking page." },
    { heading: "Changes inside 24 hours", body: "For a cancellation or requested move less than 24 hours before the appointment, the 20% service deposit is retained for the reserved time and the online-processing cost has already been incurred. A replacement appointment requires a new deposit. No additional cancellation fee is charged." },
    { heading: "Late arrival and no-shows", body: "A 15-minute grace period applies. Late arrival may shorten the service so the next client is not delayed. If the service can no longer reasonably be completed, or the client does not attend, it is treated as a no-show and the deposit is retained." },
    { heading: "If Fade Plug needs to cancel", body: "If Fade Plug cancels or cannot provide the agreed service, choose either a full refund of everything paid online or a transfer to another available time. Your rights under New Zealand consumer law are not limited by this policy." },
    { heading: "Emergencies and help", body: "Genuine emergencies can be reviewed reasonably and case by case. If online management has closed, call 022 302 2464 or email bhardwajpuneet0786@gmail.com as soon as possible." },
  ]} />;
}
