// Marke „Vorsorgewaage“: Bildmarke (Waage, rechte Schale schwerer) plus Schriftzug.
// Die Bildmarke steckt als SVG auch in public/favicon.svg und public/apple-touch-icon.svg –
// bei Änderungen dort mitziehen.

export const MARKE = "Vorsorgewaage";

type MarkProps = { className?: string; title?: string };

export function BrandMark({ className, title }: MarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <defs>
        <linearGradient id="vw-schale" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7faaff" />
          <stop offset="1" stopColor="#0057ff" />
        </linearGradient>
      </defs>
      {/* Fuß und Säule */}
      <rect x="15" y="42" width="18" height="4" rx="2" fill="#0057ff" />
      <rect x="22" y="10" width="4" height="34" rx="2" fill="#0057ff" />
      {/* Balken, rechts geneigt */}
      <rect x="8" y="9.5" width="32" height="4" rx="2" fill="#0057ff" transform="rotate(10 24 11.5)" />
      <circle cx="24" cy="11.5" r="3.5" fill="#0057ff" />
      {/* Aufhängungen */}
      <path d="M8.2 8.7 L2.5 24 M8.2 8.7 L13.9 24" stroke="#0057ff" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M39.8 14.3 L34.1 30 M39.8 14.3 L45.5 30" stroke="#0057ff" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Schalen: links leicht, rechts schwer (Verlauf wie im bisherigen Markenzeichen) */}
      <path d="M1.5 24 H14.9 A6.7 5 0 0 1 1.5 24 Z" fill="#0057ff" opacity="0.55" />
      <path d="M33.1 30 H46.5 A6.7 5 0 0 1 33.1 30 Z" fill="url(#vw-schale)" />
    </svg>
  );
}

type LogoProps = { className?: string; markClassName?: string; textClassName?: string };

/** Bildmarke + Schriftzug in einer Zeile. */
export default function BrandLogo({
  className = "",
  markClassName = "h-8 w-8",
  textClassName = "text-xl text-slate-900",
}: LogoProps) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <BrandMark className={`${markClassName} shrink-0`} />
      <span className={`font-bold tracking-tight ${textClassName}`}>{MARKE}</span>
    </span>
  );
}
