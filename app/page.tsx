import type { Metadata } from "next";
import HomeClient from "./home-client";

export const metadata: Metadata = {
  title: "Premium Barber Papakura",
  description: "Precision fades, beard work and appointment-only grooming by Puneet Bhardwaj in Papakura, Auckland.",
};

export default function Home() {
  const localBusiness = {
    "@context": "https://schema.org",
    "@type": "BarberShop",
    name: "Fade Plug®",
    founder: { "@type": "Person", name: "Puneet Bhardwaj" },
    description: "Appointment-only premium barbering and mobile grooming.",
    areaServed: [{ "@type": "Place", name: "Papakura" }, { "@type": "City", name: "Auckland" }],
    sameAs: ["https://www.instagram.com/the_fadeplug001/"],
    priceRange: "Price on confirmation",
  };

  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusiness) }} /><HomeClient /></>;
}
