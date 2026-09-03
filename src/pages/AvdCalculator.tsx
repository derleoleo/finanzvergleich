// src/pages/AvdCalculator.tsx
// Altersvorsorgedepot-Rechner (gefördert, ab Beitragsjahr 2027).
// Rechtsstand: Altersvorsorgereformgesetz, BGBl. 2026 I Nr. 156 v. 29.05.2026.
//
// Aufbau nach dem Beratungsnutzen: erst Förderberechtigung, dann der
// förderoptimale Beitrag mit Grenzförderquoten-Kurve, dann der Nettovergleich
// gegen ein freies Depot, zuletzt die Auszahlphase.
// v1 ohne Supabase-Persistenz: localStorage-Draft + PDF-Export.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { UserDefaults } from '@/entities/UserDefaults';
import {
  simuliereAvd,
  foerderquotenKurve,
  deflatorFuer,
  type AvdEingabe,
} from '@/lib/finance/avd/simulation';
import { GESETZ, RECHTS_FLAGS_DEFAULT, ANNAHMEN } from '@/lib/finance/avd/config';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { formatCurrency, formatChartAxis } from '@/components/shared/CurrencyDisplay';
import { usePDFExport } from '@/utils/usePDFExport';
import PDFSectionDialog from '@/components/pdf/PDFSectionDialog';
import {
  PiggyBank, FileDown, ArrowLeft, AlertTriangle, Info, CheckCircle2,
} from 'lucide-react';
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const DRAFT_KEY = 'fv_avd_draft_v1';
const inputClass = 'bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white';
const selectClass = `${inputClass} w-full rounded-md border px-3 py-2 text-sm`;

type FormData = Omit<AvdEingabe, 'flags'>;

function makeDefaults(): FormData {
  const d = UserDefaults.load();
  const jetzt = new Date().getFullYear();
  return {
    geburtsjahr: d.birth_year,
    beitragsjahrStart: Math.max(GESETZ.ERSTES_BEITRAGSJAHR, jetzt),
    auszahlungsbeginnAlter: 67,
    berechtigung: 'unmittelbar',
    splitting: false,
    kinder: 0,
    ehegatteMittelbarBerechtigt: false,
    eigenbeitragEhegatteUnmittelbar: 0,
    eigenbeitragMonatlich: 150,
    beitragsdynamikPaJahr: d.dynamik_percent / 100,
    zvEJahr: 48000,
    kirchensteuersatz: d.kirchensteuer_percent / 100,
    soliBeruecksichtigen: d.apply_solidaritaetszuschlag,
    steuersatzImAlter: d.lv_personal_income_tax_rate / 100,
    effektivkostenPaJahr: 0.005,
    fixkostenProJahr: 0,
    renditeBruttoPaJahr: d.assumed_annual_return / 100,
    auszahlform: 'auszahlplan',
    teilkapitalAnteil: 0,
    auszahlplanEndalter: 85,
    rentenfaktorProZehntausend: ANNAHMEN.RENTENFAKTOR_PRO_10K,
    kvStatusImAlter: 'pflicht',
    vergleichspartner: 'depot',
    depotKostenPaJahr: d.depot_costs_annual / 100,
    riester: {
      beitragspflEinnahmenVorjahr: 45000,
      kinderGeborenVor2008: 0,
      effektivkostenPaJahr: 0.02,
      renditeBruttoPaJahr: 0.03,
    },
    vergleichsmodus: 'gleicher_nettoaufwand',
    sparerpauschbetrag: ANNAHMEN.SPARERPAUSCHBETRAG,
    inflationPaJahr: d.inflation_percent / 100,
    zulagenZuflussVerzoegerungJahre: 1,
    erstattungReinvestieren: false,
  };
}

function loadDraft(): FormData {
  const defaults = makeDefaults();
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...(JSON.parse(raw) as Partial<FormData>) };
  } catch {
    return defaults;
  }
}

const pct = (v: number, digits = 0) =>
  `${(v * 100).toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits })} %`;

export default function AvdCalculator() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>(() => loadDraft());
  const [showReal, setShowReal] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { isExporting, dialogOpen, openDialog, closeDialog, doExport } = usePDFExport();

  const update = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => {
      const next = { ...prev, [field]: value };
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        try {
          localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
        } catch { /* ignore */ }
      }, 250);
      return next;
    });
  };

  useEffect(() => () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
  }, []);

  const ergebnis = useMemo(
    () => simuliereAvd({ ...formData, flags: RECHTS_FLAGS_DEFAULT }),
    [formData]
  );

  const kurve = useMemo(
    () =>
      foerderquotenKurve({
        kinder: formData.kinder,
        zvE: formData.zvEJahr,
        splitting: formData.splitting,
        berechtigung: formData.berechtigung,
        zuschlaege: {
          soli: formData.soliBeruecksichtigen,
          kirchensteuersatz: formData.kirchensteuersatz,
        },
        maxBeitrag: 3600,
        schritt: 60,
      }),
    [formData]
  );

  const updateRiester = <K extends keyof NonNullable<FormData['riester']>>(
    field: K,
    value: NonNullable<FormData['riester']>[K]
  ) => {
    const aktuell = formData.riester ?? {
      beitragspflEinnahmenVorjahr: 45000,
      kinderGeborenVor2008: 0,
      effektivkostenPaJahr: 0.02,
      renditeBruttoPaJahr: 0.03,
    };
    update('riester', { ...aktuell, [field]: value });
  };

  const jahresbeitrag = formData.eigenbeitragMonatlich * 12;
  const hatFehler = ergebnis.hinweise.some((h) => h.art === 'fehler');
  const gegenRiester = formData.vergleichspartner === 'riester_alt';
  const riester = formData.riester;
  const vergleichName = gegenRiester ? 'Riester-Bestandsvertrag' : 'Freies Depot';

  const verlaufsdaten = ergebnis.jahre.map((j, i) => ({
    jahr: j.jahr,
    alter: j.alter,
    avd: Math.round(showReal ? j.kapitalGesamtReal : j.kapitalGesamt),
    depot: Math.round(
      (() => {
        const nominal =
          ergebnis.riesterAlt?.kapitalProJahr[i] ?? j.depotKapital;
        return showReal
          ? nominal /
              deflatorFuer(formData.inflationPaJahr, j.alter - (ergebnis.jahre[0].alter - 1))
          : nominal;
      })()
    ),
    eingezahlt: Math.round(
      ergebnis.jahre.slice(0, j.jahr - ergebnis.jahre[0].jahr + 1).reduce((s, x) => s + x.eigenbeitrag, 0)
    ),
  }));

  const endAvd = showReal ? ergebnis.endkapitalNachSteuerReal : ergebnis.endkapitalNachSteuer;
  const endVergleichNominal = ergebnis.riesterAlt
    ? ergebnis.riesterAlt.endkapitalNachSteuer
    : ergebnis.depot.endkapitalNetto;
  const endDepot = showReal
    ? endVergleichNominal /
      deflatorFuer(formData.inflationPaJahr, ergebnis.jahreBisAuszahlung)
    : endVergleichNominal;

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6" data-pdf-root>
        {/* Kopf */}
        <div className="flex items-center justify-between" data-pdf-hide>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate(createPageUrl('Home'))}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Altersvorsorgedepot</h1>
              <p className="text-slate-600 mt-1">
                Geförderte Altersvorsorge ab Beitragsjahr {GESETZ.ERSTES_BEITRAGSJAHR} – Zulagen,
                Steuervorteil und Vergleich mit dem freien Depot
              </p>
            </div>
          </div>
          <Button onClick={openDialog} disabled={isExporting} className="bg-slate-800 hover:bg-slate-700 text-white">
            <FileDown className="w-4 h-4 mr-2" />
            {isExporting ? 'Exportiere…' : 'PDF'}
          </Button>
        </div>

        {/* Vergleichspartner – bestimmt, wogegen das AVD gerechnet wird */}
        <div data-pdf-section="vergleichspartner">
          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-4 md:p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Altersvorsorgedepot vergleichen mit
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {gegenRiester
                      ? 'Beide Seiten sind gefördert und werden in der Auszahlphase identisch besteuert – es entscheiden Förderhöhe, Kosten und Rendite.'
                      : 'Ungefördertes Depot mit Abgeltungsteuer, Teilfreistellung und Vorabpauschale.'}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0" data-pdf-hide>
                  <Button
                    variant={!gegenRiester ? 'default' : 'outline'}
                    className={!gegenRiester ? 'bg-slate-800 hover:bg-slate-700' : ''}
                    onClick={() => update('vergleichspartner', 'depot')}
                  >
                    Freies Depot
                  </Button>
                  <Button
                    variant={gegenRiester ? 'default' : 'outline'}
                    className={gegenRiester ? 'bg-slate-800 hover:bg-slate-700' : ''}
                    onClick={() => update('vergleichspartner', 'riester_alt')}
                  >
                    Alte Riester-Förderung
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Schritt 1: Förderberechtigung */}
        <div data-pdf-section="berechtigung">
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg font-bold text-slate-900">
                <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center">
                  <PiggyBank className="w-4 h-4 text-blue-600" />
                </div>
                1. Förderberechtigung und Person
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Förderberechtigung</Label>
                  <select
                    value={formData.berechtigung}
                    onChange={(e) => update('berechtigung', e.target.value as FormData['berechtigung'])}
                    className={selectClass}
                  >
                    <option value="unmittelbar">unmittelbar (§ 79 S. 1)</option>
                    <option value="mittelbar">mittelbar über Ehegatten</option>
                    <option value="keine">keine</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Geburtsjahr</Label>
                  <NumericInput value={formData.geburtsjahr} onChange={(v) => update('geburtsjahr', v)} className={inputClass} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Beitragsjahr Start</Label>
                  <NumericInput value={formData.beitragsjahrStart} onChange={(v) => update('beitragsjahrStart', v)} className={inputClass} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Kinder (Kindergeld)</Label>
                  <NumericInput value={formData.kinder} onChange={(v) => update('kinder', Math.max(0, Math.round(v)))} className={inputClass} />
                </div>
              </div>
              {formData.berechtigung === 'mittelbar' && (
                <div className="space-y-2 max-w-sm">
                  <Label className="text-sm font-medium text-slate-700">Eigenbeitrag des Ehegatten p.a. (€)</Label>
                  <NumericInput
                    value={formData.eigenbeitragEhegatteUnmittelbar ?? 0}
                    onChange={(v) => update('eigenbeitragEhegatteUnmittelbar', v)}
                    className={inputClass}
                  />
                  <p className="text-xs text-slate-400">
                    Die Zulage bemisst sich nach den Beiträgen des unmittelbar Berechtigten, gedeckelt bei {GESETZ.GZ_MAX_MITTELBAR} € (§ 84 S. 3, 4).
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Schritt 2: Beitrag und Förderung */}
        <div data-pdf-section="foerderung">
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-slate-900">2. Beitrag und Förderung</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Eigenbeitrag (€/Monat)</Label>
                  <NumericInput value={formData.eigenbeitragMonatlich} onChange={(v) => update('eigenbeitragMonatlich', v)} className={inputClass} />
                  <p className="text-xs text-slate-400">= {formatCurrency(jahresbeitrag)} pro Jahr</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">zu versteuerndes Einkommen (€)</Label>
                  <NumericInput value={formData.zvEJahr} onChange={(v) => update('zvEJahr', v)} className={inputClass} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Beitragsdynamik p.a. (%)</Label>
                  <NumericInput step={0.5} value={formData.beitragsdynamikPaJahr * 100} onChange={(v) => update('beitragsdynamikPaJahr', v / 100)} className={inputClass} />
                </div>
                <div className="space-y-2 flex flex-col justify-end">
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 px-3 py-2">
                    <span className="text-sm font-medium text-slate-700">Splitting</span>
                    <Switch checked={formData.splitting} onCheckedChange={(v) => update('splitting', v)} />
                  </div>
                </div>
              </div>

              {/* Förderkennzahlen */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500 mb-1">Zulagen p.a.</div>
                  <div className="text-xl font-bold text-slate-900">
                    {formatCurrency(ergebnis.jahre[0]?.zulage ?? 0)}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500 mb-1">Steuererstattung p.a.</div>
                  <div className="text-xl font-bold text-slate-900">
                    {formatCurrency(ergebnis.jahre[0]?.steuererstattung ?? 0)}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4 bg-green-50">
                  <div className="text-xs text-slate-500 mb-1">Förderquote</div>
                  <div className="text-xl font-bold text-green-700">
                    {pct(ergebnis.jahre[0]?.foerderquote ?? 0)}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500 mb-1">Netto-Aufwand p.a.</div>
                  <div className="text-xl font-bold text-slate-900">
                    {formatCurrency(ergebnis.jahre[0]?.nettoAufwand ?? 0)}
                  </div>
                </div>
              </div>

              {/* Grenzförderquoten-Kurve */}
              <div className="pt-2">
                <p className="text-sm font-semibold text-slate-900 mb-2">
                  Wie viel Förderung bringt der nächste Euro?
                </p>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={kurve} margin={{ top: 10, right: 20, left: 10, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="beitrag" tick={{ fontSize: 12 }} tickFormatter={(v) => `${v} €`} />
                      <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${Math.round(v * 100)} %`} />
                      <Tooltip
                        formatter={(value: unknown, name: unknown) => [
                          pct(Number(value || 0), 1),
                          String(name),
                        ]}
                        labelFormatter={(b: unknown) => `Jahresbeitrag ${b} €`}
                      />
                      <Legend />
                      <Area
                        type="stepAfter"
                        dataKey="grenzfoerderquote"
                        name="Grenzförderquote"
                        stroke="#2563eb"
                        fill="#2563eb"
                        fillOpacity={0.12}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey="foerderquote"
                        name="Förderquote gesamt"
                        stroke="#16a34a"
                        strokeWidth={3}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Knick bei {GESETZ.GZ_STUFE1_GRENZE} € (Grundzulage sinkt von 50 % auf 25 %)
                  {formData.kinder > 0 && `, volle Kinderzulage ab ${GESETZ.KZ_MAX_PRO_KIND} €`}
                  , ab {GESETZ.GEFOERDERTER_EIGENBEITRAG_MAX} € keine Grenzförderung mehr.
                </p>
              </div>

              {/* Hinweise */}
              {ergebnis.hinweise.length > 0 && (
                <div className="space-y-2 pt-2">
                  {ergebnis.hinweise.map((h, i) => (
                    <div
                      key={i}
                      className={`flex gap-2 rounded-xl border px-4 py-3 text-sm ${
                        h.art === 'fehler'
                          ? 'border-red-200 bg-red-50 text-red-800'
                          : h.art === 'warnung'
                            ? 'border-amber-200 bg-amber-50 text-amber-800'
                            : 'border-slate-200 bg-slate-50 text-slate-600'
                      }`}
                    >
                      {h.art === 'fehler' ? (
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      ) : h.art === 'warnung' ? (
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      ) : (
                        <Info className="w-4 h-4 shrink-0 mt-0.5" />
                      )}
                      <span>{h.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Schritt 3: Produkt und Vergleich */}
        <div data-pdf-section="vergleich">
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <CardTitle className="text-lg font-bold text-slate-900">
                  3. Vergleich mit{' '}
                  {gegenRiester ? 'dem Riester-Bestandsvertrag' : 'dem freien Depot'}
                </CardTitle>
                <div className="flex flex-wrap gap-2" data-pdf-hide>
                  <Button
                    variant={showReal ? 'default' : 'outline'}
                    className={showReal ? 'bg-slate-800 hover:bg-slate-700' : ''}
                    onClick={() => setShowReal((v) => !v)}
                  >
                    Real
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Rendite p.a. (%)</Label>
                  <NumericInput step={0.1} value={formData.renditeBruttoPaJahr * 100} onChange={(v) => update('renditeBruttoPaJahr', v / 100)} className={inputClass} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Effektivkosten AVD p.a. (%)</Label>
                  <NumericInput step={0.05} value={formData.effektivkostenPaJahr * 100} onChange={(v) => update('effektivkostenPaJahr', v / 100)} className={inputClass} />
                </div>
                {gegenRiester ? (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Kosten Altvertrag p.a. (%)</Label>
                    <NumericInput
                      step={0.05}
                      value={(riester?.effektivkostenPaJahr ?? 0.02) * 100}
                      onChange={(v) => updateRiester('effektivkostenPaJahr', v / 100)}
                      className={inputClass}
                    />
                    <p className="text-xs text-slate-400">Versicherungsmantel typisch 1,5–2,5 %</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Kosten freies Depot p.a. (%)</Label>
                    <NumericInput step={0.05} value={formData.depotKostenPaJahr * 100} onChange={(v) => update('depotKostenPaJahr', v / 100)} className={inputClass} />
                  </div>
                )}
                {gegenRiester ? (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Rendite Altvertrag p.a. (%)</Label>
                    <NumericInput
                      step={0.1}
                      value={(riester?.renditeBruttoPaJahr ?? 0.03) * 100}
                      onChange={(v) => updateRiester('renditeBruttoPaJahr', v / 100)}
                      className={inputClass}
                    />
                    <p className="text-xs text-slate-400">Beitragsgarantie begrenzt die Aktienquote</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Vergleichsbasis</Label>
                    <select
                      value={formData.vergleichsmodus}
                      onChange={(e) => update('vergleichsmodus', e.target.value as FormData['vergleichsmodus'])}
                      className={selectClass}
                    >
                      <option value="gleicher_nettoaufwand">gleicher Netto-Aufwand</option>
                      <option value="gleicher_bruttobeitrag">gleicher Bruttobeitrag</option>
                    </select>
                  </div>
                )}
              </div>

              {gegenRiester && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">Beitragspfl. Einnahmen Vorjahr (€)</Label>
                      <NumericInput
                        value={riester?.beitragspflEinnahmenVorjahr ?? 0}
                        onChange={(v) => updateRiester('beitragspflEinnahmenVorjahr', v)}
                        className={inputClass}
                      />
                      <p className="text-xs text-slate-400">Basis des Mindesteigenbeitrags (4 %, § 86 a.F.)</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-slate-700">davon Kinder vor 2008</Label>
                      <NumericInput
                        value={riester?.kinderGeborenVor2008 ?? 0}
                        onChange={(v) =>
                          updateRiester(
                            'kinderGeborenVor2008',
                            Math.max(0, Math.min(Math.round(v), formData.kinder))
                          )
                        }
                        className={inputClass}
                      />
                      <p className="text-xs text-slate-400">Nur 185 € statt 300 € Zulage</p>
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 p-4">
                    <div className="text-xs text-slate-500">Förderung im ersten Jahr</div>
                    <div className="text-sm text-slate-900 mt-1">
                      Alte Riester-Zulage{' '}
                      <span className="font-semibold">
                        {formatCurrency(ergebnis.riesterAlt?.zulageJahr1 ?? 0)}
                      </span>
                      {ergebnis.riesterAlt?.gekuerztJahr1 && (
                        <span className="text-amber-700">
                          {' '}– anteilig gekürzt, Mindesteigenbeitrag{' '}
                          {formatCurrency(ergebnis.riesterAlt.mindesteigenbeitragJahr1)}
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-slate-900 mt-1">
                      Neue Förderung{' '}
                      <span className="font-semibold">
                        {formatCurrency(ergebnis.jahre[0]?.zulage ?? 0)}
                      </span>{' '}
                      Zulage
                      {(ergebnis.jahre[0]?.steuererstattung ?? 0) > 0 &&
                        ` + ${formatCurrency(ergebnis.jahre[0].steuererstattung)} Erstattung`}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500 mb-1">
                    AVD nach Steuern{showReal ? ' (real)' : ''}
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{formatCurrency(endAvd)}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    brutto {formatCurrency(showReal ? ergebnis.endkapitalReal : ergebnis.endkapitalNominal)}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500 mb-1">
                    {vergleichName} nach Steuern{showReal ? ' (real)' : ''}
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{formatCurrency(endDepot)}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    {ergebnis.riesterAlt
                      ? `Förderung gesamt ${formatCurrency(ergebnis.riesterAlt.summeFoerderung)}`
                      : `inkl. Vorabpauschale ${formatCurrency(ergebnis.depot.summeVorabpauschaleSteuer)}`}
                  </div>
                </div>
                <div className={`rounded-xl border p-4 ${ergebnis.vorteilGegenVergleich >= 0 ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                  <div className="text-xs text-slate-500 mb-1">Vorteil AVD</div>
                  <div className={`text-2xl font-bold ${ergebnis.vorteilGegenVergleich >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(showReal ? endAvd - endDepot : ergebnis.vorteilGegenVergleich)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Förderung gesamt {formatCurrency(ergebnis.summeFoerderung)}
                  </div>
                </div>
              </div>

              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={verlaufsdaten} margin={{ top: 10, right: 20, left: 10, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="jahr" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={formatChartAxis} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(value: unknown, name: unknown) => [formatCurrency(Number(value || 0)), String(name)]}
                      labelFormatter={(jahr: unknown) => {
                        const p = verlaufsdaten.find((x) => x.jahr === Number(jahr));
                        return p ? `${jahr} (Alter ${p.alter})` : `${jahr}`;
                      }}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="avd" name="Altersvorsorgedepot" stroke="#2563eb" strokeWidth={3} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="depot" name={vergleichName} stroke="#16a34a" strokeWidth={3} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="eingezahlt" name="Eigenbeiträge" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-slate-500">
                {gegenRiester
                  ? 'Beide Seiten nach Steuern. Steuerlich sind AVD und Riester-Altvertrag identisch: in der Ansparphase steuerfrei, in der Auszahlphase voll nachgelagert besteuert (§ 22 Nr. 5 EStG), beide ohne Teilfreistellung. Der Unterschied entsteht allein aus Förderhöhe, Kosten und Renditepotenzial – bereits gezahlte Zulagen und Steuervorteile bleiben beim Wechsel erhalten (§ 3 Nr. 55c EStG).'
                  : 'Beide Seiten nach Steuern: Das AVD wird nachgelagert voll besteuert (§ 22 Nr. 5 EStG, keine Teilfreistellung), das freie Depot mit Abgeltungsteuer, 30 % Teilfreistellung und jährlicher Vorabpauschale. Kein Sparerpauschbetrag angesetzt (kann anderweitig verbraucht sein).'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Schritt 4: Auszahlphase */}
        <div data-pdf-section="auszahlung">
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-slate-900">4. Auszahlphase</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Auszahlform</Label>
                  <select
                    value={formData.auszahlform}
                    onChange={(e) => update('auszahlform', e.target.value as FormData['auszahlform'])}
                    className={selectClass}
                  >
                    <option value="auszahlplan">Auszahlungsplan</option>
                    <option value="leibrente">lebenslange Leibrente</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Beginn (Alter {GESETZ.AUSZAHLUNG_ALTER_MIN}–{GESETZ.AUSZAHLUNG_ALTER_MAX})</Label>
                  <NumericInput value={formData.auszahlungsbeginnAlter} onChange={(v) => update('auszahlungsbeginnAlter', v)} className={inputClass} />
                </div>
                {formData.auszahlform === 'auszahlplan' ? (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Planende (Alter ≥ {GESETZ.AUSZAHLPLAN_ENDALTER_MIN})</Label>
                    <NumericInput value={formData.auszahlplanEndalter} onChange={(v) => update('auszahlplanEndalter', v)} className={inputClass} />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Rentenfaktor je 10.000 €</Label>
                    <NumericInput step={0.5} value={formData.rentenfaktorProZehntausend} onChange={(v) => update('rentenfaktorProZehntausend', v)} className={inputClass} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Teilkapital (max. 30 %)</Label>
                  <NumericInput step={5} value={formData.teilkapitalAnteil * 100} onChange={(v) => update('teilkapitalAnteil', Math.min(0.3, Math.max(0, v / 100)))} className={inputClass} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Steuersatz im Alter (%)</Label>
                  <NumericInput value={formData.steuersatzImAlter * 100} onChange={(v) => update('steuersatzImAlter', v / 100)} className={inputClass} />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Krankenversicherung im Alter</Label>
                  <select
                    value={formData.kvStatusImAlter}
                    onChange={(e) => update('kvStatusImAlter', e.target.value as FormData['kvStatusImAlter'])}
                    className={selectClass}
                  >
                    <option value="pflicht">pflichtversichert (KVdR)</option>
                    <option value="freiwillig">freiwillig gesetzlich</option>
                    <option value="privat">privat versichert</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500 mb-1">Monatsrente brutto</div>
                  <div className="text-2xl font-bold text-slate-900">
                    {formatCurrency(ergebnis.auszahlung.monatsrenteBrutto)}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500 mb-1">Monatsrente netto</div>
                  <div className="text-2xl font-bold text-slate-900">
                    {formatCurrency(ergebnis.auszahlung.monatsrenteNetto)}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    Steuer {formatCurrency(ergebnis.auszahlung.steuerProMonat)}
                    {ergebnis.auszahlung.kvBeitrag > 0 && ` · KV/PV ${formatCurrency(ergebnis.auszahlung.kvBeitrag)}`}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <div className="text-xs text-slate-500 mb-1">
                    {formData.teilkapitalAnteil > 0 ? 'Teilkapital zu Beginn' : 'Vergleich: Depot-Entnahme'}
                  </div>
                  <div className="text-2xl font-bold text-slate-900">
                    {formatCurrency(
                      formData.teilkapitalAnteil > 0
                        ? ergebnis.auszahlung.teilkapital
                        : ergebnis.depot.monatsentnahmeVergleich
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {formData.teilkapitalAnteil > 0
                      ? `davon Steuer ${formatCurrency(ergebnis.auszahlung.teilkapitalSteuer)}`
                      : 'monatlich bis zum gleichen Endalter'}
                  </div>
                </div>
              </div>

              {ergebnis.auszahlung.gesetzlicheMindestrate != null && (
                <p className="text-xs text-slate-500 flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                  Gesetzliche Mindestrate zu Beginn:{' '}
                  {formatCurrency(ergebnis.auszahlung.gesetzlicheMindestrate)} pro Monat
                  (80 % des Restkapitals verteilt auf die Restlaufzeit, § 1 Abs. 1 Nr. 4b AltZertG).
                </p>
              )}
              {ergebnis.auszahlung.kleinbetragsrenteMoeglich && (
                <p className="text-xs text-amber-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  Die Rente liegt unter der Kleinbetragsgrenze von{' '}
                  {formatCurrency(GESETZ.BEZUGSGROESSE_MONAT_2026 * GESETZ.KLEINBETRAGSRENTE_ANTEIL_BEZUGSGROESSE)} –
                  eine Abfindung wäre förderunschädlich, aber voll steuerpflichtig im Zuflussjahr.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Rechtsstand */}
        <Card className="border-0 shadow-lg bg-white">
          <CardContent className="p-6 space-y-2">
            <p className="text-xs text-slate-500">
              Rechtsstand: Altersvorsorgereformgesetz, BGBl. 2026 I Nr. 156 v. 29.05.2026;
              Förderregeln anwendbar ab Beitragsjahr {GESETZ.ERSTES_BEITRAGSJAHR}. Einkommensteuertarif
              2026 nach § 32a EStG.
            </p>
            <p className="text-xs text-slate-500">
              Modellannahmen und offene Punkte: Die Kinderzulage wird je Kind unabhängig auf den
              Eigenbeitrag bemessen (Wortlaut § 85 Abs. 1 S. 1), die Kinderzulage erhöht das
              Sonderausgaben-Volumen (§ 10a Abs. 1 S. 1), der ungeförderte Vertragsteil wird mit dem
              Ertragsanteil besteuert. Diese Punkte stehen unter dem Vorbehalt des
              BMF-Anwendungsschreibens. Zulagen fließen mit einem Jahr Verzögerung zu.
              Keine Rechts-, Steuer- oder Anlageberatung.
            </p>
            {hatFehler && (
              <p className="text-xs text-red-700 font-medium">
                Die Eingaben verletzen mindestens eine gesetzliche Grenze – die Ergebnisse sind
                insoweit nicht belastbar.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {dialogOpen && (
        <PDFSectionDialog
          sections={[
            { id: 'vergleichspartner', label: 'Vergleichspartner' },
            { id: 'berechtigung', label: 'Förderberechtigung' },
            { id: 'foerderung', label: 'Beitrag und Förderung' },
            { id: 'vergleich', label: 'Vergleich freies Depot' },
            { id: 'auszahlung', label: 'Auszahlphase' },
          ]}
          isExporting={isExporting}
          onExport={(ids) => doExport(ids, 'altersvorsorgedepot', 'Altersvorsorgedepot')}
          onClose={closeDialog}
        />
      )}
    </div>
  );
}
