// Umschalter zwischen zwei oder mehr Möglichkeiten. Der weiße Schieber wandert
// auf die aktive Stelle. Für Ein/Aus stattdessen <Switch> verwenden.
//
// Bis Oktober 2026 war der Baustein auf genau zwei Optionen festgelegt – als
// Tupeltyp, mit `grid-cols-2` und einer Tastaturlogik, die nur zwischen 0 und 1
// umschaltete. Die Einstiegsleiste des Altersvorsorgedepot-Rechners braucht
// drei. Erweitert statt kopiert: Zwei Bausteine mit derselben Aufgabe müsste
// man beim nächsten Barrierefreiheits-Fix beide pflegen.
//
// Ende Oktober 2026 kam das Umbrechen dazu. Vorher war die Leiste ein Raster
// aus gleich breiten Spalten (`minmax(0, 1fr)`) in genau einer Reihe: Auf
// schmalen Telefonen wurde jede Spalte schmaler als ihre Beschriftung, und die
// lief mit `whitespace-nowrap` sichtbar aus ihrem Feld heraus. Gemessen auf
// 320 px Breite: „Riester-Bestand" 26 px, „neue Förderung (ab 2027)" 43 px,
// „Steuerfrei (z.B. vor 2005)" 104 px. Die Dreiergruppe war der auffälligste,
// aber nicht der schlimmste Fall – auch Zweiergruppen mit langen
// Beschriftungen liefen schon auf 420 px über, und auf 768 px, wo die drei
// Leisten der AVD-Einstiegszeile nebeneinander stehen, blieben jedem Feld
// 38 px: „Riester-Bestand" stand dort 80 px weit heraus. Selbst auf 1280 px
// fehlten noch 2 px. Es war also nie nur ein Telefonproblem.
//
// Statt kürzerer Beschriftungen („Riester" statt „Riester-Bestand" wäre eine
// fachliche Änderung der Aussage, kein Darstellungsfix) bricht die Leiste
// jetzt um. Dafür messen zwei Dinge sich selbst:
//
//   1. Die Feldbreite. Alle Felder werden so breit wie die breiteste
//      Beschriftung – genau wie im alten Raster, nur dass die Breite jetzt
//      eine Untergrenze ist und kein Vorschlag. Reicht der Platz nicht für
//      alle Felder nebeneinander, rutschen sie in eine zweite Reihe und
//      füllen diese ganz aus.
//   2. Der Schieber. Er liest seinen Platz vom gewählten Feld ab, statt ihn
//      aus der Feldzahl zu rechnen. Die alte Rechnung – eine Feldbreite plus
//      eine Lücke nach rechts – konnte eine zweite Reihe gar nicht treffen.
import { useLayoutEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

export type SegmentOption<T extends string> = { value: T; label: ReactNode };

type Props<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  /** Mindestens zwei; die erste gilt, wenn `value` zu keiner passt. */
  options: readonly SegmentOption<T>[];
  /** Beschriftung für Screenreader, wenn daneben kein sichtbares Label steht. */
  ariaLabel?: string;
  className?: string;
};

/** Platz des Schiebers in Pixeln, gemessen innerhalb der Leiste. */
type Lage = { left: number; top: number; width: number; height: number };

function gleicheLage(a: Lage | null, b: Lage) {
  return (
    a !== null &&
    a.left === b.left &&
    a.top === b.top &&
    a.width === b.width &&
    a.height === b.height
  );
}

export function SegmentedToggle<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className = "",
}: Props<T>) {
  const anzahl = options.length;
  const aktiverIndex = options.findIndex((o) => o.value === value);
  const index = aktiverIndex === -1 ? 0 : aktiverIndex;

  const leiste = useRef<HTMLDivElement>(null);
  const [feldbreite, setFeldbreite] = useState<number | null>(null);
  const [lage, setLage] = useState<Lage | null>(null);

  /** Nachbar in Laufrichtung, rundherum. */
  const nachbar = (von: number, richtung: 1 | -1) => (von + richtung + anzahl) % anzahl;

  // Kein Vergleich von Objektkennungen: Die Aufrufer schreiben ihre Optionen
  // meist direkt ins JSX, die Liste ist also bei jedem Rendern eine neue.
  const felderSchluessel = options.map((o) => o.value).join("\u0000");

  useLayoutEffect(() => {
    const el = leiste.current;
    if (!el) return;

    const messen = () => {
      const felder = [...el.querySelectorAll<HTMLElement>('[role="radio"]')];
      if (felder.length === 0) return;

      // Gemessen wird die Beschriftung selbst (das innere `span`), nicht das
      // Feld: Dessen Breite ist ja gerade das Ergebnis dieser Rechnung, und in
      // einer umgebrochenen Reihe ist sie ohnehin aufgezogen.
      const stil = getComputedStyle(felder[0]);
      const polster = parseFloat(stil.paddingLeft) + parseFloat(stil.paddingRight);
      const breiteste = Math.max(
        ...felder.map((f) => (f.firstElementChild as HTMLElement | null)?.offsetWidth ?? 0),
      );
      const neueBreite = Math.ceil(breiteste + polster);
      // Nur bei echter Änderung neu rendern: Der Beobachter unten meldet sich
      // auch dann, wenn sich nichts verschoben hat.
      setFeldbreite((vorher) => (vorher === neueBreite ? vorher : neueBreite));

      const feld = felder[index];
      const neu = {
        left: feld.offsetLeft,
        top: feld.offsetTop,
        width: feld.offsetWidth,
        height: feld.offsetHeight,
      };
      setLage((vorher) => (gleicheLage(vorher, neu) ? vorher : neu));
    };

    messen();

    // Die Felder wachsen mit der Schrift und schrumpfen mit dem Fenster – und
    // beim Umbruch wechselt die Reihe, ohne dass die Leiste ihre Breite
    // ändert. Ohne Beobachter blieben Feldbreite und Schieber beim ersten Maß.
    const beobachter = new ResizeObserver(messen);
    beobachter.observe(el);
    for (const feld of el.querySelectorAll('[role="radio"]')) {
      beobachter.observe(feld);
      if (feld.firstElementChild) beobachter.observe(feld.firstElementChild);
    }
    return () => beobachter.disconnect();
  }, [index, felderSchluessel, feldbreite]);

  return (
    <div
      ref={leiste}
      role="radiogroup"
      aria-label={ariaLabel}
      // Ab `lg` wieder das alte Raster aus gleich breiten Spalten, in genau
      // einer Reihe. Auf breiten Schirmen war daran nichts auszusetzen: Auf
      // 1536 px waren die Felder 130 px breit und damit so breit wie ihre
      // Beschriftung, auf 1280 px 116 px und „Riester-Bestand" 2 px zu eng –
      // unsichtbar.
      //
      // Dass die Grenze bei `lg` liegt und nicht bei `xl`, ist eine bewusste
      // Entscheidung gegen die Messung: Auf 1024 px, wo `lg` gerade greift,
      // blieben jedem Feld nur 77 px, und „Riester-Bestand" stand dort 56 px
      // über sein Feld hinaus. Das bleibt so. Die Vorgabe war, die gewohnte
      // Ansicht auf dem Rechner unangetastet zu lassen; wer das ändern will,
      // setzt hier und in `AvdEinstieg` `xl` statt `lg`, dann bricht die
      // Leiste schon ab 1024 px um.
      //
      // `flexBasis`, `grow` und `shrink-0` an den Feldern sind im Raster
      // wirkungslos, `gridTemplateColumns` im Flex-Fluss ebenso – dieselbe
      // Auszeichnung trägt beide Darstellungen, und der Schieber misst
      // ohnehin nach, statt zu rechnen.
      //
      // `max-w-full`: Steht die Leiste in einer Flex-Zeile neben einem Label,
      // ist ihr Platz schmaler als sie selbst – dann bricht sie um, statt über
      // den Rand hinauszulaufen.
      //
      // Kein `shrink-0` hier, auch wenn es verlockend ist: Ein Flex-Feld, das
      // nicht schrumpfen kann, vererbt seine ganze Breite als Mindestbreite
      // nach oben. Gemessen auf 320 px: Die Karte der Einmalanlage wuchs damit
      // von 288 auf 374 px und stand aus ihrer Rasterzelle heraus. Wo eine
      // kurze Leiste neben einem langen Text nachgibt, obwohl Platz wäre,
      // gehört `shrink-0` an die Aufrufstelle – dort ist die Zeile bekannt.
      //
      // Die Rundung folgt der Feldhöhe (28 px, ab `sm` 32 px, plus 4 px
      // Polsterung ringsum) statt `rounded-full`: In einer Reihe sieht sie
      // genauso aus, über zwei Reihen wird daraus keine Ellipse.
      className={`relative inline-flex max-w-full flex-wrap gap-1 rounded-[1.125rem] bg-slate-100 p-1 sm:rounded-[1.25rem] lg:inline-grid ${className}`}
      style={{ gridTemplateColumns: `repeat(${anzahl}, minmax(0, 1fr))` }}
    >
      {/* Schieber: liegt hinter den Beschriftungen und wandert zur aktiven
          Stelle. Bis zur ersten Messung unsichtbar – die läuft vor dem ersten
          Zeichnen, es blitzt also nichts auf. */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute rounded-full bg-white shadow-sm transition-[left,top,width,height] duration-200 ease-out motion-reduce:transition-none ${
          lage ? "" : "opacity-0"
        }`}
        style={lage ?? undefined}
      />
      {options.map((option, i) => {
        const aktiv = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={aktiv}
            // Bei Optionsfeldern erwarten Tastaturnutzer die Pfeiltasten;
            // nur ein Feld liegt im Tab-Ablauf. Es hängt am Schieber, nicht an
            // `aktiv`: Passt `value` zu keiner Option, wäre sonst die ganze
            // Gruppe mit der Tastatur unerreichbar.
            tabIndex={i === index ? 0 : -1}
            onKeyDown={(e) => {
              const richtung =
                e.key === "ArrowRight" || e.key === "ArrowDown"
                  ? 1
                  : e.key === "ArrowLeft" || e.key === "ArrowUp"
                    ? -1
                    : 0;
              if (richtung === 0) return;
              e.preventDefault();
              const ziel = nachbar(i, richtung);
              onChange(options[ziel].value);
              const knoepfe = e.currentTarget.parentElement?.querySelectorAll("button");
              knoepfe?.[ziel]?.focus();
            }}
            onClick={() => onChange(option.value)}
            // Die gemessene Feldbreite ist die Grundbreite: Passen alle Felder
            // nebeneinander, sind sie alle genau so breit. Passen sie nicht,
            // bricht die Leiste um, und `grow` zieht jede Reihe voll auf.
            //
            // `shrink-0` ist dabei nicht Beiwerk, sondern hält die Leiste
            // zusammen: Darf das Feld schrumpfen, bleibt die Leiste als
            // Ganzes schmaler als die Summe ihrer Felder – und dann bricht
            // sie um, obwohl Platz da wäre. Gemessen auf 1280 px: Selbst
            // „EUR" und „%" standen damit untereinander.
            style={feldbreite === null ? undefined : { flexBasis: feldbreite }}
            className={`relative z-10 grow shrink-0 whitespace-nowrap rounded-full px-2 py-1.5 text-xs transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:px-3 sm:text-sm ${
              aktiv ? "font-semibold text-slate-900" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {/* Eigenes Element um die Beschriftung, damit ihre Breite messbar
                bleibt, wenn das Feld aufgezogen ist. */}
            <span className="inline-block">
              {/* Dieselbe Beschriftung, unsichtbar und immer fett: Sie gibt die
                  Breite vor, damit das Feld nicht wächst, sobald es gewählt
                  (und damit fett) wird. Ohne das sprang die Leiste beim
                  Umschalten – gemessen auf 420 px: Die Dreiergruppe stand bei
                  „Freies Depot" in einer Reihe und bei „Riester-Bestand" in
                  zwei, weil die fette Beschriftung 4 px mehr braucht. */}
              {/* Ab `lg` weg: Dort bestimmt das Raster die Spaltenbreiten, der
                  Platzhalter würde nur noch die Gesamtbreite der Leiste um
                  2 bis 10 px aufblähen - und die soll bleiben, wie sie war. */}
              <span aria-hidden="true" className="invisible block h-0 font-semibold lg:hidden">
                {option.label}
              </span>
              <span className="block">{option.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default SegmentedToggle;
