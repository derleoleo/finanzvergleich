// Schlägt Links für die Rechtsfundstellen in ratgeber/*.md vor.
//
// Aufruf:  node scripts/fundstellen-verlinken.mjs             (nur anzeigen)
//          node scripts/fundstellen-verlinken.mjs --schreiben  (übernehmen)
//
// Das Skript ist ein Vorschlag, kein Automat. Es wurde einmal gebraucht, um
// 79 Fundstellen nicht von Hand anzufassen; das Ergebnis ist Zeile für Zeile
// durchgesehen worden. Danach ist das Markdown die Quelle, und
// `src/utils/ratgeber-fundstellen.test.ts` hält die Linkpflicht fest.
//
// **Es steht hier keine eigene Logik.** Welche Zitate es gibt, welche über
// einen Zeilenumbruch gehen und wohin jedes zeigt, beantwortet
// `src/utils/fundstellen.ts` – dieselbe Fassung, die der Test benutzt. Zwei
// Fassungen liefen auseinander, und zwar genau an der Stelle, die man nicht
// sieht: Ein Zitat, dessen `a.F.` erst auf der nächsten Zeile steht, sieht
// für sich genommen vollständig aus und bekäme einen Link auf die heute
// geltende Fassung.
//
// Nicht angefasst werden deshalb (alles entschieden im Modul):
// der Frontmatter-Kopf, Überschriften, bestehende Links, Codeblöcke und
// Zitate über den Zeilenumbruch.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  alsMarkdown,
  fundstelleUrl,
  fundstellenImText,
  koerperVon,
  kuerzelVon,
} from "../src/utils/fundstellen.ts";

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ordner = path.join(wurzel, "ratgeber");
const schreiben = process.argv.includes("--schreiben");

let gesamt = 0;
let verlinkt = 0;
const offen = [];

for (const datei of readdirSync(ordner).filter((d) => d.endsWith(".md")).sort()) {
  const voll = path.join(ordner, datei);
  const roh = readFileSync(voll, "utf8").replace(/\r\n/g, "\n");
  const koerper = koerperVon(roh);
  const kopf = roh.slice(0, roh.length - koerper.length);

  // Von hinten nach vorn ersetzen, damit die Spaltenangaben gültig bleiben.
  const zeilen = koerper.split("\n");
  const vorkommen = fundstellenImText(koerper).filter((v) => !v.verlinkt);
  gesamt += vorkommen.length;

  for (const v of [...vorkommen].reverse()) {
    const grund = v.geteilt
      ? "Zeilenumbruch im Zitat – Fassungsangabe steht auf der nächsten Zeile"
      : !kuerzelVon(v.zitat)
        ? "kein Gesetzeskürzel im Zitat (Norm-Spalte)"
        : !fundstelleUrl(v.zitat)
          ? "bewusst ohne Link (siehe OHNE_LINK)"
          : null;

    if (grund) {
      offen.push({ datei, zeile: v.zeile, text: v.zitat, grund });
      continue;
    }

    const z = zeilen[v.zeile - 1];
    zeilen[v.zeile - 1] =
      z.slice(0, v.spalte) + alsMarkdown(v.zitat) + z.slice(v.spalte + v.zitat.length);
    verlinkt++;
  }

  const inhalt = kopf + zeilen.join("\n");
  if (schreiben && inhalt !== roh) writeFileSync(voll, inhalt, "utf8");
}

console.log(`\n${gesamt} Fundstellen ohne Link, ${verlinkt} verlinkbar, ${offen.length} offen.\n`);
if (offen.length) {
  console.log("Von Hand zu behandeln oder bewusst ohne Link:");
  for (const o of offen.sort((a, b) => a.datei.localeCompare(b.datei) || a.zeile - b.zeile)) {
    console.log(`  ${o.datei}:${o.zeile}  ${o.text}`);
    console.log(`      ${o.grund}`);
  }
}
console.log(schreiben ? "\n→ geschrieben." : "\n→ nur angezeigt. Mit --schreiben übernehmen.");
