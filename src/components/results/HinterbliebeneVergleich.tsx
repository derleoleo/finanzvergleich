import { AlertTriangle } from 'lucide-react';
import type { TodesfallSzenario, TodesfallVariante } from '@/lib/finance/avd/todesfall';
import { formatCurrency } from '@/components/shared/CurrencyDisplay';

/**
 * Was bei den Hinterbliebenen ankommt – je Todeszeitpunkt und je Produkt.
 *
 * Warum als eigener Block und nicht als weitere Zeilen in der Tabelle: Der
 * entscheidende Unterschied ist kein Betrag, sondern ein Strukturmerkmal.
 * Beim geförderten Vertrag – Altersvorsorgedepot wie Riester – ist das
 * Kapital ab dem Rentenbeginn verrentet. Nach Ablauf der Rentengarantiezeit
 * bleibt den Hinterbliebenen **nichts**; förderunschädlich ist allenfalls die
 * Übertragung auf einen Vertrag des Ehegatten (§ 93 Abs. 1 S. 4 Buchst. c
 * EStG), und sonst greift die Rückforderung. Fondspolice und freies Depot
 * geben dagegen das ganze Kapital weiter.
 *
 * In einer Zahlenkolonne geht dieser Sprung unter. Als Balken sieht man ihn:
 * Zwei Spalten fallen auf null, zwei bleiben stehen.
 */

type Zeile = {
  name: string;
  erlaeuterung?: string;
  wert: TodesfallVariante | undefined;
  /** Geförderter Vertrag – trägt die Rückforderung. */
  gefoerdert: boolean;
};

function balkenFarbe(gefoerdert: boolean, leer: boolean): string {
  if (leer) return 'bg-slate-200';
  return gefoerdert ? 'bg-amber-500' : 'bg-blue-600';
}

export default function HinterbliebeneVergleich({
  szenarien,
}: {
  szenarien: TodesfallSzenario[];
}) {
  if (szenarien.length === 0) return null;

  const zeilen = (sz: TodesfallSzenario): Zeile[] => {
    const alle: Zeile[] = [
      {
        name: 'Altersvorsorgedepot, an sonstige Erben',
        erlaeuterung: 'nach Rückforderung und Steuer',
        wert: sz.sonstige,
        gefoerdert: true,
      },
      {
        name: 'Altersvorsorgedepot, auf einen Vertrag des Ehegatten',
        erlaeuterung: 'förderunschädlich (§ 93 Abs. 1 S. 4 Buchst. c EStG)',
        wert: sz.ehegatte,
        gefoerdert: true,
      },
    ];
    if (sz.riesterAlt) {
      alle.push({
        name: 'Riester-Altvertrag, an sonstige Erben',
        erlaeuterung: 'dieselbe Rückforderung wie beim Altersvorsorgedepot',
        wert: sz.riesterAlt,
        gefoerdert: true,
      });
    }
    if (sz.fondsLv) {
      alle.push({
        name: 'Fondspolice',
        erlaeuterung: 'Todesfallleistung, einkommensteuerfrei',
        wert: sz.fondsLv,
        gefoerdert: false,
      });
    }
    alle.push({
      name: 'Freies Depot',
      erlaeuterung: 'nach Abgeltungsteuer',
      wert: sz.freiesDepot,
      gefoerdert: false,
    });
    return alle;
  };

  return (
    <div className="space-y-6">
      {szenarien.map((sz, i) => {
        const reihen = zeilen(sz);
        const hoechst = Math.max(1, ...reihen.map((z) => z.wert?.verfuegbar ?? 0));
        // Faellt der gefoerderte Vertrag auf null, waehrend freies Kapital
        // stehen bleibt, ist das die Aussage des ganzen Blocks - sie gehoert
        // benannt, nicht nur gezeichnet.
        const vertragLeer = sz.sonstige.verfuegbar < 1 && sz.ehegatte.verfuegbar < 1;
        const freiesBleibt = reihen.some((z) => !z.gefoerdert && (z.wert?.verfuegbar ?? 0) > 1);

        return (
          <div key={i} className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-baseline justify-between gap-3 mb-3">
              <h4 className="font-semibold text-slate-900">Tod mit {sz.alter}</h4>
              <span className="text-xs text-slate-400 text-right">
                {sz.verrentetesKapital != null && sz.verrentetesKapital > 0 && (
                  <span className="block text-slate-500">
                    verrentet: {formatCurrency(sz.verrentetesKapital)}
                  </span>
                )}
                {sz.phase === 'vor_beginn'
                  ? 'vor Vertragsbeginn'
                  : sz.phase === 'anspar'
                    ? `Ansparphase, ${sz.jahr}`
                    : sz.phase === 'auszahl'
                      ? `Auszahlphase, ${sz.jahr}`
                      : 'nach Ablauf der Rentengarantiezeit'}
              </span>
            </div>

            <div className="space-y-2.5">
              {reihen.map((z, j) => {
                const verfuegbar = z.wert?.verfuegbar ?? 0;
                const gesamt = z.wert?.kapitalGesamt ?? 0;
                const anteil = Math.min(100, (verfuegbar / hoechst) * 100);
                const abzug = Math.max(0, gesamt - verfuegbar);
                return (
                  <div key={j}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-slate-700">
                        {z.name}
                        {z.erlaeuterung && (
                          <span className="block text-xs text-slate-400">{z.erlaeuterung}</span>
                        )}
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="font-semibold tabular-nums text-slate-900">
                          {formatCurrency(verfuegbar)}
                        </span>
                        <span className="block text-xs text-slate-400 tabular-nums">
                          Gesamtkapital {formatCurrency(gesamt)}
                          {abzug > 0.5 && ` · −${formatCurrency(abzug)}`}
                        </span>
                      </span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${balkenFarbe(z.gefoerdert, verfuegbar < 1)}`}
                        style={{ width: `${Math.max(anteil, verfuegbar > 0 ? 1.5 : 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {vertragLeer && freiesBleibt && (
              <p className="mt-3 flex items-start gap-2 text-xs text-amber-700">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                Die Rentengarantiezeit ist abgelaufen: Aus dem geförderten Vertrag geht
                nichts mehr an die Hinterbliebenen – auch nicht an den Ehegatten. Freies
                Kapital wird dagegen vollständig vererbt. Das ist kein Rechenergebnis,
                sondern die Bauart der geförderten Altersvorsorge.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
