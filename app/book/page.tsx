import type { Metadata } from "next";
import BookingClient from "./booking-client";

export const metadata: Metadata = {
  title: "Book an Appointment",
  description: "Choose a Fade Plug service, studio or mobile grooming, and review your booking before secure payment.",
  alternates: { canonical: "/book" },
};

export default function BookPage() {
  return <BookingClient />;
}
