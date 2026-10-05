// Ansicht einer gespeicherten Fassung (Audit O08).
//
// Diese Seite stellt ausschließlich dar, was beim Speichern festgehalten
// wurde. Sie rechnet nichts – und genau darauf kommt es an: Der PDF-Export
// rastert das, was im Fenster steht. Würde die Fassung in einer Seite
// angezeigt, die daneben live rechnet, könnten beide Stände im selben
// Dokument landen. Hier ist das bauartbedingt ausgeschlossen.
//
// Ein Renderer für alle sieben Rechner: Die gespeicherte Form ist einheitlich
// (Kennzahlen als `results`, Ausgabereihen als `reihen`), deshalb braucht es
// keine Fallunterscheidung je Rechner.

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, FileDown, History } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency, formatChartAxis } from '@/components/shared/CurrencyDisplay';
import { FallVersion, type FallVersionModel } from '@/entities/FallVersion';
import { usePDFExport } from '@/utils/usePDFExport';
import PDFSectionDialog from '@/components/pdf/PDFSectionDialog';
import {
  beschriftung,
  formatiereKennzahl,
  kennzahlenLesen,
  reihenLesen,
  sortiereKennzahlen,
  zeitpunkt,
} from '@/utils/fassungAnzeige';
import { stammtAusAelteremModell, type ModellStempel } from '@/lib/finance/modell';

const LINIEN_FARBEN = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#94a3b8'];

/** Lange Tabellen würden das PDF sprengen – Anfang und Ende genügen. */
const MAX_ZEILEN = 40;

export default function FassungAnsicht() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const id = params.get('id');
  const [fassung, setFassung] = useState<FallVersionModel | null>(null);
  // „unbekannt" statt eines Umschaltens im Effekt: Ein setState direkt beim
  // Lauf des Effekts löst eine zweite Darstellung aus, bevor überhaupt etwas
  // geladen wurde.
  const [stand, setStand] = useState<'laedt' | 'fertig'>(id ? 'laedt' : 'fertig');
  const { isExporting, dialogOpen, openDialog, closeDialog, doExport } = usePDFExport();

  useEffect(() => {
    if (!id) return;
    let abgebrochen = false;
    FallVersion.get(id)
      .then((f) => {
        if (!abgebrochen) setFassung(f);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!abgebrochen) setStand('fertig');
      });
    return () => {
      abgebrochen = true;
    };
  }, [id]);

  if (stand === 'laedt') {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-8 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-slate-300 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!fassung) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-xl mx-auto text-center space-y-4">
          <h1 className="text-2xl font-bold text-slate-900">Fassung nicht gefunden</h1>
          <p className="text-slate-600">
            Diese Fassung gibt es nicht mehr, oder sie gehört zu einem anderen Konto.
          </p>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Zurück
          </Button>
        </div>
      </div>
    );
  }

  const stempel = fassung.results as Partial<ModellStempel>;
  const kennzahlen = sortiereKennzahlen(kennzahlenLesen(fassung.results));
  const reihen = reihenLesen(fassung.reihen);
  const bewertetAm = stempel.bewertet_am
    ? new Date(stempel.bewertet_am).toLocaleDateString('de-DE')
    : null;

  // Bei langen Reihen Anfang und Ende zeigen; die Mitte interessiert selten
  const tabelle = reihen
    ? reihen.daten.length > MAX_ZEILEN
      ? [...reihen.daten.slice(0, MAX_ZEILEN - 5), ...reihen.daten.slice(-5)]
      : reihen.daten
    : [];
  const gekuerzt = reihen ? reihen.daten.length > MAX_ZEILEN : false;

  const abschnitte = [
    { id: 'kennzahlen', label: 'Kennzahlen' },
    ...(reihen ? [{ id: 'verlauf', label: 'Verlauf' }] : []),
    ...(reihen ? [{ id: 'tabelle', label: 'Tabelle' }] : []),
  ];

  const untertitel =
    `Fassung ${fassung.version} · gespeichert am ${zeitpunkt(fassung.created_at)}` +
    (bewertetAm ? ` · bewertet am ${bewertetAm}` : '') +
    (stempel.modell_version ? ` · Modell ${stempel.modell_version}` : '');

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div id="pdf-content" className="max-w-5xl mx-auto space-y-6">
        {/* Kopf */}
        <div className="flex items-start justify-between gap-4" data-pdf-hide>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{fassung.name}</h1>
              <p className="text-slate-600 mt-1">Gespeicherte Fassung {fassung.version}</p>
            </div>
          </div>
          <Button
            onClick={openDialog}
            disabled={isExporting}
            className="bg-slate-800 hover:bg-slate-700 text-white"
          >
            <FileDown className="w-4 h-4 mr-2" />
            {isExporting ? 'Exportiere…' : 'PDF'}
          </Button>
        </div>

        {/* Herkunft der Zahlen – gehört ins Dokument, nicht nur auf den Schirm */}
        <div data-pdf-section="kennzahlen">
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <History className="w-5 h-5 text-slate-500" />
                {fassung.name} · Fassung {fassung.version}
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">{untertitel}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-slate-500">
                Diese Seite zeigt ausschließlich die Werte, die beim Speichern festgehalten
                wurden. Sie wird nicht neu berechnet.
                {stammtAusAelteremModell(stempel) && (
                  <>
                    {' '}
                    Die Fassung stammt aus einer früheren Fassung des Rechenmodells als der
                    heute verwendeten.
                  </>
                )}
              </p>
              {stempel.rechtsstand && (
                <p className="text-xs text-slate-400">Rechtsstand: {stempel.rechtsstand}</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {kennzahlen.map(([schluessel, wert]) => (
                  <div key={schluessel} className="rounded-xl border border-slate-200 p-4">
                    <div className="text-xs text-slate-500">{beschriftung(schluessel)}</div>
                    <div className="text-xl font-bold text-slate-900 mt-1">
                      {formatiereKennzahl(schluessel, wert)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {reihen && (
          <div data-pdf-section="verlauf">
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold text-slate-900">Verlauf</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={reihen.daten}
                      margin={{ top: 10, right: 20, left: 10, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey={reihen.achse} tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={formatChartAxis} tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(wert: unknown, name: unknown) => [
                          formatCurrency(Number(wert || 0)),
                          beschriftung(String(name)),
                        ]}
                        labelFormatter={(w) => `${beschriftung(reihen.achse)} ${w}`}
                      />
                      <Legend formatter={(name) => beschriftung(String(name))} />
                      {reihen.linien.map((schluessel, i) => (
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
              </CardContent>
            </Card>
          </div>
        )}

        {reihen && (
          <div data-pdf-section="tabelle">
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold text-slate-900">Jahresübersicht</CardTitle>
                {gekuerzt && (
                  <p className="text-xs text-slate-500 mt-1">
                    Anfang und Ende der Reihe; die mittleren Jahre sind ausgelassen.
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-200">
                        <TableHead className="font-semibold text-slate-700">
                          {beschriftung(reihen.achse)}
                        </TableHead>
                        {reihen.zeitspalten.map((schluessel) => (
                          <TableHead key={schluessel} className="font-semibold text-slate-700">
                            {beschriftung(schluessel)}
                          </TableHead>
                        ))}
                        {reihen.linien.map((schluessel) => (
                          <TableHead
                            key={schluessel}
                            className="font-semibold text-slate-700 text-right"
                          >
                            {beschriftung(schluessel)}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tabelle.map((zeile, i) => (
                        <TableRow key={i} className="border-slate-100">
                          <TableCell className="font-medium text-slate-900">
                            {zeile[reihen.achse]}
                          </TableCell>
                          {reihen.zeitspalten.map((schluessel) => (
                            <TableCell key={schluessel} className="text-slate-700">
                              {zeile[schluessel]}
                            </TableCell>
                          ))}
                          {reihen.linien.map((schluessel) => (
                            <TableCell key={schluessel} className="text-right">
                              {formatCurrency(zeile[schluessel] ?? 0)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {dialogOpen && (
        <PDFSectionDialog
          sections={abschnitte}
          isExporting={isExporting}
          onExport={(ids) =>
            doExport(
              ids,
              `${fassung.name}-fassung-${fassung.version}`,
              `${fassung.name} · Fassung ${fassung.version}`,
              untertitel
            )
          }
          onClose={closeDialog}
        />
      )}
    </div>
  );
}
