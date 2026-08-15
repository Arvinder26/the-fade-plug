import InnerHeader from "./inner-header";

export default function PolicyPage({ eyebrow, title, intro, sections }: { eyebrow: string; title: string; intro: string; sections: { heading: string; body: string }[] }) {
  return <main className="inner-page"><InnerHeader /><div className="policy-wrap"><section className="policy-hero"><p className="eyebrow"><span /> {eyebrow}</p><h1>{title}<br /><em>made clear.</em></h1><p>{intro}</p></section><div className="policy-status"><b>Plain-English booking policy</b><p>The important deadline and payment outcome are repeated before checkout and in the private booking details.</p></div><div className="policy-content"><aside>Fade Plug®<br />Papakura, Auckland<br />Last updated: 15 August 2026</aside><article>{sections.map(section => <section key={section.heading}><h2>{section.heading}</h2><p>{section.body}</p></section>)}</article></div></div></main>;
}
