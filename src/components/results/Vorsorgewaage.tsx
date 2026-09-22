// Ergebnis-Waage: Die Seite mit mehr erwartetem Endkapital ist „schwerer“ und
// hängt tiefer. Ersetzt wertende Aussagen („X ist besser“) durch eine neutrale
// Beschreibung des Rechenergebnisses. Wird im PDF-Export mit abgebildet.
import type { ReactNode } from "react";
import { BrandMark, MARKE } from "@/components/BrandLogo";
import { formatCurrency } from "@/components/shared/CurrencyDisplay";
import { waageNeigung, waagenAussage } from "@/utils/waage";

export type WaagenSeite = {
  /** Anzeigename unter der Schale, z. B. „Lebensversicherung“. */
  name: string;
  /** Name im Aussagesatz nach „mit“, z. B. „der Lebensversicherung“. */
  imSatz: string;
  /** Erwartetes Endkapital. */
  wert: number;
  /** Eingezahlter Betrag – wird in der Schale grau vom Ertrag abgesetzt. */
  eingezahlt?: number;
  /** Farbe des Ertragsanteils. */
  farbe: string;
  /** Zusatzzeile unter dem Betrag. */
  detail?: ReactNode;
};

type Props = {
  links: WaagenSeite;
  rechts: WaagenSeite;
  /** Kurzbeschreibung der Vergleichsbasis, z. B. „netto nach Steuern“. */
  basis?: string;
  /** Bedienelemente rechts im Kopf (z. B. Brutto/Netto-Umschalter). */
  aktionen?: ReactNode;
  /** Eigenständige Karte (Schatten) statt Rahmen innerhalb einer Karte. */
  alsKarte?: boolean;
};

// Geometrie im SVG-Raster (viewBox 640 × 280)
const DREHPUNKT = { x: 320, y: 56 };
const HALBE_BALKENLAENGE = 205;
const SCHALEN_TIEFE = 150; // Abstand Aufhängung → Schalenrand
const STAPEL_MAX_HOEHE = 88;
const STAPEL_BREITE = 104;
const GRAU = "#cbd5e1";

function endpunkt(neigungGrad: number, seite: -1 | 1) {
  const rad = (neigungGrad * Math.PI) / 180;
  return {
    x: DREHPUNKT.x + seite * HALBE_BALKENLAENGE * Math.cos(rad),
    y: DREHPUNKT.y + seite * HALBE_BALKENLAENGE * Math.sin(rad),
  };
}

const bewegung = "transition-transform duration-700 ease-out motion-reduce:transition-none";

function Schale({
  seite,
  x,
  y,
  maxWert,
  mitEingezahlt,
}: {
  seite: WaagenSeite;
  x: number;
  y: number;
  maxWert: number;
  mitEingezahlt: boolean;
}) {
  const wert = Math.max(0, seite.wert);
  const gesamtHoehe = (wert / maxWert) * STAPEL_MAX_HOEHE;
  const grauHoehe = mitEingezahlt
    ? (Math.min(Math.max(0, seite.eingezahlt ?? 0), wert) / maxWert) * STAPEL_MAX_HOEHE
    : 0;
  const boden = SCHALEN_TIEFE;
  const halb = STAPEL_BREITE / 2;

  return (
    <g className={bewegung} style={{ transform: `translate(${x}px, ${y}px)` }}>
      {/* Aufhängung */}
      <path
        d={`M0 0 L-80 ${boden} M0 0 L80 ${boden}`}
        stroke="#94a3b8"
        strokeWidth={2}
        fill="none"
      />
      {/* Gewichte: eingezahlt (grau) unten, Ertrag (Farbe) darüber */}
      {gesamtHoehe > 0 && (
        <rect x={-halb} y={boden - gesamtHoehe} width={STAPEL_BREITE} height={gesamtHoehe} rx={4} fill={seite.farbe} />
      )}
      {grauHoehe > 0 && (
        <rect x={-halb} y={boden - grauHoehe} width={STAPEL_BREITE} height={grauHoehe} rx={4} fill={GRAU} />
      )}
      {/* Schale */}
      <path d={`M-88 ${boden} H88 A88 18 0 0 1 -88 ${boden} Z`} fill="#0057ff" />
      <circle cx={0} cy={0} r={6} fill="#0057ff" />
    </g>
  );
}

export default function Vorsorgewaage({ links, rechts, basis, aktionen, alsKarte = false }: Props) {
  const neigung = waageNeigung(links.wert, rechts.wert);
  const l = endpunkt(neigung, -1);
  const r = endpunkt(neigung, 1);
  const maxWert = Math.max(1, links.wert, rechts.wert);
  const mitEingezahlt = links.eingezahlt !== undefined && rechts.eingezahlt !== undefined;
  const aussage = waagenAussage(links, rechts);

  return (
    <div
      className={
        alsKarte
          ? "rounded-2xl bg-white shadow-lg p-4 md:p-6"
          : "rounded-2xl border border-slate-200 bg-white p-5"
      }
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <BrandMark className="h-7 w-7 shrink-0" />
          <div>
            <div className="text-lg font-bold tracking-tight text-slate-900">{MARKE}</div>
            {basis && <div className="text-xs text-slate-500">{basis}</div>}
          </div>
        </div>
        {aktionen}
      </div>

      <svg
        viewBox="0 0 640 280"
        className="w-full max-w-2xl mx-auto mt-2 block"
        role="img"
        aria-label={aussage}
      >
        {/* Ständer */}
        <rect x={312} y={DREHPUNKT.y} width={16} height={184} rx={4} fill="#0057ff" />
        <rect x={250} y={236} width={140} height={14} rx={7} fill="#0057ff" />
        {/* Balken */}
        <g
          className={bewegung}
          style={{
            transform: `rotate(${neigung}deg)`,
            transformOrigin: `${DREHPUNKT.x}px ${DREHPUNKT.y}px`,
            transformBox: "view-box",
          }}
        >
          <rect
            x={DREHPUNKT.x - HALBE_BALKENLAENGE - 8}
            y={DREHPUNKT.y - 6}
            width={2 * HALBE_BALKENLAENGE + 16}
            height={12}
            rx={6}
            fill="#0057ff"
          />
        </g>
        <circle cx={DREHPUNKT.x} cy={DREHPUNKT.y} r={13} fill="#0057ff" />
        <circle cx={DREHPUNKT.x} cy={DREHPUNKT.y} r={5} fill="white" />

        <Schale seite={links} x={l.x} y={l.y} maxWert={maxWert} mitEingezahlt={mitEingezahlt} />
        <Schale seite={rechts} x={r.x} y={r.y} maxWert={maxWert} mitEingezahlt={mitEingezahlt} />
      </svg>

      <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto -mt-1">
        {[links, rechts].map((s, i) => (
          <div key={i} className="text-center">
            <div className="flex items-center justify-center gap-2 text-sm text-slate-600">
              <span className="inline-block w-3 h-3 rounded-sm shrink-0" style={{ background: s.farbe }} />
              {s.name}
            </div>
            <div className="text-xl md:text-2xl font-bold text-slate-900 mt-1">{formatCurrency(s.wert)}</div>
            {s.detail && <div className="text-xs text-slate-500 mt-1">{s.detail}</div>}
          </div>
        ))}
      </div>

      {mitEingezahlt && (
        <div className="flex justify-center gap-4 mt-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ background: GRAU }} />
            eingezahlt
          </span>
          <span>Farbe = Ertrag</span>
        </div>
      )}

      <p className="mt-4 text-center text-base text-slate-800 max-w-2xl mx-auto">{aussage}</p>
      <p className="mt-1 text-center text-xs text-slate-400">
        Modellrechnung auf Basis der eingegebenen Annahmen – keine Anlageempfehlung.
      </p>
    </div>
  );
}
