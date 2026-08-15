import type { Metadata } from "next";
import ConfirmationClient from "./confirmation-client";

export const metadata: Metadata = { title: "Booking Confirmation", robots: { index: false, follow: false } };

export default function ConfirmedPage() {
  return <ConfirmationClient />;
}
