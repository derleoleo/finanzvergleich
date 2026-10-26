import { useEffect, useMemo, useRef, useState } from "react";
import { speicherFehlerText } from "@/utils/speicherFehler";
import { useNavigate } from "react-router-dom";
import { createPageUrl, toNum } from "@/utils";
import { fassungFesthalten } from "@/utils/fassungSpeichern";
import { PensionGapCalculation } from "@/entities/PensionGapCalculation";
import { UserDefaults } from "@/entities/UserDefaults";
import { useSubscription } from "@/contexts/SubscriptionContext";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumericInput } from "@/components/ui/numeric-input";
import { Label } from "@/components/ui/label";
import { SegmentedToggle } from "@/components/ui/segmented-toggle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import {
  TrendingDown, TrendingUp, AlertCircle, Euro, User, Calendar, AlertTriangle,
} from "lucide-react";
import { looksLikeName } from "@/utils/nameDetection";

import { berechneRentenluecke } from "@/lib/finance/rentenluecke";
import { baueRentenlueckeReihen } from "@/lib/finance/rentenlueckeReihen";
import { modellStempel } from "@/lib/finance/modell";

const DRAFT_KEY = "fv_pensiongap_draft_v1";

type FormData = {
  name: string;
  birth_year: number;
  retirement_age: number;
  /** Bis zu welchem Alter das Kapital reichen soll (Audit F15). */
  withdrawal_end_age: number;
  desired_monthly_income: number;
  expected_statutory_pension: number;
  occupational_pension_bav: number;
  basis_rente: number;
  rental_income: number;
  existing_capital: number;
  assumed_annual_return: number;
  /** Geldwert der Einnahmen (Audit C04). */
  einnahmen_basis: 'heute' | 'rentenbeginn';
  /** Abzüge auf die gesetzliche Rente in Prozent: KV/PV und Steuer. */
  abzuege_gesetzliche_rente_percent: number;
};

function makeDefaults(): FormData {
  const d = UserDefaults.load();
  return {
    name: `Rentenlücke ${new Date().toLocaleDateString("de-DE")}`,
    birth_year: d.birth_year,
    retirement_age: d.retirement_age,
    withdrawal_end_age: 90,
    desired_monthly_income: d.desired_monthly_income,
    expected_statutory_pension: d.expected_statutory_pension,
    occupational_pension_bav: 0,
    basis_rente: 0,
    rental_income: 0,
    existing_capital: 20000,
    assumed_annual_return: d.assumed_annual_return,
    // Vorgabe wie bisher gerechnet - aber jetzt sichtbar und umschaltbar.
    einnahmen_basis: 'heute',
    abzuege_gesetzliche_rente_percent: 0,
  };
}

function loadDraft(): FormData | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return { ...makeDefaults(), ...JSON.parse(raw) };
  } catch {
    return null;
  }
}
function saveDraft(data: FormData) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(data)); } catch { /* ignore */ }
}

/**
 * Die wirksamen Eingaben: Formular plus die Teuerung aus den
 * Voreinstellungen. Letztere stand nirgends im gespeicherten Fall, obwohl sie
 * jede Zahl beeinflusst (Audit C08) - wer die Voreinstellung spaeter aenderte,
 * konnte die alte Annahme nicht mehr nachlesen.
 */
function wirksameEingaben(form: FormData) {
  const d = UserDefaults.load();
  return {
    ...form,
    withdrawal_end_age: form.withdrawal_end_age,
    inflation_percent: d.inflation_percent,
    einnahmen_basis: form.einnahmen_basis,
    abzuege_gesetzliche_rente_percent: form.abzuege_gesetzliche_rente_percent,
  };
}

function calculatePensionGapResults(form: FormData) {
  return berechneRentenluecke(wirksameEingaben(form));
}

export default function PensionGapCalculator() {
  const navigate = useNavigate();
  const defaults = useMemo(() => makeDefaults(), []);
  const [formData, setFormData] = useState<FormData>(() => loadDraft() ?? defaults);
  const { incrementCalculationCount } = useSubscription();
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveTimer = useRef<number | null>(null);
  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveDraft(formData), 250);
    return () => { if (saveTimer.current) window.clearTimeout(saveTimer.current); };
  }, [formData]);

  const update = (field: string, value: unknown) =>
    setFormData((prev) => ({ ...prev, [field]: value }));

  const currentYear = new Date().getFullYear();
  const currentAge = currentYear - toNum(formData.birth_year);
  const yearsToRetirement = Math.max(0, toNum(formData.retirement_age) - currentAge);
  /*
   * Die Vorschau kommt aus derselben Rechnung wie das Ergebnis.
   *
   * Vorher addierte die Seite die Einnahmen selbst und bildete die Differenz
   * von Hand. Mit der waehlbaren Konvention und den Abzuegen auf die
   * gesetzliche Rente (Audit C04) waere das eine zweite Wahrheit geworden:
   * Die Vorschau haette eine andere Luecke gezeigt als die Auswertung.
   */
  const vorschau = calculatePensionGapResults(formData);
  const totalMonthlyIncome = vorschau.einnahmen_monatlich;
  const monthlyGapPreview = vorschau.monthly_gap;

  const handleCalculate = async () => {
    setError(null);
    setIsCalculating(true);
    try {
      const results = { ...calculatePensionGapResults(formData), ...modellStempel() };
      const newCalc = await PensionGapCalculation.create({ ...formData, results });
      // Fassung festschreiben (Audit O08)
      const stand = await fassungFesthalten({
        fallTabelle: "pension_gap_calculations",
        fallId: newCalc.id,
        name: formData.name || "Rentenlücke",
        form: wirksameEingaben(formData) as unknown as Record<string, unknown>,
        results: results as unknown as Record<string, unknown>,
        // Audit O08: dieselbe Reihe, die die Detailseite zeichnet. Ist die
        // Lücke bereits gedeckt, gibt es keinen Sparplan und damit auch
        // keine Reihe - dann bleibt das Feld leer.
        reihen: baueRentenlueckeReihen(newCalc),
      });
      incrementCalculationCount();
      navigate(createPageUrl("PensionGapDetail") + `?id=${newCalc.id}`, {
        // Audit A02: Der Teilerfolg reist mit. Sonst sieht der Nutzer
        // auf der Auswertung eine Fassung, die es nicht gibt.
        state: stand.stand === "fehlt" ? { fassungFehlt: stand } : undefined,
      });
    } catch (e) {
      console.error(e);
      setError(speicherFehlerText(e));
    }
    setIsCalculating(false);
  };

  const inputClass = "bg-slate-50 border-slate-200 focus:border-blue-500 focus:bg-white";

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Rentenlücke</h1>
              <p className="text-slate-600 mt-1">Versorgungslücke berechnen und Sparbedarf ermitteln</p>
            </div>
          </div>
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Fehler</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="grid gap-8">
          {/* Persönliche Daten */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                Persönliche Daten
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">Name der Berechnung</Label>
                  <Input value={formData.name} onChange={(e) => update("name", e.target.value)}
                    placeholder="Bitte keine Klarnamen"
                    className={inputClass} />
                  {looksLikeName(formData.name) && (
                    <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      Möglicher Klarname erkannt – bitte Pseudonym verwenden
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    <div className="flex items-center gap-2"><User className="w-4 h-4" />Geburtsjahr</div>
                  </Label>
                  <NumericInput value={formData.birth_year}
                    onChange={(val) => update("birth_year", val)} className={inputClass} />
                  {currentAge > 0 && <div className="text-xs text-slate-500">Aktuelles Alter (ca.): {currentAge}</div>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4" />Renteneintrittsalter</div>
                  </Label>
                  <NumericInput value={formData.retirement_age}
                    onChange={(val) => update("retirement_age", val)} className={inputClass} />
                  {yearsToRetirement > 0 ? (
                    <div className="text-xs text-slate-500">Noch {yearsToRetirement} Jahre bis zur Rente</div>
                  ) : (
                    <div className="text-xs text-amber-600">
                      Rentenbeginn erreicht – eine Sparrate lässt sich nicht mehr berechnen,
                      der Kapitalbedarf wird trotzdem ausgewiesen.
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4" />Kapital soll reichen bis Alter</div>
                  </Label>
                  <NumericInput value={formData.withdrawal_end_age}
                    onChange={(val) => update("withdrawal_end_age", val)} className={inputClass} />
                  <div className="text-xs text-slate-500">
                    Planungshorizont der Entnahme; Vorgabe 90 Jahre.
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-green-600 rounded-full" />
                      </div>
                      Angenommene Rendite auf Ersparnisse (%)
                    </div>
                  </Label>
                  <NumericInput step="0.1" value={formData.assumed_annual_return}
                    onChange={(val) => update("assumed_annual_return", val)} className={inputClass} />
                </div>
                {!vorschau.gap_already_covered &&
                  vorschau.monthly_gap_at_retirement === 0 &&
                  vorschau.luecke_ab_alter !== undefined && (
                    <p className="text-xs text-amber-700 mt-2">
                      Zum Rentenbeginn reichen die festen Einnahmen noch. Weil der
                      Bedarf weiter steigt, entsteht die Lücke ab Alter{" "}
                      {vorschau.luecke_ab_alter.toFixed(1).replace(".", ",")} – dafür
                      braucht es trotzdem Kapital.
                    </p>
                  )}
                {!vorschau.gap_already_covered &&
                  vorschau.monthly_gap_at_retirement > 0 && (
                  <p className="text-xs text-slate-600 mt-2">
                    In heutiger Kaufkraft. Zum Rentenbeginn in{" "}
                    {vorschau.years_to_retirement}{" "}
                    {vorschau.years_to_retirement === 1 ? "Jahr" : "Jahren"} sind das{" "}
                    {new Intl.NumberFormat("de-DE", {
                      style: "currency",
                      currency: "EUR",
                    }).format(vorschau.monthly_gap_at_retirement)}
                    /Monat.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Einkommensquellen */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <Euro className="w-5 h-5 text-green-600" />
                </div>
                Einkommensquellen im Ruhestand (monatlich)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="pg-bedarf" className="text-sm font-medium text-slate-700">
                  <div className="flex items-center gap-2"><Euro className="w-4 h-4" />Gewünschtes Monatseinkommen (€), netto in heutiger Kaufkraft</div>
                </Label>
                <NumericInput id="pg-bedarf" value={formData.desired_monthly_income}
                  onChange={(val) => update("desired_monthly_income", val)}
                  className="bg-blue-50 border-blue-200 focus:border-blue-500 font-semibold" />
                <p className="text-xs text-slate-500">
                  Was heute an Kaufkraft gebraucht würde. Die Rechnung schreibt den
                  Betrag mit der Inflation auf den Rentenbeginn fort.
                </p>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="text-sm font-medium text-slate-600 mb-4">
                  Erwartete Einnahmen (netto, je Monat):
                </div>

                {/*
                  Audit C04: Dieselbe Subtraktion beantwortet zwei verschiedene
                  Fragen, je nachdem, in welchem Geldwert die Einnahmen stehen.
                  Die Rechnung unterstellte stillschweigend heutige Kaufkraft;
                  wer einen fest zugesagten Betrag eintrug, bekam eine Zahl zu
                  einer anderen Annahme.
                */}
                <div className="mb-4 space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    Die Beträge unten sind
                  </Label>
                  <SegmentedToggle
                    ariaLabel="Geldwert der Einnahmen"
                    value={formData.einnahmen_basis}
                    onChange={(wert) =>
                      update("einnahmen_basis", wert === "rentenbeginn" ? "rentenbeginn" : "heute")
                    }
                    options={[
                      { value: "heute", label: "in heutiger Kaufkraft" },
                      { value: "rentenbeginn", label: "Betrag zum Rentenbeginn" },
                    ]}
                  />
                  <p className="text-xs text-slate-500">
                    {formData.einnahmen_basis === "heute"
                      ? "Die Einnahmen steigen bis zum Rentenbeginn mit der Inflation – wie der Bedarf. Gerechnet wird die Differenz von heute, hochgerechnet auf den Rentenbeginn."
                      : "Feste Zusagen zum Rentenbeginn, die danach nominal gleich bleiben. Nur der Bedarf wird hochgerechnet; im Ruhestand wächst die Lücke, weil die Einnahmen an Kaufkraft verlieren."}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="pg-rente" className="text-sm font-medium text-slate-700">
                      Gesetzliche Rente (€/Monat)
                    </Label>
                    <NumericInput id="pg-rente" value={formData.expected_statutory_pension}
                      onChange={(val) => update("expected_statutory_pension", val)} className={inputClass} />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="pg-abzuege"
                      className="text-sm font-medium text-slate-700"
                    >
                      Abzüge auf die gesetzliche Rente (%)
                    </Label>
                    <NumericInput
                      id="pg-abzuege"
                      step="0.1"
                      value={formData.abzuege_gesetzliche_rente_percent}
                      onChange={(val) =>
                        update(
                          "abzuege_gesetzliche_rente_percent",
                          Math.min(100, Math.max(0, val))
                        )
                      }
                      className={inputClass}
                    />
                    <p className="text-xs text-slate-500">
                      Kranken- und Pflegeversicherung sowie Steuer. Die
                      Renteninformation der DRV weist brutto aus.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Betriebliche Altersvorsorge (€/Monat)</Label>
                    <NumericInput value={formData.occupational_pension_bav}
                      onChange={(val) => update("occupational_pension_bav", val)} className={inputClass} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Basisrente / Rüruprente (€/Monat)</Label>
                    <NumericInput value={formData.basis_rente}
                      onChange={(val) => update("basis_rente", val)} className={inputClass} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">Mieteinnahmen (€/Monat)</Label>
                    <NumericInput value={formData.rental_income}
                      onChange={(val) => update("rental_income", val)} className={inputClass} />
                  </div>
                </div>
              </div>

              {toNum(formData.expected_statutory_pension) > 0 &&
                toNum(formData.abzuege_gesetzliche_rente_percent) === 0 && (
                  <p className="text-xs text-amber-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    Die gesetzliche Rente gilt hier als Nettobetrag. Die
                    Renteninformation der DRV ist brutto – ohne Steuern und ohne
                    Kranken- und Pflegeversicherung. Wird sie ungeprüft
                    übernommen, fällt die Lücke zu klein aus.
                  </p>
                )}

              {/* Live-Vorschau */}
              <div className={`rounded-xl p-4 border ${monthlyGapPreview > 0 ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700">Gesamteinnahmen:</span>
                  <span className="font-bold text-slate-900">
                    {new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(totalMonthlyIncome)}/Monat
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className={`text-sm font-semibold ${monthlyGapPreview > 0 ? "text-red-700" : "text-green-700"}`}>
                    {monthlyGapPreview > 0 ? "Versorgungslücke:" : "Überschuss:"}
                  </span>
                  <span className={`text-xl font-bold ${monthlyGapPreview > 0 ? "text-red-700" : "text-green-700"}`}>
                    {monthlyGapPreview > 0 ? "–" : "+"}{new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(Math.abs(monthlyGapPreview))}/Monat
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vorhandenes Vermögen */}
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-xl font-bold text-slate-900">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                Vorhandenes Vermögen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-slate-700">
                  <div className="flex items-center gap-2"><Euro className="w-4 h-4" />Aktuelles Kapital / Ersparnisse (€)</div>
                </Label>
                <NumericInput value={formData.existing_capital}
                  onChange={(val) => update("existing_capital", val)}
                  className={inputClass + " md:w-1/2"} />
                <p className="text-xs text-slate-500">
                  Wächst bis zur Rente mit der angenommenen Rendite weiter.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-8 flex justify-center">
              <Button
                onClick={handleCalculate}
                disabled={isCalculating}
                className="bg-slate-800 hover:bg-slate-700 text-white px-8 py-4 text-lg font-medium rounded-xl flex items-center gap-3"
                size="md"
              >
                {isCalculating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Wird berechnet...
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-5 h-5" />
                    Rentenlücke berechnen
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
