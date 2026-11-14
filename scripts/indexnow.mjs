// Meldet die Adressen der Sitemap bei IndexNow an — Bing, Yandex, Seznam, Naver.
//
// Aufruf: npm run indexnow            (meldet alle Adressen der Sitemap)
//         npm run indexnow -- --probe (prüft nur, ob der Schlüssel erreichbar ist)
//
// Warum IndexNow und nicht die Bing Webmaster Tools: Die Webmaster Tools
// verlangen ein Konto. IndexNow verlangt nur eine Datei auf der Domain, deren
// Name der Schlüssel ist und deren Inhalt derselbe Schlüssel. Wer diese Datei
// ablegen kann, gilt als Eigentümer — das ist der ganze Nachweis.
//
// Der Anlass: Am 14.11.2026 stand im Bing-Index noch der Titel von vor der
// Umbenennung („Professionelle Analysen für Finanzberater" statt
// „Beratungssoftware für Altersvorsorge", siehe docs/benennung-startseite.md).
// Perplexity, ChatGPT-Suche und Copilot ziehen aus diesem Index; ein veralteter
// Eintrag wirkt dort unmittelbar.
//
// WICHTIG: Die Schlüsseldatei muss live erreichbar sein, bevor das Melden
// Sinn ergibt. Also erst ausrollen, dann melden. Das Skript prüft das selbst
// und meldet nichts, solange der Schlüssel nicht steht.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HOST = "www.vorsorgewaage.de";
const DOMAIN = `https://${HOST}`;

/** Der Schlüssel ist der Name der einzigen Schlüsseldatei in public/. */
function schluesselFinden() {
  const treffer = fs
    .readdirSync(path.join(root, "public"))
    .filter((d) => /^[0-9a-f]{32}\.txt$/.test(d));
  if (treffer.length !== 1) {
    throw new Error(
      `Erwartet genau eine Schlüsseldatei in public/, gefunden: ${treffer.length}`,
    );
  }
  const schluessel = treffer[0].replace(/\.txt$/, "");
  const inhalt = fs.readFileSync(path.join(root, "public", treffer[0]), "utf8").trim();
  if (inhalt !== schluessel) {
    throw new Error(`${treffer[0]} enthält nicht den eigenen Namen — IndexNow lehnt das ab.`);
  }
  return schluessel;
}

async function melden(schluessel, keyLocation) {
  const sitemap = await (await fetch(`${DOMAIN}/sitemap.xml`)).text();
  const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (!urlList.length) throw new Error("Keine Adressen in der Sitemap gefunden.");

  const antwort = await fetch("https://api.indexnow.org/IndexNow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host: HOST, key: schluessel, keyLocation, urlList }),
  });

  // 200 = angenommen, 202 = angenommen, Schlüssel wird noch geprüft.
  console.log(`\n${urlList.length} Adressen gemeldet → HTTP ${antwort.status}`);
  if (antwort.status === 200 || antwort.status === 202) {
    console.log("Angenommen. Ob und wann neu aufgenommen wird, entscheidet die Suchmaschine.");
    return true;
  }
  console.error(await antwort.text());
  return false;
}

const schluessel = schluesselFinden();
const keyLocation = `${DOMAIN}/${schluessel}.txt`;

// Ohne erreichbaren Schlüssel meldet man ins Leere — also zuerst nachsehen.
const probe = await fetch(keyLocation);
const erreichbar = probe.ok && (await probe.text()).trim() === schluessel;
console.log(`Schlüsseldatei ${keyLocation}: HTTP ${probe.status}${erreichbar ? " ✓" : ""}`);

// `process.exitCode` statt `process.exit()`: Letzteres reißt offene
// Netzwerk-Handles ab, und Node quittiert das unter Windows mit einer
// Assertion-Meldung, die wie ein Absturz aussieht.
if (!erreichbar) {
  console.error(
    "\nDer Schlüssel ist noch nicht live. Erst ausrollen, dann melden —\n" +
      "IndexNow weist eine Meldung ohne erreichbaren Schlüssel zurück.",
  );
  process.exitCode = 1;
} else if (!process.argv.includes("--probe")) {
  if (!(await melden(schluessel, keyLocation))) process.exitCode = 1;
}
