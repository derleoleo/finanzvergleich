// scripts/generate-compliance-pdf.mjs
// Erzeugt public/compliance.pdf (AVV + TOM) aus den unten gepflegten Texten.
//
// Ausführen mit:  node scripts/generate-compliance-pdf.mjs
//
// WICHTIG: Der Inhalt muss mit src/pages/AVV.tsx und src/pages/Compliance.tsx
// übereinstimmen. Bei Änderungen an den Rechtstexten hier nachziehen und das
// Skript erneut laufen lassen – das PDF wird von beiden Seiten als
// Vertragsdokument zum Download angeboten.

import { jsPDF } from 'jspdf';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const STAND = 'August 2026';
const VERSION = '2026-08';
const ANBIETER = 'Luisa Brandt, Ernst-Bähre-Str. 3, 30453 Hannover';

const avvParagraphen = [
  {
    titel: '§ 1 Gegenstand und Dauer der Auftragsverarbeitung',
    absaetze: [
      'Dieser Auftragsverarbeitungsvertrag (nachfolgend „AVV") regelt die Verarbeitung personenbezogener Daten durch den Auftragnehmer (Anbieter der Plattform rentencheck.app, Luisa Brandt, Hannover) im Auftrag des Auftraggebers (registrierter Nutzer als Unternehmer i. S. d. § 14 BGB) im Rahmen der Nutzung der SaaS-Plattform.',
      'Der AVV gilt für die Dauer des Nutzungsvertrags und endet automatisch mit dessen Beendigung. Bei Vertragsende werden alle personenbezogenen Daten des Auftraggebers innerhalb von 30 Tagen gelöscht, sofern keine gesetzliche Aufbewahrungspflicht besteht.',
    ],
  },
  {
    titel: '§ 2 Art und Zweck der Verarbeitung',
    absaetze: [
      'Der Auftragnehmer verarbeitet personenbezogene Daten ausschließlich zur Bereitstellung der SaaS-Plattform für die modellhafte Simulation und Analyse von Altersvorsorge- und Investmentszenarien.',
      'Eine Verarbeitung für eigene Zwecke des Auftragnehmers findet nicht statt. Die Verarbeitung erfolgt ausschließlich auf dokumentierte Weisung des Auftraggebers.',
    ],
  },
  {
    titel: '§ 3 Kategorien betroffener Personen und Datenkategorien',
    absaetze: ['Folgende Datenkategorien können verarbeitet werden:'],
    liste: [
      'Profildaten des Nutzers (Name, Unternehmen, E-Mail-Adresse)',
      'In Berechnungen eingegebene Parameterdaten (modellhafte Annahmen, keine echten Kundendaten erforderlich)',
      'Technische Zugriffsdaten (Session-Token, IP-Adresse, Browser-Informationen)',
    ],
    nachsatz:
      'Hinweis: Die Plattform ist für modellhafte Simulationen ausgelegt. Es wird empfohlen, keine echten personenbezogenen Kundendaten einzugeben.',
  },
  {
    titel: '§ 4 Pflichten des Auftragnehmers',
    absaetze: ['Der Auftragnehmer verpflichtet sich:'],
    liste: [
      'Daten nur auf dokumentierte Weisung des Auftraggebers zu verarbeiten',
      'Zur Verschwiegenheit aller mit der Verarbeitung beauftragten Personen',
      'Alle erforderlichen technischen und organisatorischen Maßnahmen gemäß Art. 32 DSGVO zu ergreifen',
      'Subprozessoren nur nach vorheriger schriftlicher Genehmigung einzusetzen (Generalerlaubnis gemäß § 6 dieses AVV erteilt)',
      'Den Auftraggeber bei der Erfüllung von Betroffenenrechten zu unterstützen',
      'Den Auftraggeber unverzüglich zu informieren, sobald ihm eine Verletzung des Schutzes personenbezogener Daten bekannt wird, und ihn bei den Pflichten nach Art. 32 bis 36 DSGVO zu unterstützen (Art. 28 Abs. 3 lit. f DSGVO)',
      'Dem Auftraggeber alle zum Nachweis der Einhaltung dieser Pflichten erforderlichen Informationen zur Verfügung zu stellen und Überprüfungen einschließlich Inspektionen zu ermöglichen und dazu beizutragen (Art. 28 Abs. 3 lit. h DSGVO)',
      'Den Auftraggeber unverzüglich zu informieren, wenn eine Weisung nach seiner Auffassung gegen die DSGVO oder andere Datenschutzvorschriften verstößt (Art. 28 Abs. 3 Satz 3 DSGVO)',
      'Nach Vertragsende alle Daten zu löschen oder zurückzugeben',
    ],
  },
  {
    titel: '§ 5 Pflichten des Auftraggebers',
    absaetze: ['Der Auftraggeber verpflichtet sich:'],
    liste: [
      'Den Auftragnehmer unverzüglich zu informieren, wenn in seinen Weisungen Fehler festgestellt werden',
      'Die Verarbeitung personenbezogener Daten im Rahmen der Plattform auf das notwendige Minimum zu beschränken',
      'Zugangsdaten vertraulich zu behandeln und nicht weiterzugeben',
      'Datenpannen, die seinen Verantwortungsbereich betreffen, unverzüglich zu melden',
    ],
  },
  {
    titel: '§ 6 Subprozessoren',
    absaetze: [
      'Der Auftraggeber erteilt hiermit eine allgemeine Genehmigung für den Einsatz der nachfolgend genannten Subprozessoren. Der Auftragnehmer informiert den Auftraggeber über geplante Änderungen mit angemessener Vorlaufzeit.',
    ],
    tabelle: {
      kopf: ['Subprozessor', 'Zweck', 'Sitz / Server'],
      breiten: [52, 78, 40],
      zeilen: [
        ['Supabase Inc.', 'Datenbank, Authentifizierung', 'USA / EU (Frankfurt)'],
        ['Vercel Inc.', 'Hosting, CDN', 'USA / EU (Frankfurt)'],
        ['Stripe Inc.', 'Zahlungsabwicklung', 'USA / EU (Dublin)'],
        ['Resend Inc.', 'Transaktionsmails', 'USA / EU'],
        [
          'Functional Software, Inc. (Sentry)',
          'Fehlerdiagnose, Stabilitätsüberwachung',
          'USA / EU (Frankfurt)',
        ],
      ],
    },
    nachsatz:
      'Nicht als Subprozessor eingesetzt wird Formspree, Inc. (USA). Der Dienst stellt ausschließlich Rückmeldungen des Auftraggebers über das Feedback-Formular per E-Mail zu und erhält dabei keinen Zugriff auf Daten, die der Auftraggeber im Rahmen dieses AVV verarbeiten lässt.',
  },
];

const tomMassnahmen = [
  [
    'Zugangskontrolle',
    'Authentifizierung über Supabase Auth (E-Mail + Passwort). Passwörter werden ausschließlich als bcrypt-Hash gespeichert. Row-Level-Security (RLS) stellt sicher, dass Nutzer nur auf eigene Daten zugreifen.',
  ],
  [
    'Transportverschlüsselung',
    'Alle Verbindungen erfolgen ausschließlich über HTTPS/TLS 1.2+. Unverschlüsselte Verbindungen werden automatisch weitergeleitet.',
  ],
  [
    'Verschlüsselung ruhender Daten',
    'Datenbank-Volumes bei Supabase sind AES-256-verschlüsselt.',
  ],
  [
    'Pseudonymisierung',
    'Berechnungen und Profildaten werden unter UUIDs (User-IDs) gespeichert, nicht unter Klarnamen im Systemkontext.',
  ],
  [
    'Backup & Wiederherstellung',
    'Tägliche automatische Backups durch Supabase mit Point-in-Time-Recovery. Wiederherstellungszeit (RTO) < 4 Stunden.',
  ],
  [
    'Incident-Management',
    'Sicherheitsvorfälle werden gemäß Art. 33 DSGVO innerhalb von 72 Stunden an die zuständige Aufsichtsbehörde gemeldet. Betroffene Nutzer werden unverzüglich informiert.',
  ],
];

// ---------------------------------------------------------------------------

const doc = new jsPDF({ unit: 'mm', format: 'a4' });
const RAND = 20;
const BREITE = 210 - 2 * RAND;
const UNTEN = 297 - 22;
let y = RAND;

function seitenumbruchWennNoetig(hoehe) {
  if (y + hoehe > UNTEN) {
    doc.addPage();
    y = RAND;
    return true;
  }
  return false;
}

function text(inhalt, { size = 10, style = 'normal', abstand = 4.6, farbe = [30, 41, 59] } = {}) {
  doc.setFont('helvetica', style);
  doc.setFontSize(size);
  doc.setTextColor(...farbe);
  const zeilen = doc.splitTextToSize(inhalt, BREITE);
  for (const zeile of zeilen) {
    seitenumbruchWennNoetig(abstand);
    doc.text(zeile, RAND, y);
    y += abstand;
  }
}

function ueberschrift(inhalt, size = 12) {
  y += 3;
  seitenumbruchWennNoetig(10);
  text(inhalt, { size, style: 'bold', abstand: 5.4, farbe: [15, 23, 42] });
  y += 1;
}

function aufzaehlung(punkte) {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  for (const punkt of punkte) {
    const zeilen = doc.splitTextToSize(punkt, BREITE - 5);
    zeilen.forEach((zeile, i) => {
      seitenumbruchWennNoetig(4.6);
      if (i === 0) doc.text('•', RAND, y);
      doc.text(zeile, RAND + 5, y);
      y += 4.6;
    });
    y += 0.8;
  }
}

function tabelle({ kopf, breiten, zeilen }) {
  const zeilenhoehe = 5;
  doc.setFontSize(9);

  const kopfZeichnen = () => {
    doc.setFillColor(241, 245, 249);
    doc.rect(RAND, y - 3.6, BREITE, zeilenhoehe + 1.4, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    let x = RAND + 1.5;
    kopf.forEach((zelle, i) => {
      doc.text(zelle, x, y);
      x += breiten[i];
    });
    y += zeilenhoehe + 1.8;
  };

  seitenumbruchWennNoetig(20);
  kopfZeichnen();

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);
  for (const zeile of zeilen) {
    const umbrochen = zeile.map((zelle, i) =>
      doc.splitTextToSize(zelle, breiten[i] - 3)
    );
    const hoehe = Math.max(...umbrochen.map((z) => z.length)) * 4.2;
    if (seitenumbruchWennNoetig(hoehe + 3)) {
      doc.setFontSize(9);
      kopfZeichnen();
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
    }
    let x = RAND + 1.5;
    umbrochen.forEach((zellzeilen, i) => {
      zellzeilen.forEach((zz, j) => doc.text(zz, x, y + j * 4.2));
      x += breiten[i];
    });
    y += hoehe + 1.4;
    doc.setDrawColor(226, 232, 240);
    doc.line(RAND, y - 2.6, RAND + BREITE, y - 2.6);
  }
  y += 2;
  doc.setFontSize(10);
}

// --- Deckblatt / Kopf ---------------------------------------------------------
doc.setFont('helvetica', 'bold');
doc.setFontSize(19);
doc.setTextColor(15, 23, 42);
doc.text('Auftragsverarbeitungsvertrag', RAND, y);
y += 8;
doc.setFontSize(13);
doc.setTextColor(71, 85, 105);
doc.text('gemäß Art. 28 DSGVO · inkl. technischer und organisatorischer Maßnahmen', RAND, y);
y += 8;
doc.setFont('helvetica', 'normal');
doc.setFontSize(10);
doc.text(`rentencheck.app · Stand: ${STAND} · Version ${VERSION}`, RAND, y);
y += 8;
doc.setDrawColor(203, 213, 225);
doc.line(RAND, y, RAND + BREITE, y);
y += 8;

text('Auftragnehmer', { style: 'bold' });
text(ANBIETER);
y += 2;
text('Auftraggeber', { style: 'bold' });
text(
  'Der bei rentencheck.app registrierte Nutzer als Unternehmer im Sinne des § 14 BGB. Der AVV wird mit der Registrierung Bestandteil des Nutzungsvertrags.'
);

// --- AVV ----------------------------------------------------------------------
for (const p of avvParagraphen) {
  ueberschrift(p.titel);
  for (const absatz of p.absaetze ?? []) {
    text(absatz);
    y += 1.5;
  }
  if (p.liste) {
    aufzaehlung(p.liste);
    y += 1;
  }
  if (p.tabelle) {
    y += 1;
    tabelle(p.tabelle);
  }
  if (p.nachsatz) {
    y += 1;
    text(p.nachsatz, { size: 9, farbe: [71, 85, 105] });
  }
  y += 2;
}

// --- TOM ----------------------------------------------------------------------
doc.addPage();
y = RAND;
doc.setFont('helvetica', 'bold');
doc.setFontSize(15);
doc.setTextColor(15, 23, 42);
doc.text('Technische und organisatorische Maßnahmen', RAND, y);
y += 7;
doc.setFont('helvetica', 'normal');
doc.setFontSize(10);
doc.setTextColor(71, 85, 105);
doc.text('gemäß Art. 32 DSGVO', RAND, y);
y += 8;

for (const [titel, beschreibung] of tomMassnahmen) {
  seitenumbruchWennNoetig(16);
  text(titel, { style: 'bold', abstand: 5 });
  text(beschreibung, { size: 9.5, farbe: [51, 65, 85] });
  y += 3;
}

y += 2;
text(
  'Diese Maßnahmen werden regelmäßig überprüft und an den Stand der Technik angepasst. Der Auftragnehmer dokumentiert Änderungen und stellt sie dem Auftraggeber auf Anfrage zur Verfügung.',
  { size: 9, farbe: [71, 85, 105] }
);

// --- Fußzeilen ----------------------------------------------------------------
const seiten = doc.getNumberOfPages();
for (let i = 1; i <= seiten; i++) {
  doc.setPage(i);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`rentencheck.app · AVV & TOM · Version ${VERSION}`, RAND, 297 - 12);
  doc.text(`Seite ${i} von ${seiten}`, 210 - RAND, 297 - 12, { align: 'right' });
}

const ziel = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'compliance.pdf');
writeFileSync(ziel, Buffer.from(doc.output('arraybuffer')));
console.log(`compliance.pdf geschrieben: ${ziel} (${seiten} Seiten)`);
