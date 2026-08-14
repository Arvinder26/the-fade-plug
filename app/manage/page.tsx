import type { Metadata } from "next";
import ManageClient from "./manage-client";

export const metadata: Metadata = { title: "Manage Booking", description: "Securely view, reschedule or cancel a Fade Plug appointment.", robots: { index: false, follow: false } };

export default function ManagePage() { return <ManageClient />; }
