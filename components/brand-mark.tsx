export default function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`brand-mark ${compact ? "brand-mark--compact" : ""}`} aria-label="Fade Plug home">
      <span className="brand-ring" aria-hidden="true"><span>FP</span></span>
      <span className="brand-word"><b>FADE</b> PLUG<sup>®</sup></span>
    </span>
  );
}
