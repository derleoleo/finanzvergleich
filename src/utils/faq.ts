// src/utils/faq.ts
// Einzige Quelle der häufigen Fragen.
//
// Sie stehen an zwei Orten: sichtbar auf der Landingpage und als
// strukturierte Daten (JSON-LD) in der ausgelieferten HTML-Datei, damit
// Suchmaschinen sie als FAQ erkennen. Zwei Fassungen desselben Textes würden
// unweigerlich auseinanderlaufen – und eine Suchmaschine, die eine andere
// Antwort anzeigt als die Seite, ist schlimmer als keine.

import { FREI_BERECHNUNGEN_PRO_MONAT } from "./preise";

export type FaqEintrag = { q: string; a: string };

export const FAQ: FaqEintrag[] = [
  {
    q: "Ist Vorsorgewaage für Privatpersonen geeignet?",
    a: "Nein. Die Plattform richtet sich ausschließlich an Finanz- und Versicherungsberater – also Makler, Vermittler und Agenturen. Ein Vertragsschluss mit Privatpersonen ist ausgeschlossen.",
  },
  {
    q: "Handelt es sich um Finanzberatung?",
    a: "Nein. Vorsorgewaage erstellt ausschließlich modellhafte Simulationen auf Basis der vom Nutzer eingegebenen Parameter. Es erfolgt keine Finanz-, Steuer- oder Rechtsberatung. Die Ergebnisse sind Werkzeuge zur internen Analyse und Kundenkommunikation.",
  },
  {
    q: "Wo werden meine Daten gespeichert?",
    a: "Berechnungen und Profildaten werden in Supabase (AWS eu-central-1, Frankfurt) gespeichert. Der Auftragsverarbeitungsvertrag (AVV) gemäß Art. 28 DSGVO ist Bestandteil jedes Nutzungsvertrags. In der angemeldeten Anwendung findet keine Messung statt; Werbe-Tracking setzen wir nirgends ein.",
  },
  {
    q: "Gibt es eine kostenlose Testversion?",
    a: `Ja. Der Free-Plan ist dauerhaft kostenlos und ohne Zahlungsdaten nutzbar. Er umfasst die grundlegenden Rechner (Fonds-Sparvertrag, Einmalanlage) mit ${FREI_BERECHNUNGEN_PRO_MONAT} Berechnungen pro Monat; PDF-Export ist nicht enthalten. Der Premium-Plan startet mit einem 30-tägigen kostenlosen Testzeitraum. Dafür hinterlegen Sie eine Zahlungsmethode – belastet wird erst nach Ablauf der 30 Tage, eine Kündigung vorher ist kostenlos.`,
  },
  {
    q: "Was passiert nach der Probezeit?",
    a: "Das Abonnement beginnt automatisch nach Ablauf der Probezeit, sofern nicht vorher über das Kundenportal gekündigt wird. Kündigung ist jederzeit möglich und wirkt zum Ende der laufenden Abrechnungsperiode.",
  },
];
