import BrandMark from "./brand-mark";
import Link from "next/link";

export default function InnerHeader() {
  return <header className="inner-header"><Link href="/"><BrandMark compact /></Link><a href="/book">Book now ↗</a></header>;
}
