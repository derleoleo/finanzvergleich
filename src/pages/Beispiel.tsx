// src/pages/Beispiel.tsx
// Ein vollständiger Beratungsfall, öffentlich und ohne Anmeldung.
//
// Warum es diese Seite gibt: Wer das Werkzeug nicht kennt, musste sich
// registrieren, um überhaupt zu sehen, was es ausgibt. Das ist für einen
// Besucher aus der Suche oder von einer Anzeige eine Wand – und es gibt sonst
// keinen Beleg für die Behauptung „nachvollziehbar", weil es noch keine
// Kundenstimmen gibt.
//
// Entscheidend: Die Zahlen hier sind **nicht** abgetippt. Sie entstehen beim
// Laden aus derselben Rechen-Engine und werden mit derselben Waage und
// demselben Diagramm gezeigt wie im Produkt. Ein Screenshot oder eine
// Beispieltabelle würde beim nächsten Modellstand veralten, ohne dass es
// jemand merkt; diese Seite kann das nicht.

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, FileText, Info } from "lucide-react";
import GastRahmen from "@/components/GastRahmen";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import Vorsorgewaage from "@/components/results/Vorsorgewaage";
import ResultsChart from "@/components/results/ResultsChart";
import { formatCurrency } from "@/components/shared/CurrencyDisplay";
import { simulateDepot, simulateLv } from "@/lib/finance/simulation";
import { buildComparisonResults } from "@/lib/finance/series";
import { modellStempel } from "@/lib/finance/modell";
import { ereignis } from "@/utils/messung";

/**
 * Die Eingaben des Beispielfalls.
 *
 * Bewusst ein unauffälliger Normalfall: 200 € monatlich, 30 Jahre Laufzeit,
 * 6 % Rendite. Keine Zahlen, die eine Seite künstlich gewinnen lassen – wer
 * den Fall nachrechnet, soll auf dasselbe kommen.
 */
const FALL = {
  monthly_contribution: 200,
  contract_duration_years: 30,
  assumed_annual_return: 6,
  birth_year: 1990,
  /** Effektivkosten der Police in Prozentpunkten Renditeminderung (PRIIPs). */
  lv_effective_costs_percent: 1.2,
  lv_fund_ongoing_costs_percent: 0.3,
  depot_fund_ongoing_costs_percent: 0.2,
  depot_fund_initial_charge_percent: 0,
  depot_costs_annual: 0.25,
  /**
   * Prozentmodus: Die Police wird ueber ihre Effektivkosten beschrieben, nicht
   * ueber Abschluss- und Verwaltungskosten in Euro. Deshalb ist der
   * Abschlusskostenbetrag null - im Prozentmodus rechnet die Engine ihn nicht
   * mit (siehe simulation.ts).
   */
  lv_cost_type: "percent",
  life_insurance_acquisition_costs_eur: 0,
} as const;

/** Steuerannahmen des Beispiels – fest, damit der Fall reproduzierbar bleibt. */
const STEUERN = {
  lv: { personalIncomeTaxRate: 0.3, solidaritaetszuschlag: true, kirchensteuer_percent: 0 },
  depot: { teilfreistellung_percent: 30, solidaritaetszuschlag: true, kirchensteuer_percent: 0 },
} as const;

export default function Beispiel() {
  const [mode, setMode] = useState<"net" | "gross">("net");

  const { ergebnis, calc } = useMemo(() => {
    const months = FALL.contract_duration_years * 12;
    const lv = simulateLv({
      months,
      annual_return_percent: FALL.assumed_annual_return,
      monthly_contribution: FALL.monthly_contribution,
      funds: [
        {
          allocation_eur: FALL.monthly_contribution,
          ongoing_costs_percent: FALL.lv_fund_ongoing_costs_percent,
        },
      ],
      cost: { type: "percent", effective_costs_percent: FALL.lv_effective_costs_percent },
    });
    const depot = simulateDepot({
      months,
      annual_return_percent: FALL.assumed_annual_return,
      monthly_contribution: FALL.monthly_contribution,
      funds: [
        {
          allocation_eur: FALL.monthly_contribution,
          ongoing_costs_percent: FALL.depot_fund_ongoing_costs_percent,
          initial_charge_percent: FALL.depot_fund_initial_charge_percent,
        },
      ],
      depot_costs_annual_percent: FALL.depot_costs_annual,
    });

    const results = {
      ...buildComparisonResults({
        lv,
        depot,
        years: FALL.contract_duration_years,
        birth_year: FALL.birth_year,
        lvTaxOptions: STEUERN.lv,
        depotTaxOptions: STEUERN.depot,
        riyInputs: {
          monthly_contribution: FALL.monthly_contribution,
          months,
          annual_return_percent: FALL.assumed_annual_return,
        },
      }),
      tax_settings: {
        lv_personal_income_tax_rate: STEUERN.lv.personalIncomeTaxRate * 100,
        apply_solidaritaetszuschlag: true,
        kirchensteuer_percent: 0,
        depot_teilfreistellung_percent: STEUERN.depot.teilfreistellung_percent,
        inflation_percent: 2,
      },
      ...modellStempel(),
      alter_heute: new Date().getFullYear() - FALL.birth_year,
    };

    // Dieselbe Form, die das Diagramm im Produkt bekommt – damit hier kein
    // zweiter Darstellungsweg entsteht.
    return {
      ergebnis: results,
      calc: { id: "beispiel", name: "Beispielfall", ...FALL, results },
    };
  }, []);

  const zeile = (beschriftung: string, wert: string) => (
    <div className="flex items-baseline justify-between gap-4 py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{beschriftung}</span>
      <span className="text-sm font-medium text-slate-900">{wert}</span>
    </div>
  );

  return (
    <GastRahmen>
      <div className="bg-linear-to-br from-slate-50 to-slate-100">
        <div className="max-w-4xl mx-auto px-6 py-12 space-y-10">
          <header>
            <p className="text-xs font-bold text-brand-cyan uppercase tracking-widest mb-3">
              Beispielfall
            </p>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">
              200 € im Monat, 30 Jahre: Fondspolice oder Depot?
            </h1>
            <p className="text-lg text-slate-600">
              Derselbe Beitrag, dieselbe Rendite, dieselben Steuerannahmen – und die
              Frage, auf die es in der Beratung ankommt: Unter welchen Annahmen kippt
              der Vorteil? Die Zahlen unten rechnet diese Seite beim Laden selbst.
            </p>
          </header>

          <Vorsorgewaage
            alsKarte
            basis={mode === "net" ? "netto nach Steuern" : "brutto vor Steuern"}
            links={{
              name: "Fondspolice",
              imSatz: "der Fondspolice",
              wert:
                mode === "net"
                  ? ergebnis.life_insurance_net
                  : ergebnis.life_insurance_gross,
              eingezahlt: ergebnis.total_contributions,
              detail: (
                <span>
                  Effektivkosten {FALL.lv_effective_costs_percent} % p. a.
                  {ergebnis.li_riy_percent !== undefined && (
                    <> · Renditeminderung {ergebnis.li_riy_percent.toFixed(2)} pp</>
                  )}
                </span>
              ),
            }}
            rechts={{
              name: "Depot",
              imSatz: "dem Depot",
              wert: mode === "net" ? ergebnis.depot_net : ergebnis.depot_gross,
              eingezahlt: ergebnis.total_contributions,
              detail: (
                <span>
                  Depotkosten {FALL.depot_costs_annual} % p. a.
                  {ergebnis.depot_riy_percent !== undefined && (
                    <> · Renditeminderung {ergebnis.depot_riy_percent.toFixed(2)} pp</>
                  )}
                </span>
              ),
            }}
            aktionen={
              <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                {(["net", "gross"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                      mode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                    }`}
                  >
                    {m === "net" ? "Nach Steuern" : "Vor Steuern"}
                  </button>
                ))}
              </div>
            }
          />

          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Verlauf</h2>
              <ResultsChart calculation={calc} mode={mode} onModeChange={setMode} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-0 shadow-lg bg-white">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">
                  Diese Annahmen stehen dahinter
                </h2>
                <div className="space-y-0">
                  {zeile("Monatlicher Beitrag", formatCurrency(FALL.monthly_contribution))}
                  {zeile("Laufzeit", `${FALL.contract_duration_years} Jahre`)}
                  {zeile("Rendite vor Kosten", `${FALL.assumed_annual_return} % p. a.`)}
                  {zeile("Effektivkosten Police", `${FALL.lv_effective_costs_percent} % p. a.`)}
                  {zeile("Fondskosten Police", `${FALL.lv_fund_ongoing_costs_percent} % p. a.`)}
                  {zeile("Fondskosten Depot", `${FALL.depot_fund_ongoing_costs_percent} % p. a.`)}
                  {zeile("Depotkosten", `${FALL.depot_costs_annual} % p. a.`)}
                  {zeile("Steuersatz im Alter", "30 % (Halbeinkünfte, Soli)")}
                  {zeile("Teilfreistellung Depot", `${STEUERN.depot.teilfreistellung_percent} %`)}
                  {zeile("Eingezahlt gesamt", formatCurrency(ergebnis.total_contributions))}
                </div>
                <p className="text-xs text-slate-500 mt-4">
                  Jede dieser Zeilen ist im Werkzeug eine Eingabe. Nichts davon ist
                  voreingestellt und unsichtbar.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg bg-white">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">
                  Was daraus im Produkt wird
                </h2>
                <ul className="space-y-3 text-sm text-slate-600">
                  <li className="flex gap-2">
                    <FileText className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                    <span>
                      <span className="font-medium text-slate-900">Eine Fassung</span>, die
                      sich nicht mehr ändert: Eingaben, Kennzahlen und Verläufe werden beim
                      Speichern festgeschrieben. Wer den Fall in drei Jahren öffnet, sieht
                      die Zahlen von damals – nicht die des heutigen Modells.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                    <span>
                      <span className="font-medium text-slate-900">Ein Modellstempel</span>{" "}
                      mit Stand {ergebnis.modell_version} und Rechtsstand – ältere Fassungen
                      werden als solche gekennzeichnet, statt stillschweigend neu gerechnet
                      zu werden.
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <Check className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                    <span>
                      <span className="font-medium text-slate-900">Ein PDF</span> mit Ihrem
                      Logo und Berater-Profil, das Waage, Verlauf und genau diese
                      Annahmenliste enthält.
                    </span>
                  </li>
                </ul>
                <div className="mt-6 rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <p className="text-xs text-slate-600 flex gap-2">
                    <Info className="w-4 h-4 shrink-0 mt-0.5 text-slate-400" />
                    § 61 VVG verlangt nicht nur Beratung und Dokumentation, sondern die
                    Begründung jedes Rats. Eine Rechnung, die später andere Zahlen zeigt,
                    taugt dafür nicht.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-0 shadow-xl bg-slate-900 text-white">
            <CardContent className="p-8 text-center">
              <h2 className="text-2xl font-bold mb-2">Mit eigenen Zahlen rechnen</h2>
              <p className="text-slate-300 mb-6">
                Der kostenlose Plan umfasst diesen Rechner mit drei Berechnungen pro Monat –
                ohne Zahlungsdaten.
              </p>
              <Link to="/login" onClick={() => ereignis("landing_cta")}>
                <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 border-0">
                  Kostenlos starten
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              <p className="text-xs text-slate-400 mt-4">
                Ausschließlich für Finanz- und Versicherungsberater.
              </p>
            </CardContent>
          </Card>

          <p className="text-xs text-slate-400 text-center pb-4">
            Modellhafte Simulation auf Basis der genannten Annahmen. Keine Finanz-, Steuer-
            oder Rechtsberatung. Bewertet am {ergebnis.bewertet_am}, Rechtsstand{" "}
            {ergebnis.rechtsstand}.
          </p>
        </div>
      </div>
    </GastRahmen>
  );
}
