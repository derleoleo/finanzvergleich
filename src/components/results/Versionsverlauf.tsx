// Verlauf der gespeicherten Fassungen einer Berechnung (Audit O08).
//
// Jedes Speichern schreibt eine unveränderliche Version fest. Hier lässt sie
// sich wieder öffnen – mit den Zahlen und Kurven von damals, nicht mit dem,
// was das heutige Modell daraus machen würde.
import { useEffect, useState } from 'react';
import { History, X } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatChartAxis } from '@/components/shared/CurrencyDisplay';
import {
  FallVersion,
  type FallTabelle,
  type FallVersionModel,
} from '@/entities/FallVersion';
import {
  beschriftung,
  formatiereKennzahl,
  kennzahlenLesen,
  reihenLesen,
  sortiereKennzahlen,
  zeitpunkt,
} from '@/utils/fassungAnzeige';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { stammtAusAelteremModell, type ModellStempel } from '@/lib/finance/modell';

type Props = {
  fallTabelle: FallTabelle;
  fallId: string | null;
  /** Hochzählen, sobald gespeichert wurde – lädt die Liste neu. */
  neuLadenAb?: number;
};

const LINIEN_FARBEN = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#94a3b8'];

export default function Versionsverlauf({ fallTabelle, fallId, neuLadenAb = 0 }: Props) {
  const [versionen, setVersionen] = useState<FallVersionModel[]>([]);
  const [offen, setOffen] = useState<FallVersionModel | null>(null);

  useEffect(() => {
    if (!fallId) return;
    let abgebrochen = false;
    FallVersion.list(fallTabelle, fallId)
      .then((liste) => {
        if (!abgebrochen) setVersionen(liste);
      })
      .catch(() => {
        if (!abgebrochen) setVersionen([]);
      });
    return () => {
      abgebrochen = true;
    };
  }, [fallTabelle, fallId, neuLadenAb]);

  if (!fallId || versionen.length === 0) return null;

  const datum = zeitpunkt;
  const kennzahlen = (v: FallVersionModel) => sortiereKennzahlen(kennzahlenLesen(v.results));
  const gezeichnet = offen ? reihenLesen(offen.reihen) : null;

  return (
    <div
      className="rounded-2xl border border-slate-200 bg-white p-5"
      data-pdf-section="versionen"
    >
      <div className="flex items-center gap-2 mb-3">
        <History className="w-4 h-4 text-slate-500 shrink-0" />
        <div className="text-sm font-semibold text-slate-800">
          Frühere Fassungen ({versionen.length})
        </div>
      </div>

      <p className="text-xs text-slate-500 mb-3">
        Jedes Speichern hält den damaligen Stand unverändert fest – Zahlen und Kurven
        stammen aus der Rechnung von damals, nicht aus dem heutigen Modell.
      </p>

      <div className="flex flex-wrap gap-2" data-pdf-hide>
        {versionen.map((v) => {
          const alt = stammtAusAelteremModell(v.results as Partial<ModellStempel>);
          const aktiv = offen?.id === v.id;
          return (
            <Button
              key={v.id}
              size="sm"
              variant={aktiv ? 'default' : 'outline'}
              className={aktiv ? 'bg-slate-800 hover:bg-slate-700' : ''}
              onClick={() => setOffen(aktiv ? null : v)}
            >
              Fassung {v.version}
              <span className="ml-2 text-xs opacity-70">{datum(v.created_at)}</span>
              {alt && <span className="ml-1 text-amber-500">•</span>}
            </Button>
          );
        })}
      </div>

      {offen && (
        <div className="mt-4 rounded-xl border border-slate-200 p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="text-sm font-semibold text-slate-900">
                {offen.name} · Fassung {offen.version}
              </div>
              <div className="text-xs text-slate-500">
                gespeichert am {datum(offen.created_at)}
                {typeof offen.results.modell_version === 'string' && (
                  <> · Modell {String(offen.results.modell_version)}</>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0" data-pdf-hide>
              {/* Die vollständige Ansicht rechnet nichts und ist deshalb die
                  Grundlage für ein PDF, das genau diese Fassung zeigt. */}
              <Link to={`${createPageUrl('FassungAnsicht')}?id=${offen.id}`}>
                <Button size="sm" variant="outline">
                  Vollständig öffnen
                </Button>
              </Link>
              <Button size="sm" variant="ghost" onClick={() => setOffen(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {stammtAusAelteremModell(offen.results as Partial<ModellStempel>) && (
            <p className="text-xs text-amber-700 mb-3">
              Diese Fassung wurde mit einer früheren Fassung des Rechenmodells erstellt.
              Die Werte bleiben unverändert erhalten.
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {kennzahlen(offen).map(([schluessel, wert]) => (
              <div key={schluessel} className="rounded-lg border border-slate-200 p-3">
                <div className="text-xs text-slate-500">{beschriftung(schluessel)}</div>
                <div className="text-base font-bold text-slate-900">
                  {formatiereKennzahl(schluessel, wert)}
                </div>
              </div>
            ))}
          </div>

          {gezeichnet ? (
            <div className="h-72 w-full mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={gezeichnet.daten} margin={{ top: 10, right: 20, left: 10, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={gezeichnet.achse} tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={formatChartAxis} tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(wert: unknown, name: unknown) => [
                      formatCurrency(Number(wert || 0)),
                      gezeichnet.beschriften(String(name)),
                    ]}
                  />
                  <Legend formatter={(name) => gezeichnet.beschriften(String(name))} />
                  {gezeichnet.linien.map((schluessel, i) => (
                    <Line
                      key={schluessel}
                      type="monotone"
                      dataKey={schluessel}
                      stroke={LINIEN_FARBEN[i % LINIEN_FARBEN.length]}
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-xs text-slate-400 mt-3">
              Für diese Fassung wurden keine Reihen gespeichert.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
