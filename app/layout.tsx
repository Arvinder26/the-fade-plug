import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const suppliedHost = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const host = /^[a-z0-9.-]+(?::\d{1,5})?$/i.test(suppliedHost) ? suppliedHost : "localhost:3000";
  const suppliedProtocol = requestHeaders.get("x-forwarded-proto");
  const protocol = suppliedProtocol === "http" || suppliedProtocol === "https" ? suppliedProtocol : host.includes("localhost") ? "http" : "https";
  const metadataBase = new URL(`${protocol}://${host}`);

  return {
    metadataBase,
    title: {
      default: "Fade Plug® | Premium Barber Papakura",
      template: "%s | Fade Plug®",
    },
    description: "Appointment-only premium grooming by Puneet Bhardwaj in Papakura, with mobile barbering across Auckland.",
    keywords: ["premium barber Papakura", "Papakura barber booking", "skin fade Papakura", "mobile barber Auckland", "mobile barber South Auckland", "beard trim Papakura", "appointment barber Auckland", "fade specialist Auckland"],
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      locale: "en_NZ",
      siteName: "Fade Plug®",
      title: "Fade Plug® — Precision Cuts. Premium Presence.",
      description: "Appointment-only grooming in Papakura and mobile service across Auckland.",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "Fade Plug precision grooming tools" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Fade Plug® — Precision Cuts. Premium Presence.",
      description: "Appointment-only premium grooming in Papakura.",
      images: ["/og.png"],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en-NZ"><body>{children}</body></html>;
}
