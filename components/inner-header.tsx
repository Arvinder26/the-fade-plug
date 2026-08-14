import BrandMark from "./brand-mark";

export default function InnerHeader() {
  return <header className="inner-header"><a href="/"><BrandMark compact /></a><a href="/book">Book now ↗</a></header>;
}
