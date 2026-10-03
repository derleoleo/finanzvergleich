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
import {
  berechneStrategien,
  type ZweitvertragArt,
} from '@/lib/finance/avd/strategien';
import { besteOption, zillmerungsverlust } from '@/lib/finance/avd/optionen';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NumericInput } from '@/components/ui/numeric-input';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AvdCalculation } from '@/entities/AvdCalculation';
import { modellStempel, type ModellStempel } from '@/lib/finance/modell';
import GespeicherteAuswertung, {
  type GespeicherteKennzahl,
} from '@/components/results/GespeicherteAuswertung';
import { speicherFehlerText } from '@/utils/speicherFehler';
import { Switch } from '@/components/ui/switch';
import { SegmentedToggle } from '@/components/ui/segmented-toggle';
import { formatCurrency, formatChartAxis } from '@/components/shared/CurrencyDisplay';
import Vorsorgewaage from '@/components/results/Vorsorgewaage';
import { usePDFExport } from '@/utils/usePDFExport';
import PDFSectionDialog from '@/components/pdf/PDFSectionDialog';
import {
  PiggyBank, FileDown, ArrowLeft, AlertTriangle, Info, CheckCircle2, Save,
} from 'lucide-react';
import {
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const DRAFT_KEY = 'fv_avd_draft_v1';
const inputClass = 'bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white';
const selectClass = `${inputClass} w-full rounded-md border px-3 py-2 text-sm`;

type FormData = Omit<AvdEingabe, 'flags'> & {
  /**
   * Kombinationsstrategie: monatlicher Betrag in den AVD.
   * undefined heißt „dem berechneten Vorschlag folgen" – ein gespiegelter
   * Wert würde beim nächsten Kinder- oder Einkommenswechsel still veralten.
   */
  aufteilungMonatlich?: number;
  /** Wohin der Betrag oberhalb des Aufteilungspunkts fließt. */
  zweitvertrag: ZweitvertragArt;
};

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
    bestandsvertrag: {
      aktuellerVertragswert: 0,
      summeBeitraegeUndZulagenBisher: 0,
      garantiertesKapitalZuRentenbeginn: 0,
      wechselgebuehr: 150,
      ruhendStellenKostenProJahr: 0,
      fruehesterZugriffAlter: 62,
    },
    fondsLv: {
      // Startet mit derselben Rendite wie das AVD – so ist der Unterschied
      // zunächst rein kosten- und steuergetrieben.
      renditeBruttoPaJahr: d.assumed_annual_return / 100,
      terPaJahr: d.lv_fund_ongoing_costs_percent / 100,
      kostenart: d.lv_cost_type === 'percent' ? 'prozent' : 'eur',
      abschlusskostenGesamt: d.life_insurance_acquisition_costs_eur,
      verwaltungProMonat: d.lv_admin_costs_monthly_eur,
      effektivkostenPaJahr: d.lv_effective_costs_percent / 100,
    },
    vergleichsmodus: 'gleicher_nettoaufwand',
    sparerpauschbetrag: ANNAHMEN.SPARERPAUSCHBETRAG,
    zweitvertrag: 'depot',
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

  // Speichern (Audit F14): ohne ?id= neu anlegen, mit ?id= aktualisieren
  const [name, setName] = useState(
    () => `Altersvorsorgedepot ${new Date().toLocaleDateString('de-DE')}`
  );
  const [gespeicherteId, setGespeicherteId] = useState<string | null>(null);
  const [speichertGerade, setSpeichertGerade] = useState(false);
  const [speicherHinweis, setSpeicherHinweis] = useState<string | null>(null);
  // Audit N03: Bisher wurden beim Öffnen nur die Eingaben geladen und alles neu
  // gerechnet. Die damals gezeigten Zahlen lagen gespeichert vor, waren aber
  // nicht sichtbar – ein Modellwechsel blieb damit unbemerkt.
  const [gespeicherteErgebnisse, setGespeicherteErgebnisse] =
    useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('id');
    if (!id) return;
    AvdCalculation.get(id).then((eintrag) => {
      if (!eintrag) return;
      setFormData((prev) => ({ ...prev, ...(eintrag.form as Partial<FormData>) }));
      setName(eintrag.name);
      setGespeicherteId(eintrag.id);
      setGespeicherteErgebnisse((eintrag.results ?? null) as Record<string, unknown> | null);
    });
  }, []);
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

  // Wechselanalyse wird in den Voreinstellungen freigeschaltet
  const optionenAktiv = useMemo(
    () => UserDefaults.load().handlungsoptionen_enabled,
    []
  );

  const ergebnis = useMemo(
    () =>
      simuliereAvd({
        ...formData,
        bestandsvertrag: optionenAktiv ? formData.bestandsvertrag : undefined,
        flags: RECHTS_FLAGS_DEFAULT,
      }),
    [formData, optionenAktiv]
  );

  const strategien = useMemo(
    () =>
      berechneStrategien({
        basis: { ...formData, bestandsvertrag: undefined, flags: RECHTS_FLAGS_DEFAULT },
        aufteilungMonatlich: formData.aufteilungMonatlich,
        zweitvertrag: formData.zweitvertrag,
      }),
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
  const bestand = formData.bestandsvertrag;
  const optionen = ergebnis.handlungsoptionen;
  const updateBestand = <K extends keyof NonNullable<FormData['bestandsvertrag']>>(
    field: K,
    value: NonNullable<FormData['bestandsvertrag']>[K]
  ) => {
    const aktuell = formData.bestandsvertrag ?? {
      aktuellerVertragswert: 0,
      summeBeitraegeUndZulagenBisher: 0,
      garantiertesKapitalZuRentenbeginn: 0,
      wechselgebuehr: 150,
      ruhendStellenKostenProJahr: 0,
      fruehesterZugriffAlter: 62,
    };
    update('bestandsvertrag', { ...aktuell, [field]: value });
  };
  const riester = formData.riester;
  const fondsLv = formData.fondsLv;
  const gegenFondsLv = formData.vergleichspartner === 'fonds_lv';

  const updateLv = <K extends keyof NonNullable<FormData['fondsLv']>>(
    field: K,
    value: NonNullable<FormData['fondsLv']>[K]
  ) => {
    const aktuell = formData.fondsLv ?? {
      renditeBruttoPaJahr: 0.07,
      terPaJahr: 0.003,
      kostenart: 'eur' as const,
      abschlusskostenGesamt: 2000,
      verwaltungProMonat: 6,
      effektivkostenPaJahr: 0.007,
    };
    update('fondsLv', { ...aktuell, [field]: value });
  };

  // Ein Ort für die Bezeichnungen des Vergleichspartners – vorher standen sie
  // als Ja/Nein-Abfragen an sechs Stellen und wären beim dritten Partner
  // einzeln auseinandergelaufen.
  const VERGLEICH_META = {
    depot: {
      name: 'Freies Depot',
      imSatz: 'dem freien Depot',
      titel: 'dem freien Depot',
    },
    riester_alt: {
      name: 'Riester-Bestandsvertrag',
      imSatz: 'dem Riester-Bestandsvertrag',
      titel: 'dem Riester-Bestandsvertrag',
    },
    fonds_lv: {
      name: 'Fondspolice',
      imSatz: 'der Fondspolice',
      titel: 'der fondsgebundenen Lebensversicherung',
    },
  } as const;
  const meta = VERGLEICH_META[formData.vergleichspartner ?? 'depot'];
  const vergleichName = meta.name;

  const verlaufsdaten = ergebnis.jahre.map((j, i) => ({
    jahr: j.jahr,
    alter: j.alter,
    avd: Math.round(showReal ? j.kapitalGesamtReal : j.kapitalGesamt),
    depot: Math.round(
      (() => {
        const nominal =
          ergebnis.riesterAlt?.kapitalProJahr[i] ??
          ergebnis.fondsLv?.kapitalProJahr[i] ??
          j.depotKapital;
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
    : ergebnis.fondsLv
      ? ergebnis.fondsLv.endkapitalNachSteuer
      : ergebnis.depot.endkapitalNetto;
  const endDepot = showReal
    ? endVergleichNominal /
      deflatorFuer(formData.inflationPaJahr, ergebnis.jahreBisAuszahlung)
    : endVergleichNominal;

  // Audit N03: gespeicherte Kennzahlen gegen die heutige Rechnung stellen.
  // Verglichen wird nominal, damit der Real-Schalter keinen Unterschied
  // vortäuscht, den es nicht gibt.
  const gespeicherteKennzahlen = useMemo<GespeicherteKennzahl[]>(() => {
    if (!gespeicherteErgebnisse) return [];
    const g = gespeicherteErgebnisse;
    const zahl = (v: unknown) => (typeof v === 'number' ? v : undefined);
    const eintraege: GespeicherteKennzahl[] = [];
    const avd = zahl(g.endkapital_nach_steuer);
    if (avd !== undefined)
      eintraege.push({
        label: 'Altersvorsorgedepot nach Steuern',
        gespeichert: avd,
        aktuell: Math.round(ergebnis.endkapitalNachSteuer),
      });
    const vergleich = zahl(g.vergleich_nach_steuer);
    if (vergleich !== undefined)
      eintraege.push({
        label: `${typeof g.vergleich_name === 'string' ? g.vergleich_name : 'Vergleich'} nach Steuern`,
        gespeichert: vergleich,
        aktuell: Math.round(endVergleichNominal),
      });
    const foerderung = zahl(g.summe_foerderung);
    if (foerderung !== undefined)
      eintraege.push({
        label: 'Summe Förderung',
        gespeichert: foerderung,
        aktuell: Math.round(ergebnis.summeFoerderung),
      });
    return eintraege;
  }, [gespeicherteErgebnisse, ergebnis, endVergleichNominal]);

  const speichern = async () => {
    setSpeichertGerade(true);
    setSpeicherHinweis(null);
    try {
      const nutzlast = {
        name: name.trim() || 'Altersvorsorgedepot',
        form: formData as unknown as Record<string, unknown>,
        // Gespeichert werden immer die nominalen Werte. Vorher hing es am
        // Real-Schalter, ob in der Übersicht kaufkraftbereinigte Zahlen unter
        // demselben Feldnamen landeten.
        results: {
          endkapital_nach_steuer: Math.round(ergebnis.endkapitalNachSteuer),
          vergleich_nach_steuer: Math.round(endVergleichNominal),
          vergleich_name: vergleichName,
          summe_foerderung: Math.round(ergebnis.summeFoerderung),
          kombination_nach_steuer: strategien.kombinationEntfaellt
            ? null
            : Math.round(strategien.strategien[2].endkapitalNachSteuer),
          aufteilung_monatlich: strategien.aufteilungMonatlich,
          zweitvertrag: formData.zweitvertrag,
          ...modellStempel(),
        },
      };
      if (gespeicherteId) {
        await AvdCalculation.update(gespeicherteId, nutzlast);
        setSpeicherHinweis('Gespeichert.');
      } else {
        const neu = await AvdCalculation.create(nutzlast);
        setGespeicherteId(neu.id);
        window.history.replaceState(null, '', `?id=${neu.id}`);
        setSpeicherHinweis('Gespeichert – jetzt unter „Alle Ergebnisse“ zu finden.');
      }
      setGespeicherteErgebnisse(nutzlast.results as Record<string, unknown>);
    } catch (e) {
      console.error(e);
      setSpeicherHinweis(speicherFehlerText(e));
    }
    setSpeichertGerade(false);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div id="pdf-content" className="max-w-5xl mx-auto space-y-6" data-pdf-root>
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
          <div className="flex items-center gap-2">
            <Button onClick={speichern} disabled={speichertGerade} variant="outline">
              <Save className="w-4 h-4 mr-2" />
              {speichertGerade ? 'Speichere…' : gespeicherteId ? 'Aktualisieren' : 'Speichern'}
            </Button>
            <Button onClick={openDialog} disabled={isExporting} className="bg-slate-800 hover:bg-slate-700 text-white">
              <FileDown className="w-4 h-4 mr-2" />
              {isExporting ? 'Exportiere…' : 'PDF'}
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3" data-pdf-hide>
          <Label htmlFor="avd-name" className="text-sm font-medium text-slate-700 shrink-0">
            Name der Berechnung
          </Label>
          <Input
            id="avd-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Bitte keine Klarnamen"
            className={`${inputClass} sm:max-w-md`}
          />
          {speicherHinweis && <span className="text-sm text-slate-600">{speicherHinweis}</span>}
        </div>

        {/* Gespeicherter Stand (Audit N03) */}
        {gespeicherteKennzahlen.length > 0 && (
          <GespeicherteAuswertung
            stempel={gespeicherteErgebnisse as Partial<ModellStempel>}
            kennzahlen={gespeicherteKennzahlen}
          />
        )}

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
                      : gegenFondsLv
                        ? 'Ungeförderter Versicherungsmantel: Ab zwölf Jahren Laufzeit und Auszahlung ab Alter 62 werden nur 42,5 % der Erträge zum persönlichen Satz besteuert.'
                        : 'Ungefördertes Depot mit Abgeltungsteuer, Teilfreistellung und Vorabpauschale.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0" data-pdf-hide>
                  {(
                    [
                      ['depot', 'Freies Depot'],
                      ['fonds_lv', 'Fondspolice'],
                      ['riester_alt', 'Alte Riester-Förderung'],
                    ] as const
                  ).map(([wert, beschriftung]) => {
                    const aktiv = (formData.vergleichspartner ?? 'depot') === wert;
                    return (
                      <Button
                        key={wert}
                        variant={aktiv ? 'default' : 'outline'}
                        className={aktiv ? 'bg-slate-800 hover:bg-slate-700' : ''}
                        onClick={() => update('vergleichspartner', wert)}
                      >
                        {beschriftung}
                      </Button>
                    );
                  })}
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
                  3. Vergleich mit {meta.titel}
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
                {gegenFondsLv ? (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Rendite Police p.a. (%)</Label>
                    <NumericInput
                      step={0.1}
                      value={(fondsLv?.renditeBruttoPaJahr ?? 0.07) * 100}
                      onChange={(v) => updateLv('renditeBruttoPaJahr', v / 100)}
                      className={inputClass}
                    />
                    <p className="text-xs text-slate-400">Fondsauswahl im Versicherungsmantel</p>
                  </div>
                ) : gegenRiester ? (
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
                {gegenFondsLv ? (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Fondskosten TER p.a. (%)</Label>
                    <NumericInput
                      step={0.05}
                      value={(fondsLv?.terPaJahr ?? 0.003) * 100}
                      onChange={(v) => updateLv('terPaJahr', v / 100)}
                      className={inputClass}
                    />
                    <p className="text-xs text-slate-400">läuft zusätzlich zu den Vertragskosten</p>
                  </div>
                ) : gegenRiester ? (
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

              {gegenFondsLv && (
                <div className="rounded-xl border border-slate-200 p-4 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Kosten der Police</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Aus einem Angebot übernehmen oder als Effektivkosten angeben
                      </p>
                    </div>
                    <SegmentedToggle
                      value={fondsLv?.kostenart ?? 'eur'}
                      onChange={(v) => updateLv('kostenart', v)}
                      ariaLabel="Kostenart der Police"
                      options={[
                        { value: 'eur', label: 'Tatsächliche Kosten (€)' },
                        { value: 'prozent', label: 'Effektivkosten (%)' },
                      ]}
                    />
                  </div>
                  {(fondsLv?.kostenart ?? 'eur') === 'eur' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">
                          Abschluss- und Vertriebskosten gesamt (€)
                        </Label>
                        <NumericInput
                          step={100}
                          value={fondsLv?.abschlusskostenGesamt ?? 0}
                          onChange={(v) => updateLv('abschlusskostenGesamt', v)}
                          className={inputClass}
                        />
                        <p className="text-xs text-slate-400">
                          über die ersten 60 Monate gezillmert
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">
                          Verwaltungskosten (€ pro Monat)
                        </Label>
                        <NumericInput
                          step={1}
                          value={fondsLv?.verwaltungProMonat ?? 0}
                          onChange={(v) => updateLv('verwaltungProMonat', v)}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700">
                          Effektivkosten p.a. (%)
                        </Label>
                        <NumericInput
                          step={0.05}
                          value={(fondsLv?.effektivkostenPaJahr ?? 0.007) * 100}
                          onChange={(v) => updateLv('effektivkostenPaJahr', v / 100)}
                          className={inputClass}
                        />
                        <p className="text-xs text-slate-400">
                          wirkt als Renditeminderung, ohne Fondskosten
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

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

              <Vorsorgewaage
                basis={`Altersvorsorgedepot vs. ${vergleichName} · nach Steuern${showReal ? ' · real (inflationsbereinigt)' : ''}`}
                links={{
                  name: 'Altersvorsorgedepot',
                  imSatz: 'dem Altersvorsorgedepot',
                  wert: endAvd,
                  detail: `brutto ${formatCurrency(showReal ? ergebnis.endkapitalReal : ergebnis.endkapitalNominal)} · Förderung gesamt ${formatCurrency(ergebnis.summeFoerderung)}`,
                }}
                rechts={{
                  name: vergleichName,
                  imSatz: gegenRiester ? 'dem Riester-Bestandsvertrag' : 'dem freien Depot',
                  wert: endDepot,
                  detail: ergebnis.riesterAlt
                    ? `Förderung gesamt ${formatCurrency(ergebnis.riesterAlt.summeFoerderung)}`
                    : `inkl. Vorabpauschale ${formatCurrency(ergebnis.depot.summeVorabpauschaleSteuer)}`,
                }}
              />

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
                    <Line type="monotone" dataKey="avd" name="Altersvorsorgedepot (vor Steuern)" stroke="#2563eb" strokeWidth={3} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="depot" name={`${vergleichName} (vor Steuern)`} stroke="#16a34a" strokeWidth={3} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="eingezahlt" name="Eigenbeiträge" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-slate-500">
                <strong>Die Kurven zeigen das laufende Kapital vor der abschließenden
                Besteuerung</strong> – Waage und Kacheln oben stehen dagegen nach Steuern. Der
                Abstand am rechten Rand ist deshalb größer als der Unterschied nach Steuern.{' '}
                {gegenRiester
                  ? 'Steuerlich sind AVD und Riester-Altvertrag identisch: in der Ansparphase steuerfrei, in der Auszahlphase voll nachgelagert besteuert (§ 22 Nr. 5 EStG), beide ohne Teilfreistellung. Der Unterschied entsteht allein aus Förderhöhe, Kosten und Renditepotenzial – bereits gezahlte Zulagen und Steuervorteile bleiben beim Wechsel erhalten (§ 3 Nr. 55c EStG).'
                  : gegenFondsLv
                    ? 'Besteuert wird danach das AVD nachgelagert voll (§ 22 Nr. 5 EStG, keine Teilfreistellung), die Fondspolice bei mindestens zwölf Jahren Laufzeit und Auszahlung ab Alter 62 mit 42,5 % der Erträge zum persönlichen Satz (§ 20 Abs. 1 Nr. 6 S. 2 EStG). Die Police wird hier zu Rentenbeginn vollständig besteuert; eine Verrentung über den Ertragsanteil wäre milder.'
                    : 'Besteuert wird danach das AVD nachgelagert voll (§ 22 Nr. 5 EStG, keine Teilfreistellung), das freie Depot mit Abgeltungsteuer, 30 % Teilfreistellung und jährlicher Vorabpauschale – in der Auszahlphase auf die realisierten Gewinne jeder Entnahme. Kein Sparerpauschbetrag angesetzt (kann anderweitig verbraucht sein).'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Kombinationsstrategie: geförderter Teil ins AVD, Rest daneben */}
        <div data-pdf-section="strategien">
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold text-slate-900">
                Aufteilen statt alles auf eine Karte
              </CardTitle>
              <p className="text-xs text-slate-500 mt-1">
                Die Förderung ist gestaffelt. Wer nur den hoch geförderten Teil in den
                Altersvorsorgedepot-Vertrag legt, bleibt mit dem Rest frei verfügbar.
              </p>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-pdf-hide>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    Monatlich ins Altersvorsorgedepot (€)
                  </Label>
                  <div className="flex gap-2">
                    <NumericInput
                      step={5}
                      value={strategien.aufteilungMonatlich}
                      onChange={(v) => update('aufteilungMonatlich', Math.max(0, v))}
                      className={inputClass}
                    />
                    {formData.aufteilungMonatlich !== undefined && (
                      <Button
                        variant="outline"
                        onClick={() => update('aufteilungMonatlich', undefined)}
                      >
                        Vorschlag
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-slate-400">
                    Zulagenknick bei{' '}
                    {formatCurrency(strategien.aufteilungspunkt.monatsbeitrag)} im Monat.{' '}
                    {strategien.aufteilungspunkt.begruendung} Der Punkt folgt allein der
                    Zulagenstaffel – Kosten, Laufzeit und spätere Besteuerung gehen nicht ein.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Rest anlegen in</Label>
                  <select
                    value={formData.zweitvertrag}
                    onChange={(e) => update('zweitvertrag', e.target.value as ZweitvertragArt)}
                    className={selectClass}
                  >
                    <option value="depot">Freies Depot</option>
                    <option value="fonds_lv">Fondspolice</option>
                  </select>
                  <p className="text-xs text-slate-400">
                    Kosten und Rendite stellen Sie in Abschnitt 3 ein.
                  </p>
                </div>
              </div>

              <div
                className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                data-pdf-single-col
              >
                {strategien.strategien.map((st) => {
                  const beste = st.id === strategien.beste;
                  const entfaellt = st.id === 'kombination' && strategien.kombinationEntfaellt;
                  return (
                    <div
                      key={st.id}
                      className={`rounded-xl border p-4 ${
                        beste && !entfaellt
                          ? 'border-green-200 bg-green-50'
                          : st.unzulaessig
                            ? 'border-amber-200 bg-amber-50/40'
                            : 'border-slate-200 bg-white'
                      }`}
                    >
                      <div className="text-xs font-semibold text-slate-500">
                        {st.bezeichnung}
                        {beste && !entfaellt && <span className="text-green-700 ml-1">★</span>}
                      </div>
                      {st.unzulaessig && (
                        <p className="text-xs text-amber-700 mt-1">{st.unzulaessig}</p>
                      )}
                      {entfaellt ? (
                        <p className="text-sm text-slate-500 mt-2">
                          Entfällt – der gesamte Beitrag liegt bereits im förderoptimalen
                          Bereich.
                        </p>
                      ) : (
                        <>
                          <div className="text-2xl font-bold text-slate-900 mt-1">
                            {formatCurrency(
                              showReal ? st.endkapitalNachSteuerReal : st.endkapitalNachSteuer
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            nach Steuern{showReal ? ' · real' : ''}
                          </div>
                          <div className="text-xs text-slate-600 mt-3">{st.aufteilungText}</div>
                          <div className="text-xs text-slate-500 mt-1">
                            Förderung gesamt {formatCurrency(st.summeFoerderung)}
                          </div>
                          <div className="text-xs text-slate-500">
                            Eigenaufwand {formatCurrency(st.summeNettoaufwand)}
                            {st.summeNettoaufwand < st.summeEigenbeitraege && (
                              <> (Beiträge {formatCurrency(st.summeEigenbeitraege)})</>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Die Waage vergleicht nur, was auch geht. Sind eine oder beide
                  Seiten gesetzlich ausgeschlossen, waere der Ausschlag eine
                  Aussage ueber eine Variante, die es nicht geben darf. */}
              {!strategien.kombinationEntfaellt &&
                !strategien.strategien[0].unzulaessig &&
                !strategien.strategien[2].unzulaessig && (
                <Vorsorgewaage
                  basis={`Alles ins Altersvorsorgedepot vs. Aufteilung · nach Steuern${
                    showReal ? ' · real (inflationsbereinigt)' : ''
                  }`}
                  links={{
                    name: 'Alles ins AVD',
                    imSatz: 'dem reinen Altersvorsorgedepot',
                    wert: showReal
                      ? strategien.strategien[0].endkapitalNachSteuerReal
                      : strategien.strategien[0].endkapitalNachSteuer,
                    detail: strategien.strategien[0].aufteilungText,
                  }}
                  rechts={{
                    name: 'Aufteilung',
                    imSatz: 'der Aufteilung',
                    wert: showReal
                      ? strategien.strategien[2].endkapitalNachSteuerReal
                      : strategien.strategien[2].endkapitalNachSteuer,
                    detail: strategien.strategien[2].aufteilungText,
                  }}
                />
              )}

              {strategien.hinweise.map((h, i) => (
                <p
                  key={i}
                  className={`text-xs flex items-start gap-2 ${
                    h.art === 'warnung' ? 'text-amber-700' : 'text-slate-500'
                  }`}
                >
                  <Info className="w-4 h-4 shrink-0 mt-0.5" />
                  {h.text}
                </p>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Wechselanalyse: vier Handlungsoptionen (per Voreinstellung freigeschaltet) */}
        {optionenAktiv && gegenRiester && (
          <div data-pdf-section="optionen">
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-bold text-slate-900">
                  Wechselanalyse: vier Handlungsoptionen
                </CardTitle>
                <p className="text-xs text-slate-500 mt-1">
                  Förderregime und Produktmantel sind unabhängig wählbar. Daraus ergeben
                  sich vier Wege – nicht nur „behalten oder wechseln".
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">
                      Aktueller Vertragswert (€)
                    </Label>
                    <NumericInput
                      value={bestand?.aktuellerVertragswert ?? 0}
                      onChange={(v) => updateBestand('aktuellerVertragswert', v)}
                      className={inputClass}
                    />
                    <p className="text-xs text-slate-400">
                      Übertragungswert laut Standmitteilung – bitte nicht schätzen
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">
                      Beiträge + Zulagen bisher (€)
                    </Label>
                    <NumericInput
                      value={bestand?.summeBeitraegeUndZulagenBisher ?? 0}
                      onChange={(v) => updateBestand('summeBeitraegeUndZulagenBisher', v)}
                      className={inputClass}
                    />
                    <p className="text-xs text-slate-400">
                      {zillmerungsverlust(
                        bestand ?? {
                          aktuellerVertragswert: 0,
                          summeBeitraegeUndZulagenBisher: 0,
                          garantiertesKapitalZuRentenbeginn: 0,
                          wechselgebuehr: 0,
                          ruhendStellenKostenProJahr: 0,
                          fruehesterZugriffAlter: 62,
                        }
                      ) > 0
                        ? `Zillmerungsverlust bereits eingetreten: ${formatCurrency(
                            zillmerungsverlust(bestand!)
                          )}`
                        : 'Für den Ausweis des bereits eingetretenen Verlusts'}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">
                      Garantiertes Kapital (€)
                    </Label>
                    <NumericInput
                      value={bestand?.garantiertesKapitalZuRentenbeginn ?? 0}
                      onChange={(v) => updateBestand('garantiertesKapitalZuRentenbeginn', v)}
                      className={inputClass}
                    />
                    <p className="text-xs text-slate-400">zu Rentenbeginn, laut Standmitteilung</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">
                      Frühester Zugriff (Alter)
                    </Label>
                    <NumericInput
                      value={bestand?.fruehesterZugriffAlter ?? 62}
                      onChange={(v) => updateBestand('fruehesterZugriffAlter', v)}
                      className={inputClass}
                    />
                    <p className="text-xs text-slate-400">60 bei Abschluss bis 2011, sonst 62</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Wechselgebühr (€)</Label>
                    <NumericInput
                      value={bestand?.wechselgebuehr ?? 150}
                      onChange={(v) => updateBestand('wechselgebuehr', v)}
                      className={inputClass}
                    />
                    <p className="text-xs text-slate-400">max. 150 € (§ 1 Abs. 1 S. 3 AltZertG)</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">
                      Kosten ruhender Vertrag (€/Jahr)
                    </Label>
                    <NumericInput
                      value={bestand?.ruhendStellenKostenProJahr ?? 0}
                      onChange={(v) => updateBestand('ruhendStellenKostenProJahr', v)}
                      className={inputClass}
                    />
                    <p className="text-xs text-slate-400">Stückkosten bei Beitragsfreistellung</p>
                  </div>
                </div>

                {optionen && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-2 pr-3 font-medium text-slate-500 text-xs">
                            &nbsp;
                          </th>
                          {optionen.map((o) => (
                            <th key={o.id} className="text-left py-2 px-3 min-w-[150px]">
                              <div className="font-bold text-slate-900">
                                {o.id}: {o.bezeichnung}
                              </div>
                              <div className="text-xs font-normal text-slate-500 mt-0.5">
                                {o.kurzbeschreibung}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-100">
                          <td className="py-2 pr-3 text-slate-500 text-xs">Förderregime</td>
                          {optionen.map((o) => (
                            <td key={o.id} className="py-2 px-3 text-slate-900">
                              {o.foerderregime === 'alt' ? 'alt (Riester)' : 'neu (ab 2027)'}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="py-2 pr-3 text-slate-500 text-xs">Förderung gesamt</td>
                          {optionen.map((o) => (
                            <td key={o.id} className="py-2 px-3 text-slate-900">
                              {formatCurrency(o.summeFoerderung)}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <td className="py-2 pr-3 text-slate-500 text-xs">
                            Endkapital nach Steuern
                          </td>
                          {optionen.map((o) => {
                            const beste = besteOption(optionen).id === o.id;
                            return (
                              <td
                                key={o.id}
                                className={`py-2 px-3 font-bold ${beste ? 'text-green-700' : 'text-slate-900'}`}
                              >
                                {formatCurrency(o.endkapitalNachSteuer)}
                                {beste && <span className="ml-1 text-xs font-normal">★</span>}
                              </td>
                            );
                          })}
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="py-2 pr-3 text-slate-500 text-xs">
                            garantiert mindestens
                          </td>
                          {optionen.map((o) => (
                            <td key={o.id} className="py-2 px-3 text-slate-900">
                              {o.garantiertMindestens > 0
                                ? formatCurrency(o.garantiertMindestens)
                                : '– keine Garantie'}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="py-2 pr-3 text-slate-500 text-xs">Einmalkosten</td>
                          {optionen.map((o) => (
                            <td key={o.id} className="py-2 px-3 text-slate-900">
                              {formatCurrency(o.einmalkosten)}
                            </td>
                          ))}
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="py-2 pr-3 text-slate-500 text-xs">frühester Zugriff</td>
                          {optionen.map((o) => (
                            <td key={o.id} className="py-2 px-3 text-slate-900">
                              mit {o.fruehesterZugriffAlter}
                            </td>
                          ))}
                        </tr>
                        <tr>
                          <td className="py-2 pr-3 text-slate-500 text-xs">umkehrbar?</td>
                          {optionen.map((o) => (
                            <td
                              key={o.id}
                              className={`py-2 px-3 font-medium ${o.umkehrbar ? 'text-slate-900' : 'text-amber-700'}`}
                            >
                              {o.umkehrbar ? 'ja' : 'nein'}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                <p className="text-xs text-slate-500">
                  Option B wird am häufigsten übersehen: Sie kostet nichts, lässt Produkt und
                  Garantien unangetastet und hebt trotzdem die Förderung. Der bereits
                  eingetretene Zillmerungsverlust ist gegenüber allen vier Optionen versunken
                  und damit kein Argument gegen einen Wechsel – was bei einer Übertragung
                  tatsächlich verloren geht, ist die Beitragsgarantie plus die Wechselgebühr.
                </p>
              </CardContent>
            </Card>
          </div>
        )}

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
                    {formData.teilkapitalAnteil > 0
                      ? 'Teilkapital zu Beginn'
                      : 'Freies Depot: Entnahme netto'}
                  </div>
                  <div className="text-2xl font-bold text-slate-900">
                    {formatCurrency(
                      formData.teilkapitalAnteil > 0
                        ? ergebnis.auszahlung.teilkapital
                        : ergebnis.depot.monatsentnahmeNetto
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {formData.teilkapitalAnteil > 0
                      ? `davon Steuer ${formatCurrency(ergebnis.auszahlung.teilkapitalSteuer)}`
                      : `brutto ${formatCurrency(ergebnis.depot.monatsentnahmeBrutto)} · monatlich bis zum gleichen Endalter`}
                  </div>
                </div>
              </div>

              {formData.teilkapitalAnteil === 0 && ergebnis.depot.monatsentnahmeNetto > 0 && (
                <p className="text-xs text-slate-500 flex items-start gap-2">
                  <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                  Beide Entnahmen sind nach Steuern und laufen bis zum gleichen Endalter. Das
                  Depot wird dafür nicht auf einmal verkauft, sondern entnommen: Jede Entnahme
                  realisiert anteilig Gewinn, darauf fallen Abgeltungsteuer und 30 %
                  Teilfreistellung an – über die gesamte Auszahlphase{' '}
                  {formatCurrency(ergebnis.depot.steuerAuszahlphase)}. Das Endkapital nach Steuern
                  oben unterstellt dagegen den vollständigen Verkauf zum Rentenbeginn.
                </p>
              )}
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
            ...(gespeicherteKennzahlen.length > 0
              ? [{ id: 'gespeichert', label: 'Gespeicherte Auswertung' }]
              : []),
            { id: 'vergleichspartner', label: 'Vergleichspartner' },
            { id: 'berechtigung', label: 'Förderberechtigung' },
            { id: 'foerderung', label: 'Beitrag und Förderung' },
            { id: 'vergleich', label: 'Vergleich & Vorsorgewaage' },
            { id: 'strategien', label: 'Aufteilung (30 + 1)' },
            ...(optionenAktiv && gegenRiester
              ? [{ id: 'optionen', label: 'Wechselanalyse (4 Optionen)' }]
              : []),
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
