import InnerHeader from "./inner-header";

export default function PolicyPage({ eyebrow, title, intro, sections }: { eyebrow: string; title: string; intro: string; sections: { heading: string; body: string }[] }) {
  return <main className="inner-page"><InnerHeader /><div className="policy-wrap"><section className="policy-hero"><p className="eyebrow"><span /> {eyebrow}</p><h1>{title}<br /><em>made clear.</em></h1><p>{intro}</p></section><div className="policy-status"><b>Approval required before launch</b><p>No unconfirmed deadline, fee, refund term or contact detail is presented as a live business policy.</p></div><div className="policy-content"><aside>Fade Plug®<br />Papakura, Auckland<br />Last updated: [DATE]</aside><article>{sections.map(section => <section key={section.heading}><h2>{section.heading}</h2><p>{section.body}</p></section>)}</article></div></div></main>;
}
