"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import BrandMark from "../components/brand-mark";

const services = [
  { name: "Haircut", tag: "Core service", description: "A considered cut shaped around your requested finish and personal style.", price: "$40", onlineTotal: "$40.53", duration: "45 min", code: "01" },
  { name: "Beard Trim / Sculpt", tag: "Beard service", description: "Trim, shape and sharp definition, with your preferred price selected when booking.", price: "$20 / $25", onlineTotal: "$20.42 / $25.44", duration: "30 min", code: "02" },
  { name: "Wax", tag: "Grooming", description: "A clean finishing service for a polished, well-presented result.", price: "$20", onlineTotal: "$20.42", duration: "20 min", code: "03" },
  { name: "Haircut + Beard + Wax", tag: "Complete combo", description: "The complete Fade Plug grooming package in one appointment.", price: "$70", onlineTotal: "$70.69", duration: "1 hr 15 min", code: "04" },
  { name: "Ear Wax", tag: "Add-on", description: "Quick ear waxing available with or without another grooming service.", price: "$5", onlineTotal: "$5.34", duration: "10 min", code: "05" },
  { name: "Nose Wax", tag: "Add-on", description: "Quick nose waxing available with or without another grooming service.", price: "$5", onlineTotal: "$5.34", duration: "10 min", code: "06" },
  { name: "Face Scrub", tag: "Skin care", description: "A refreshing facial scrub to clean and revive the skin.", price: "$30", onlineTotal: "$30.47", duration: "30 min", code: "07" },
  { name: "Hair Colour", tag: "Colour service", description: "Hair colour application for a refreshed, even finish.", price: "$30", onlineTotal: "$30.47", duration: "45 min", code: "08" },
  { name: "Beard Colour", tag: "Colour service", description: "Beard colour application for a fuller, more even appearance.", price: "$20", onlineTotal: "$20.42", duration: "30 min", code: "09" },
];

const portfolioItems = [
  { category: "Fades", title: "Skin Fade Precision", note: "Clean blend / sharp finish", image: "/images/portfolio-skin-fade.jpg", alt: "Fade Plug client with a clean skin fade and sharp temple line", focus: "60% 47%", source: "https://www.instagram.com/the_fadeplug001/reel/DbuOaQrheZ8/" },
  { category: "Beards", title: "Beard Sculpt", note: "Shape / balance / detail", image: "/images/portfolio-beard-sculpt.jpg", alt: "Fade Plug beard sculpt with a textured crop and precise fade", focus: "50% 54%", source: "https://www.instagram.com/the_fadeplug001/reel/Db6m0bSym6u/" },
  { category: "Fades", title: "Signature Haircut", note: "Shape / styling / control", image: "/images/portfolio-signature-fade.jpg", alt: "Fade Plug barber shaping and styling a signature haircut", focus: "50% 45%", source: "https://www.instagram.com/the_fadeplug001/reel/Db4UWqNhMun/" },
  { category: "Fades", title: "Textured Finish", note: "Texture / shape / movement", image: "/images/portfolio-textured-fade.jpg", alt: "Finished textured crop, fade and beard by Fade Plug", focus: "50% 47%", source: "https://www.instagram.com/the_fadeplug001/reel/Db5jKnmhrrV/" },
  { category: "Beards", title: "Sharp Line-Up", note: "Edges / symmetry / form", image: "/images/portfolio-line-up.jpg", alt: "Sharp hair and beard line-up by Fade Plug", focus: "50% 52%", source: "https://www.instagram.com/the_fadeplug001/reel/Db1jJlbBabP/" },
  { category: "Designs", title: "Modern Mullet", note: "Creative shape / custom finish", image: "/images/portfolio-modern-mullet.jpg", alt: "Modern mullet with a clean side fade by Fade Plug", focus: "48% 48%", source: "https://www.instagram.com/the_fadeplug001/reel/DbuOaQrheZ8/" },
];

const filters = ["All", "Fades", "Beards", "Designs"];

const faq = [
  ["Where is Fade Plug located?", "Fade Plug is at 114 Cargill Street, Papakura, Auckland."],
  ["Do you accept walk-ins?", "No. Fade Plug is appointment-only so every client receives reserved time and focused attention."],
  ["Which Auckland areas receive mobile service?", "Mobile grooming is available across Auckland. A $100 minimum travel fee applies and there is no minimum service value."],
  ["Is payment required when booking?", "Yes. A 20% service deposit plus the exact online-processing cost reserves the appointment through Stripe. Both amounts are shown before payment; the remaining 80% is paid at the appointment."],
  ["Can I reschedule?", "Yes. One free transfer is available through your secure manage-booking link when completed at least 24 hours before the appointment."],
  ["What happens if I cancel late?", "Inside 24 hours, the 20% service deposit is retained for the reserved time and the processing cost has already been incurred. Earlier cancellations receive a refund of the full amount paid online."],
  ["What happens if I am late?", "A 15-minute grace period applies. The service may be shortened to protect the next booking; if it can no longer be completed, it is treated as a no-show."],
  ["Can I request a specific style?", "Yes. Add notes when booking and bring a clear reference. Puneet will confirm what is achievable for your hair and appointment type."],
  ["Can I upload a reference photograph?", "Yes. Add an optional image when booking. It is stored privately, never shown publicly and removed 90 days after the appointment."],
  ["Do you offer event or group bookings?", "Event and group enquiries are welcome and are quoted after the location, timing and group size are confirmed."],
  ["What should I prepare for a mobile appointment?", "A clean, well-lit space, suitable power access, parking and clear entry instructions may be required. Final requirements will be confirmed before payment."],
  ["Which payment methods are accepted?", "Stripe secure checkout supports major credit and debit cards, including Visa, Mastercard and American Express, plus Apple Pay and Google Pay when available on your device."],
];

export default function HomeClient() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [filter, setFilter] = useState("All");
  const [selectedWork, setSelectedWork] = useState<(typeof portfolioItems)[number] | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!selectedWork) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedWork(null);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [selectedWork]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <main>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className="announcement">BOOKINGS ONLY <span>•</span> PAPAKURA <span>•</span> MOBILE SERVICE AVAILABLE</div>
      <header className={`site-header ${scrolled ? "site-header--solid" : ""}`}>
        <a href="#top" className="logo-link" onClick={closeMenu}><BrandMark compact /></a>
        <nav className="desktop-nav" aria-label="Primary navigation">
          <a href="#services">Services</a><a href="#work">Portfolio</a><a href="#mobile">Mobile</a><a href="#about">About</a><a href="#faq">FAQ</a>
        </nav>
        <a className="button button--small desktop-book" href="/book">Book now <span>↗</span></a>
        <button className="menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="mobile-menu" onClick={() => setMenuOpen(!menuOpen)}>
          <span className="sr-only">Toggle menu</span><i /><i />
        </button>
      </header>
      <div id="mobile-menu" className={`mobile-menu ${menuOpen ? "is-open" : ""}`} aria-hidden={!menuOpen}>
        <nav aria-label="Mobile navigation">
          {[["Services","#services"],["Portfolio","#work"],["Mobile service","#mobile"],["About","#about"],["FAQ","#faq"]].map(([label,href], i) => <a key={href} href={href} onClick={closeMenu}><span>0{i+1}</span>{label}</a>)}
          <a href="/manage" onClick={closeMenu}><span>06</span>Manage booking</a>
        </nav>
        <a href="/book" className="button" onClick={closeMenu}>Book your cut <span>↗</span></a>
      </div>

      <section className="hero" id="top">
        <div className="hero-grid" id="main-content">
          <div className="hero-copy reveal">
            <p className="eyebrow"><span /> Papakura • Mobile across Auckland</p>
            <h1>Precision cuts.<br /><em>Premium presence.</em></h1>
            <p className="hero-lede">Appointment-only grooming by Puneet Bhardwaj. Precision fades, sharp beard work and premium mobile service across Auckland.</p>
            <div className="hero-actions">
              <a className="button" href="/book">Book your cut <span>↗</span></a>
              <a className="text-link" href="#work">View the work <span>↓</span></a>
            </div>
            <ul className="trust-list" aria-label="Booking benefits">
              <li>Appointment only</li><li>Secure online payment</li><li>Mobile service</li><li>Easy rescheduling</li>
            </ul>
          </div>
          <div className="precision-panel" aria-label="Fade Plug precision brand graphic">
            <div className="panel-index">FP / 001</div>
            <div className="orbit orbit--one" /><div className="orbit orbit--two" /><div className="orbit orbit--three" />
            <div className="hero-monogram"><span>F</span><span>P</span></div>
            <div className="measure measure--top"><b>0.1</b><i /></div>
            <div className="measure measure--side"><b>PRECISION</b><i /></div>
            <div className="availability-card">
              <span className="status-dot" /><div><small>LIVE AVAILABILITY</small><strong>Open daily, 9am–8pm</strong></div><a href="/book" aria-label="Open booking page">↗</a>
            </div>
          </div>
        </div>
        <div className="scroll-cue"><span>SCROLL TO EXPLORE</span><i /></div>
      </section>

      <section className="proof-strip" aria-label="Business highlights">
        <div><span>01</span><b>Barbering since 2020</b></div><div><span>02</span><b>Papakura based</b></div><div><span>03</span><b>Mobile across Auckland</b></div><div><span>04</span><b>Secure booking ready</b></div>
      </section>

      <section className="section services" id="services">
        <div className="section-head">
          <div><p className="eyebrow"><span /> The menu</p><h2>Choose your<br /><em>service.</em></h2></div>
          <p>Clear service pricing, practical time estimates and an exact online-processing amount shown in the booking total before payment.</p>
        </div>
        <div className="service-grid">
          {services.map(service => (
            <a className="service-card" href={`/book?service=${encodeURIComponent(service.name)}`} key={service.name}>
              <div className="service-top"><span>{service.code}</span><small>{service.tag}</small></div>
              <h3>{service.name}</h3><p>{service.description}</p>
              <dl><div><dt>Estimated time</dt><dd>{service.duration}</dd></div><div><dt>Service / studio online</dt><dd><span>{service.price}</span><small>{service.onlineTotal} online</small></dd></div></dl>
              <span className="card-link">Book this service <b>↗</b></span>
            </a>
          ))}
        </div>
      </section>

      <section className="section work" id="work">
        <div className="section-head section-head--align-end">
          <div><p className="eyebrow"><span /> Selected details</p><h2>The work<br /><em>speaks.</em></h2></div>
          <p>Selected work from the official Fade Plug Instagram. Open any image for a closer look or follow the original reel for full context.</p>
        </div>
        <div className="filter-row" role="group" aria-label="Portfolio filters">
          {filters.map(item => <button type="button" className={filter === item ? "active" : ""} onClick={() => setFilter(item)} key={item}>{item}</button>)}
        </div>
        <div className="portfolio-grid">
          {portfolioItems.filter(item => filter === "All" || item.category === filter).map((item, index) => (
            <article className={`portfolio-card portfolio-card--${index % 3 + 1}`} key={item.title}>
              <button className="portfolio-image-button" type="button" onClick={() => setSelectedWork(item)} aria-label={`Open ${item.title} gallery image`}>
                <Image src={item.image} alt={item.alt} fill sizes="(max-width: 800px) 100vw, (max-width: 1100px) 50vw, 33vw" quality={90} style={{ objectPosition: item.focus }} />
              </button>
              <div className="portfolio-meta"><span>{item.category}</span><h3>{item.title}</h3><p>{item.note}</p></div>
              <a href={item.source} target="_blank" rel="noreferrer">View original reel <span>↗</span></a>
            </article>
          ))}
        </div>
      </section>

      <section className="trusted-section">
        <div className="trusted-number">20<span>20</span></div>
        <div className="trusted-copy"><p className="eyebrow"><span /> Trusted in the chair</p><h2>Same standard.<br /><em>Every client.</em></h2><p>From local regulars to artists and event clients, every appointment receives the same attention to detail. Names and endorsements are never used without permission.</p><a className="text-link" href="https://www.instagram.com/the_fadeplug001/" target="_blank" rel="noreferrer">See original social work <span>↗</span></a></div>
      </section>

      <section className="section about" id="about">
        <div className="about-graphic">
          <Image className="puneet-portrait" src="/images/puneet-bhardwaj-portrait.png" alt="Puneet Bhardwaj, barber and founder of Fade Plug" fill sizes="(max-width: 800px) 100vw, 50vw" quality={92} />
          <div className="portrait-label"><span>PUNEET BHARDWAJ</span><small>BARBER / FOUNDER</small></div>
          <div className="about-stamp">PAPAKURA<br />EST. CRAFT<br />2020</div>
        </div>
        <div className="about-copy"><p className="eyebrow"><span /> Behind the brand</p><h2>Meet<br /><em>Puneet.</em></h2><p className="large-copy">Fade Plug was built around precision, consistency and personal service.</p><p>Based in Papakura, Puneet delivers appointment-only grooming for clients who value their time, their privacy and a sharp finish.</p><ul className="feature-list"><li>Barbering experience since 2020</li><li>Fade and beard specialist</li><li>Mobile grooming available</li><li>Individual appointment-only attention</li></ul><a className="text-link" href="#work">See Puneet’s work <span>↗</span></a></div>
      </section>

      <section className="mobile-service" id="mobile">
        <div className="mobile-grid">
          <div><p className="eyebrow eyebrow--dark"><span /> Premium concierge grooming</p><h2>The fade<br /><em>comes to you.</em></h2><p className="mobile-lede">Premium grooming at your home, accommodation, studio, workplace or approved event location.</p><a className="button button--dark" href="/book?location=mobile">Book mobile grooming <span>↗</span></a></div>
          <ol className="mobile-steps"><li><span>01</span><div><b>Choose a mobile service</b><p>Select any grooming service—there is no minimum service value.</p></div></li><li><span>02</span><div><b>Enter your Auckland suburb</b><p>Mobile service is available across Auckland.</p></div></li><li><span>03</span><div><b>Select a time & pay securely</b><p>The $100 minimum travel fee, 20% deposit and exact online-processing cost are shown before payment.</p></div></li></ol>
        </div>
        <div className="mobile-facts"><div><span>Service areas</span><b>All Auckland</b></div><div><span>Travel fee</span><b>$100 minimum</b></div><div><span>Minimum booking value</span><b>None</b></div><div><span>Parking & access</span><b>Agreed before payment</b></div></div>
      </section>

      <section className="section review-standard">
        <div><p className="eyebrow"><span /> Proof, without the puff</p><h2>Real words.<br /><em>No filler.</em></h2></div>
        <div className="review-policy"><span className="quote-mark">“</span><p>Client feedback will only appear here when it is genuine, approved and connected to a real service. No anonymous quotes. No inflated claims.</p><div><i className="status-dot" /> Verified-booking reviews only</div></div>
      </section>

      <section className="section faq" id="faq">
        <div className="faq-intro"><p className="eyebrow"><span /> Need to know</p><h2>Questions,<br /><em>answered.</em></h2><p>Still need help? Call 022 302 2464 or email bhardwajpuneet0786@gmail.com.</p></div>
        <div className="faq-list">{faq.map(([question, answer], index) => <details key={question}><summary><span>{String(index + 1).padStart(2, "0")}</span>{question}<b>+</b></summary><p>{answer}</p></details>)}</div>
      </section>

      <section className="final-cta">
        <div className="cta-orbit" aria-hidden="true" /><p className="eyebrow"><span /> Your time. Reserved.</p><h2>Your next cut<br /><em>starts here.</em></h2><p>Choose your service, secure your time and arrive knowing your appointment is reserved.</p><div><a className="button" href="/book">Book now <span>↗</span></a><a className="text-link" href="#services">View services <span>↑</span></a></div>
      </section>

      <footer className="footer">
        <div className="footer-main"><div><a href="#top"><BrandMark /></a><p>Precision grooming. Personal service.<br />114 Cargill Street, Papakura.</p></div><div className="footer-links"><div><span>Explore</span><a href="/book">Book now</a><a href="#services">Services</a><a href="#work">Portfolio</a><a href="#mobile">Mobile service</a><a href="#about">About</a></div><div><span>Booking</span><a href="/manage">Manage booking</a><a href="/cancellation-policy">Cancellation policy</a><a href="/terms">Terms</a><a href="/privacy">Privacy</a></div><div><span>Connect</span><a href="https://www.instagram.com/the_fadeplug001/" target="_blank" rel="noreferrer">Instagram ↗</a><a href="tel:+64223022464">022 302 2464</a><a href="mailto:bhardwajpuneet0786@gmail.com">bhardwajpuneet0786@gmail.com</a><span className="placeholder-contact">114 Cargill Street, Papakura</span></div></div></div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} Fade Plug®. All rights reserved.</span><span>Papakura • Auckland • Appointment only</span></div>
      </footer>
      <a className="mobile-book-cta" href="/book">Book now <span>↗</span></a>
      {selectedWork && (
        <div className="lightbox" role="dialog" aria-modal="true" aria-label={`${selectedWork.title} gallery image`}>
          <div className="lightbox-panel">
            <button className="lightbox-close" type="button" onClick={() => setSelectedWork(null)} aria-label="Close gallery">×</button>
            <div className="lightbox-image"><Image src={selectedWork.image} alt={selectedWork.alt} fill sizes="(max-width: 980px) 100vw, 60vw" quality={95} /></div>
            <div className="lightbox-copy"><span>{selectedWork.category}</span><h2>{selectedWork.title}</h2><p>{selectedWork.note}</p><div><a className="button" href={`/book?look=${encodeURIComponent(selectedWork.title)}`}>Book this look <span>↗</span></a><a className="text-link" href={selectedWork.source} target="_blank" rel="noreferrer">Original reel <span>↗</span></a></div></div>
          </div>
        </div>
      )}
    </main>
  );
}
