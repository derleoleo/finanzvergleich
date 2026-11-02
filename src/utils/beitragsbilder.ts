// Die Vorschaubilder der Ratgeberbeiträge — als SVG aus Zahlen gezeichnet.
//
// Warum nicht ein Markenbild für alle, wie bisher: Google verlangt für
// `Article.image` ausdrücklich „images that are relevant to the article,
// rather than logos or captions" und „Images must represent the marked up
// content". Ein Logo erfüllt das nicht, deshalb stand im `Article`-JSON-LD
// bisher gar kein Bild.
//
// Warum gezeichnet und nicht gestaltet: Jeder Beitrag lebt von einer Zahl
// oder einer Schwelle. Zeichnet man die, zeigt das Bild genau den Inhalt — und
// es lässt sich prüfen. `beitragsbilder.test.ts` zieht jede Aussage aus dem
// fertigen SVG und verlangt sie wörtlich im Beitrag. Ein Bild kann hier also
// nicht behaupten, was der Text nicht sagt.
//
// Dieses Modul hat **bewusst keine Importe**. Dadurch kann
// `scripts/generate-beitragsbilder.mjs` es mit Node direkt laden (Node 24
// versteht TypeScript), ohne Bündler und ohne zweites Build-System. Die
// Bindung der Zahlen an die Engine übernimmt der Test, genau wie bei den
// Zahlen in den Beiträgen selbst.

/** Die von Google empfohlenen Seitenverhältnisse: „16x9, 4x3, and 1x1". */
export const SEITENVERHAELTNISSE = [
  { kennung: "16x9", breite: 1200, hoehe: 675 },
  { kennung: "4x3", breite: 1200, hoehe: 900 },
  { kennung: "1x1", breite: 1200, hoehe: 1200 },
] as const;

export type Seitenverhaeltnis = (typeof SEITENVERHAELTNISSE)[number];

/** Pfad der Bilder, relativ zur Domain. */
export const BILDPFAD = "/bilder/ratgeber";

const FARBE = {
  marke: "#0057ff",
  hell: "#7faaff",
  flaeche: "#e5edff",
  text: "#0f172a",
  grau: "#475569",
  linie: "#cbd5e1",
  warn: "#b45309",
  aus: "#94a3b8",
};

// ---------------------------------------------------------------- Formate

// Intl setzt ein geschütztes Leerzeichen vor das €-Zeichen. Wörtlich hat es im
// Quelltext nichts zu suchen — ESLint meldet es als Fehler
// (`no-irregular-whitespace`) —, also über den Zeichencode.
const GESCHUETZTES_LEERZEICHEN = String.fromCharCode(160);

const EUR = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

/** „1.800 €" — wie im Beitrag, damit der Test wörtlich vergleichen kann. */
export function eur(wert: number): string {
  return EUR.format(wert).split(GESCHUETZTES_LEERZEICHEN).join(" ");
}

/** „50 %" oder „63,3 %". */
export function prozent(wert: number): string {
  const s = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 1 }).format(wert);
  return `${s} %`;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ------------------------------------------------------------ Grundformen

/**
 * Ein Stufendiagramm: bis `bis` gilt `wert`.
 *
 * `beschriftung` steht ausdrücklich daneben, statt aus `wert` abgeleitet zu
 * werden: Der Beitrag schreibt „50 Cent" je Euro, wie § 84 S. 1 EStG — das
 * Bild sagte zuerst „50 %". Rechnerisch dasselbe, aber nicht seine Worte, und
 * der Test hat es gefunden.
 */
export type Stufen = {
  art: "stufen";
  stufen: { bis: number; wert: number; beschriftung: string }[];
  xMax: number;
  /** Beschriftung der Kanten, die der Beitrag benennt. */
  kanten: number[];
  xTitel: string;
  yTitel: string;
};

/** Waagerechte Balken — verträgt lange Beschriftungen und den Wert null. */
export type Balken = {
  art: "balken";
  balken: { text: string; wert: number; betont?: boolean }[];
  einheit: "eur" | "prozent";
};

/** Gruppierte Balken: je Achsenpunkt mehrere Reihen. */
export type Gruppen = {
  art: "gruppen";
  achse: string[];
  reihen: { name: string; werte: number[] }[];
  einheit: "eur" | "prozent";
};

/** Linien über einer Zahlenachse, mit optionaler Markierung. */
export type Linien = {
  art: "linien";
  x: number[];
  xTitel: string;
  reihen: { name: string; werte: number[]; betont?: boolean }[];
  marke?: { bei: number; text: string };
  einheit: "eur";
};

/** Benannte Optionen mit zwei Merkmalen — fünf Zeilen statt eines Rasters. */
export type Optionen = {
  art: "optionen";
  spalten: [string, string];
  zeilen: { kennung: string; text: string; a: string; b: string; betont?: boolean }[];
  hinweis: string;
};

/** Ein Feld-Wert-Block, etwa der Modellstempel. */
export type Stempel = {
  art: "stempel";
  felder: { feld: string; wert: string }[];
  schalter: string[];
  hinweis: string;
};

export type Grundform = Stufen | Balken | Gruppen | Linien | Optionen | Stempel;

export type Bildwerk = {
  /** Dateiname des Beitrags ohne `.md`. */
  slug: string;
  ueberschrift: string;
  unterzeile: string;
  /** `og:image:alt`, beschreibt das Bild für Vorleseprogramme. */
  alt: string;
  form: Grundform;
};

// ------------------------------------------------------------- Die sieben

export const BILDWERKE: Bildwerk[] = [
  {
    slug: "grenzfoerderquote-altersvorsorgedepot",
    ueberschrift: "Der nächste Euro bringt nicht dasselbe",
    unterzeile: "Grenzförderquote im Altersvorsorgedepot, Beitragsjahr 2027",
    alt:
      "Stufendiagramm der Grundzulage je Euro Jahresbeitrag: 50 Cent bis " +
      "360 €, 25 Cent bis 1.800 €, darüber nichts.",
    form: {
      art: "stufen",
      stufen: [
        { bis: 360, wert: 50, beschriftung: "50 Cent" },
        { bis: 1800, wert: 25, beschriftung: "25 Cent" },
        { bis: 2200, wert: 0, beschriftung: "nichts" },
      ],
      xMax: 2200,
      kanten: [360, 1800],
      xTitel: "Jahresbeitrag",
      yTitel: "Zulage je Euro",
    },
  },
  {
    slug: "mittelbare-berechtigung-ehegatte",
    ueberschrift: "Ein Euro Beitrag, 175 € Unterschied",
    unterzeile: "Mindestbeitrag des mittelbar berechtigten Ehegatten ab 2027",
    alt:
      "Zwei Balken: bei 119 € Jahresbeitrag null Grundzulage, bei 120 € " +
      "Jahresbeitrag 175 € Grundzulage.",
    form: {
      art: "balken",
      balken: [
        { text: "119 € Jahresbeitrag", wert: 0 },
        { text: "120 € Jahresbeitrag", wert: 175, betont: true },
      ],
      einheit: "eur",
    },
  },
  {
    slug: "zulage-oder-sonderausgabenabzug",
    ueberschrift: "Wo die Förderung kippt",
    unterzeile: "Zu versteuerndes Einkommen, ab dem der Sonderausgabenabzug trägt",
    alt:
      "Gruppierte Balken der Umschlagpunkte nach Kinderzahl: ohne Kind " +
      "18.600 €, mit einem Kind 41.800 €, mit zwei Kindern 62.000 € " +
      "zu versteuerndes Einkommen im Grundtarif.",
    form: {
      art: "gruppen",
      achse: ["ohne Kind", "1 Kind", "2 Kinder"],
      reihen: [
        { name: "Grundtarif", werte: [18600, 41800, 62000] },
        { name: "Zusammenveranlagung", werte: [35800, 82400, 123000] },
      ],
      einheit: "eur",
    },
  },
  {
    slug: "vorabpauschale-was-sie-wirklich-kostet",
    ueberschrift: "Die Zahl, über die geredet wird, ist die falsche",
    unterzeile: "Sparplan 150 € im Monat, 30 Jahre, freies Depot",
    alt:
      "Drei Balken: 6.593 € Vorabpauschalensteuer in 30 Jahren, 0 € " +
      "Mehrbelastung am Ende, 5.523 € tatsächlicher Verlust durch den " +
      "entgangenen Zinseszins.",
    form: {
      art: "balken",
      balken: [
        { text: "Steuer in 30 Jahren", wert: 6593 },
        { text: "Mehrbelastung am Ende", wert: 0 },
        { text: "tatsächlicher Verlust", wert: 5523, betont: true },
      ],
      einheit: "eur",
    },
  },
  {
    slug: "was-im-todesfall-bleibt-altersvorsorgedepot",
    ueberschrift: "Der Bruch kommt mit der Verrentung",
    unterzeile: "Was im Todesfall an die Hinterbliebenen geht, nach Sterbealter",
    alt:
      "Drei Linien über dem Sterbealter: der geförderte Vertrag liegt bis " +
      "zum Rentenbeginn vorn und fällt danach auf null, Fondspolice und " +
      "freies Depot steigen weiter.",
    form: {
      art: "linien",
      x: [50, 60, 67, 75, 80],
      xTitel: "Tod mit … Jahren",
      reihen: [
        {
          name: "gefördertes Depot",
          werte: [37500, 99027, 48439, 12268, 0],
          betont: true,
        },
        { name: "Fondspolice", werte: [33702, 81219, 133271, 223898, 309650] },
        { name: "freies Depot", werte: [34153, 84424, 142046, 227377, 308119] },
      ],
      marke: { bei: 67, text: "Rentenbeginn" },
      einheit: "eur",
    },
  },
  {
    slug: "riester-bestand-wechseln-oder-behalten",
    ueberschrift: "Zwei Entscheidungen, nicht eine",
    unterzeile: "Was ein Riester-Bestand ab 2027 tun kann",
    alt:
      "Fünf Optionen A bis E mit Förderregime und Produktmantel. Option B " +
      "wechselt nur die Fördersystematik und lässt den Altvertrag " +
      "unverändert.",
    form: {
      art: "optionen",
      spalten: ["Förderregime", "Produktmantel"],
      zeilen: [
        { kennung: "A", text: "unverändert weiterführen", a: "alt", b: "Altvertrag" },
        {
          kennung: "B",
          text: "nur die Fördersystematik wechseln",
          a: "neu",
          b: "Altvertrag",
          betont: true,
        },
        { kennung: "C", text: "ruhend stellen, Depot daneben", a: "neu", b: "beides" },
        { kennung: "D", text: "Kapital ins Depot übertragen", a: "neu", b: "Depot" },
        { kennung: "E", text: "kündigen und entnehmen", a: "—", b: "förderschädlich" },
      ],
      hinweis:
        "Der Wechsel ist unwiderruflich und gilt für alle Verträge (§ 52 Abs. 50a S. 4 EStG).",
    },
  },
  {
    slug: "begruendungspflicht-paragraf-61-vvg",
    ueberschrift: "Die Gründe für jeden Rat angeben",
    unterzeile: "§ 61 Abs. 1 S. 1 VVG — was eine Begründung in zehn Jahren tragen lässt",
    alt:
      "Der Modellstempel einer gespeicherten Berechnung mit Modellfassung, " +
      "Bewertungsdatum und Rechtsstand, dazu die sechs offenen Rechtsfragen " +
      "als mitgespeicherte Schalter.",
    form: {
      art: "stempel",
      felder: [
        { feld: "Modellfassung", wert: "2026-10-29b" },
        { feld: "Bewertet am", wert: "Datum der Berechnung" },
        { feld: "Rechtsstand", wert: "BGBl. 2026 I Nr. 156" },
        { feld: "Alter bei Auszahlung", wert: "mitgespeichert" },
      ],
      schalter: [
        "Kinderzulage je Kind",
        "Kinderzulage im Abzugsvolumen",
        "ungeförderter Teil",
        "Rückforderung im Todesfall",
        "Erträge im Todesfall",
        "Rückforderung nur des Zugeflossenen",
      ],
      hinweis: "sechs offenen Rechtsfragen",
    },
  },
];

// ------------------------------------------------------------- Zeichnen

type Kasten = { x: number; y: number; b: number; h: number };

/** Ein Textstück im SVG. */
function text(
  s: string,
  x: number,
  y: number,
  o: { groesse?: number; fett?: number; farbe?: string; anker?: string } = {},
): string {
  const a = o.anker ? ` text-anchor="${o.anker}"` : "";
  return (
    `<text x="${r(x)}" y="${r(y)}" font-size="${o.groesse ?? 24}" ` +
    `font-weight="${o.fett ?? 400}" fill="${o.farbe ?? FARBE.text}"${a}>${esc(s)}</text>`
  );
}

function r(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Bricht eine Überschrift auf höchstens `zeichen` Zeichen je Zeile. */
function umbrechen(s: string, zeichen: number): string[] {
  const zeilen: string[] = [];
  let aktuell = "";
  for (const wort of s.split(" ")) {
    if (aktuell && (aktuell + " " + wort).length > zeichen) {
      zeilen.push(aktuell);
      aktuell = wort;
    } else {
      aktuell = aktuell ? `${aktuell} ${wort}` : wort;
    }
  }
  if (aktuell) zeilen.push(aktuell);
  return zeilen;
}

/** Das Ergebnis: das Bild und die Zahlenaussagen, die es trifft. */
export type Zeichnung = {
  svg: string;
  /** Jede Aussage, die im Beitrag wörtlich vorkommen muss. */
  aussagen: string[];
};

export function zeichne(w: Bildwerk, mass: Seitenverhaeltnis): Zeichnung {
  const { breite: B, hoehe: H } = mass;
  const rand = 72;
  const titelZeilen = umbrechen(w.ueberschrift, 34);
  const titelGroesse = H > 900 ? 56 : 48;

  let y = rand + titelGroesse;
  const kopf: string[] = [];
  for (const z of titelZeilen) {
    kopf.push(text(z, rand, y, { groesse: titelGroesse, fett: 800 }));
    y += titelGroesse * 1.1;
  }
  y += 8;
  kopf.push(text(w.unterzeile, rand, y, { groesse: 26, farbe: FARBE.grau }));
  y += 34;

  const fussHoehe = 64;
  const kasten: Kasten = {
    x: rand,
    y: y + 24,
    b: B - rand * 2,
    h: H - (y + 24) - fussHoehe - rand / 2,
  };

  const { inhalt, aussagen } = zeichneForm(w.form, kasten);

  const fuss = text(`vorsorgewaage.de/ratgeber/${w.slug}`, rand, H - rand / 2, {
    groesse: 22,
    fett: 600,
    farbe: FARBE.marke,
  });

  return {
    svg:
      `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${H}" ` +
      `viewBox="0 0 ${B} ${H}" font-family="Inter, system-ui, sans-serif">` +
      `<rect width="${B}" height="${H}" fill="#ffffff"/>` +
      `<rect width="14" height="${H}" fill="${FARBE.marke}"/>` +
      kopf.join("") +
      inhalt +
      fuss +
      `</svg>`,
    aussagen,
  };
}

function zeichneForm(form: Grundform, k: Kasten): { inhalt: string; aussagen: string[] } {
  switch (form.art) {
    case "stufen":
      return stufenZeichnen(form, k);
    case "balken":
      return balkenZeichnen(form, k);
    case "gruppen":
      return gruppenZeichnen(form, k);
    case "linien":
      return linienZeichnen(form, k);
    case "optionen":
      return optionenZeichnen(form, k);
    case "stempel":
      return stempelZeichnen(form, k);
  }
}

function wertText(wert: number, einheit: "eur" | "prozent"): string {
  return einheit === "eur" ? eur(wert) : prozent(wert);
}

// -- Stufen ---------------------------------------------------------------

function stufenZeichnen(f: Stufen, k: Kasten): { inhalt: string; aussagen: string[] } {
  const aussagen: string[] = [];
  const achse = 56; // Platz für die x-Beschriftung
  const hoehe = k.h - achse;
  const yMax = Math.max(...f.stufen.map((s) => s.wert)) * 1.25;
  const px = (w: number) => k.x + (w / f.xMax) * k.b;
  const py = (w: number) => k.y + hoehe - (w / yMax) * hoehe;

  const teile: string[] = [];
  teile.push(
    `<line x1="${r(k.x)}" y1="${r(k.y + hoehe)}" x2="${r(k.x + k.b)}" ` +
      `y2="${r(k.y + hoehe)}" stroke="${FARBE.linie}" stroke-width="2"/>`,
  );

  let von = 0;
  for (const s of f.stufen) {
    const breite = px(s.bis) - px(von);
    if (s.wert > 0) {
      teile.push(
        `<rect x="${r(px(von))}" y="${r(py(s.wert))}" width="${r(breite)}" ` +
          `height="${r(k.y + hoehe - py(s.wert))}" fill="${FARBE.flaeche}" ` +
          `stroke="${FARBE.marke}" stroke-width="3"/>`,
      );
      aussagen.push(s.beschriftung);
      teile.push(
        text(s.beschriftung, px(von) + breite / 2, py(s.wert) - 18, {
          groesse: 34,
          fett: 700,
          anker: "middle",
          farbe: FARBE.marke,
        }),
      );
    } else {
      aussagen.push(s.beschriftung);
      teile.push(
        text(s.beschriftung, px(von) + breite / 2, k.y + hoehe - 16, {
          groesse: 30,
          fett: 700,
          anker: "middle",
          farbe: FARBE.aus,
        }),
      );
    }
    von = s.bis;
  }

  for (const kante of f.kanten) {
    const beschriftung = eur(kante);
    aussagen.push(beschriftung);
    teile.push(
      `<line x1="${r(px(kante))}" y1="${r(k.y)}" x2="${r(px(kante))}" ` +
        `y2="${r(k.y + hoehe)}" stroke="${FARBE.text}" stroke-width="2" ` +
        `stroke-dasharray="6 6"/>`,
    );
    teile.push(
      text(beschriftung, px(kante), k.y + hoehe + 34, {
        groesse: 26,
        fett: 700,
        anker: "middle",
      }),
    );
  }

  teile.push(
    text(f.yTitel, k.x, k.y - 8, { groesse: 22, farbe: FARBE.grau }),
    // Eine Zeile tiefer als die Kanten: sonst stößt „Jahresbeitrag" an „1.800 €".
    text(f.xTitel, k.x + k.b, k.y + hoehe + 68, {
      groesse: 22,
      farbe: FARBE.grau,
      anker: "end",
    }),
  );
  return { inhalt: teile.join(""), aussagen };
}

// -- Balken ---------------------------------------------------------------

function balkenZeichnen(f: Balken, k: Kasten): { inhalt: string; aussagen: string[] } {
  const aussagen: string[] = [];
  const n = f.balken.length;
  // Gedeckelt und mittig: im 1:1-Format zog `k.h / n` zwei Balken über
  // 1.200 Pixel auseinander, mit einem leeren Loch dazwischen.
  const schritt = Math.min(k.h / n, 150);
  const hoehe = Math.min(72, schritt * 0.4);
  const oben0 = k.y + (k.h - schritt * n) / 2;
  const max = Math.max(...f.balken.map((b) => b.wert)) || 1;
  const skala = k.b * 0.62;

  const teile: string[] = [];
  f.balken.forEach((b, i) => {
    const oben = oben0 + i * schritt + schritt * 0.28;
    const breite = (b.wert / max) * skala;
    const farbe = b.betont ? FARBE.marke : FARBE.hell;
    teile.push(text(b.text, k.x, oben - 14, { groesse: 26, farbe: FARBE.grau }));
    if (breite > 0) {
      teile.push(
        `<rect x="${r(k.x)}" y="${r(oben)}" width="${r(breite)}" ` +
          `height="${r(hoehe)}" rx="4" fill="${farbe}"/>`,
      );
    } else {
      // Eine Null hat keine Höhe - sonst stünde hier nichts.
      teile.push(
        `<line x1="${r(k.x)}" y1="${r(oben)}" x2="${r(k.x)}" ` +
          `y2="${r(oben + hoehe)}" stroke="${FARBE.aus}" stroke-width="4"/>`,
      );
    }
    const beschriftung = wertText(b.wert, f.einheit);
    aussagen.push(beschriftung);
    teile.push(
      text(beschriftung, k.x + breite + 20, oben + hoehe * 0.74, {
        groesse: 40,
        fett: 800,
        farbe: b.betont ? FARBE.marke : FARBE.text,
      }),
    );
  });
  return { inhalt: teile.join(""), aussagen };
}

// -- Gruppen --------------------------------------------------------------

function gruppenZeichnen(f: Gruppen, k: Kasten): { inhalt: string; aussagen: string[] } {
  const aussagen: string[] = [];
  const gruppen = f.achse.length;
  // Wie bei den Balken gedeckelt, damit das hohe Format nicht auseinanderzieht.
  const schritt = Math.min(k.h / gruppen, 190);
  const max = Math.max(...f.reihen.flatMap((reihe) => reihe.werte)) || 1;
  const skala = k.b * 0.56;
  const hoehe = Math.min(44, (schritt * 0.5) / f.reihen.length);
  const oben0 = k.y + Math.max(0, (k.h - schritt * gruppen - 40) / 2);

  const teile: string[] = [];
  f.achse.forEach((name, g) => {
    const oben = oben0 + g * schritt + schritt * 0.12;
    teile.push(text(name, k.x, oben - 12, { groesse: 26, fett: 700 }));
    f.reihen.forEach((reihe, i) => {
      const y = oben + i * (hoehe + 10);
      const breite = (reihe.werte[g] / max) * skala;
      const farbe = i === 0 ? FARBE.marke : FARBE.hell;
      teile.push(
        `<rect x="${r(k.x)}" y="${r(y)}" width="${r(breite)}" height="${r(hoehe)}" ` +
          `rx="3" fill="${farbe}"/>`,
      );
      const beschriftung = wertText(reihe.werte[g], f.einheit);
      aussagen.push(beschriftung);
      teile.push(
        text(beschriftung, k.x + breite + 16, y + hoehe * 0.78, {
          groesse: 28,
          fett: 700,
        }),
      );
    });
  });

  // Legende direkt unter der letzten Gruppe, nicht am Kastenrand - sonst
  // rutscht sie im hohen Format weit weg von den Balken.
  const legende = oben0 + schritt * gruppen + 10;
  let lx = k.x;
  f.reihen.forEach((reihe, i) => {
    const farbe = i === 0 ? FARBE.marke : FARBE.hell;
    teile.push(
      `<rect x="${r(lx)}" y="${r(legende - 16)}" width="22" height="22" rx="3" fill="${farbe}"/>`,
    );
    teile.push(text(reihe.name, lx + 32, legende + 2, { groesse: 22, farbe: FARBE.grau }));
    lx += 42 + reihe.name.length * 11;
  });
  return { inhalt: teile.join(""), aussagen };
}

// -- Linien ---------------------------------------------------------------

function linienZeichnen(f: Linien, k: Kasten): { inhalt: string; aussagen: string[] } {
  const aussagen: string[] = [];
  const achse = 52;
  // Platz unterhalb: Jahreszahlen, Achsentitel, Legende.
  const hoehe = k.h - achse - 96;
  const xMin = Math.min(...f.x);
  const xMax = Math.max(...f.x);
  const max = Math.max(...f.reihen.flatMap((reihe) => reihe.werte)) * 1.12;
  const px = (w: number) => k.x + ((w - xMin) / (xMax - xMin)) * k.b;
  const py = (w: number) => k.y + hoehe - (w / max) * hoehe;

  const teile: string[] = [
    `<line x1="${r(k.x)}" y1="${r(k.y + hoehe)}" x2="${r(k.x + k.b)}" ` +
      `y2="${r(k.y + hoehe)}" stroke="${FARBE.linie}" stroke-width="2"/>`,
  ];

  if (f.marke) {
    teile.push(
      `<line x1="${r(px(f.marke.bei))}" y1="${r(k.y)}" x2="${r(px(f.marke.bei))}" ` +
        `y2="${r(k.y + hoehe)}" stroke="${FARBE.warn}" stroke-width="2" ` +
        `stroke-dasharray="6 6"/>`,
      text(f.marke.text, px(f.marke.bei) + 10, k.y + 10, {
        groesse: 22,
        fett: 700,
        farbe: FARBE.warn,
      }),
    );
  }

  f.reihen.forEach((reihe, i) => {
    const farbe = reihe.betont ? FARBE.marke : i === 1 ? FARBE.hell : FARBE.aus;
    const punkte = reihe.werte.map((w, j) => `${r(px(f.x[j]))},${r(py(w))}`).join(" ");
    teile.push(
      `<polyline points="${punkte}" fill="none" stroke="${farbe}" ` +
        `stroke-width="${reihe.betont ? 6 : 4}" stroke-linejoin="round"/>`,
    );
    reihe.werte.forEach((w, j) => {
      teile.push(
        `<circle cx="${r(px(f.x[j]))}" cy="${r(py(w))}" r="${reihe.betont ? 8 : 6}" fill="${farbe}"/>`,
      );
      aussagen.push(eur(w));
    });
  });

  f.x.forEach((w) => {
    teile.push(
      text(String(w), px(w), k.y + hoehe + 34, { groesse: 24, fett: 600, anker: "middle" }),
    );
  });
  // Eine Zeile tiefer als die Jahreszahlen, sonst liegt sie auf der 80.
  teile.push(
    text(f.xTitel, k.x + k.b, k.y + hoehe + 66, {
      groesse: 22,
      farbe: FARBE.grau,
      anker: "end",
    }),
  );

  // Legende statt Namen an den Linienenden: Fondspolice und freies Depot
  // laufen rechts fast zusammen, die Namen lagen übereinander.
  let lx = k.x;
  const legende = k.y + hoehe + 100;
  f.reihen.forEach((reihe, i) => {
    const farbe = reihe.betont ? FARBE.marke : i === 1 ? FARBE.hell : FARBE.aus;
    teile.push(
      `<rect x="${r(lx)}" y="${r(legende - 16)}" width="22" height="22" rx="3" fill="${farbe}"/>`,
      text(reihe.name, lx + 32, legende + 2, {
        groesse: 22,
        fett: reihe.betont ? 700 : 400,
        farbe: reihe.betont ? FARBE.text : FARBE.grau,
      }),
    );
    lx += 46 + reihe.name.length * 11;
  });
  return { inhalt: teile.join(""), aussagen };
}

// -- Optionen -------------------------------------------------------------

function optionenZeichnen(f: Optionen, k: Kasten): { inhalt: string; aussagen: string[] } {
  const n = f.zeilen.length;
  const hinweisHoehe = 56;
  const schritt = (k.h - hinweisHoehe) / (n + 1);
  const spalteA = k.x + k.b * 0.56;
  const spalteB = k.x + k.b * 0.76;

  const teile: string[] = [
    text(f.spalten[0], spalteA, k.y + schritt * 0.6, { groesse: 20, farbe: FARBE.grau }),
    text(f.spalten[1], spalteB, k.y + schritt * 0.6, { groesse: 20, farbe: FARBE.grau }),
  ];

  f.zeilen.forEach((z, i) => {
    const y = k.y + schritt * (i + 1.35);
    if (z.betont) {
      teile.push(
        `<rect x="${r(k.x - 16)}" y="${r(y - schritt * 0.62)}" width="${r(k.b + 32)}" ` +
          `height="${r(schritt * 0.92)}" rx="8" fill="${FARBE.flaeche}"/>`,
      );
    }
    teile.push(
      text(z.kennung, k.x, y, {
        groesse: 30,
        fett: 800,
        farbe: z.betont ? FARBE.marke : FARBE.aus,
      }),
      text(z.text, k.x + 48, y, { groesse: 26, fett: z.betont ? 700 : 400 }),
      text(z.a, spalteA, y, {
        groesse: 24,
        fett: z.a === "neu" ? 700 : 400,
        farbe: z.a === "neu" ? FARBE.marke : FARBE.grau,
      }),
      text(z.b, spalteB, y, { groesse: 24, farbe: FARBE.grau }),
    );
  });

  teile.push(
    text(f.hinweis, k.x, k.y + k.h - 12, { groesse: 22, fett: 600, farbe: FARBE.warn }),
  );
  // Die Optionen tragen keine Zahlen - also auch keine Zahlenaussagen.
  return { inhalt: teile.join(""), aussagen: [] };
}

// -- Stempel --------------------------------------------------------------

function stempelZeichnen(f: Stempel, k: Kasten): { inhalt: string; aussagen: string[] } {
  // Erste Fassung deckelte die Karte auf 52 % der Kastenhöhe und setzte die
  // Zeilen mit festen 62 Pixeln - im 16:9-Format fiel das vierte Feld aus der
  // Karte und die Schalterliste lief über die Fußzeile hinaus. Jetzt wird der
  // Zeilenabstand aus dem vorhandenen Platz berechnet.
  const kartenZeilen = f.felder.length;
  // Zwei Spalten für die Schalter: einspaltig blieben im 16:9-Format nur
  // 26 Pixel je Zeile übrig, also rund 12 Pixel Schrift.
  const spalten = 2;
  const jeSpalte = Math.ceil(f.schalter.length / spalten);
  const listenZeilen = jeSpalte + 1; // Überschrift der Liste
  const luft = 44; // zwischen Karte und Liste
  const zeile = Math.min(54, Math.max(30, (k.h - luft) / (kartenZeilen + listenZeilen)));
  const kartenHoehe = kartenZeilen * zeile + zeile * 0.9;
  const kartenBreite = k.b * 0.66;

  const teile: string[] = [
    `<rect x="${r(k.x)}" y="${r(k.y)}" width="${r(kartenBreite)}" ` +
      `height="${r(kartenHoehe)}" rx="12" fill="${FARBE.flaeche}" ` +
      `stroke="${FARBE.hell}" stroke-width="2"/>`,
  ];

  f.felder.forEach((feld, i) => {
    const y = k.y + zeile * (i + 1);
    teile.push(
      text(feld.feld, k.x + 28, y, {
        groesse: Math.min(22, zeile * 0.46),
        farbe: FARBE.grau,
      }),
      text(feld.wert, k.x + kartenBreite - 28, y, {
        groesse: Math.min(26, zeile * 0.52),
        fett: 700,
        anker: "end",
      }),
    );
  });

  const y = k.y + kartenHoehe + luft;
  teile.push(
    text(`Mitgespeichert: die ${f.hinweis}`, k.x, y, {
      groesse: Math.min(26, zeile * 0.52),
      fett: 700,
      farbe: FARBE.marke,
    }),
  );
  const listenOben = y + zeile;
  const spaltenBreite = k.b / spalten;
  f.schalter.forEach((s, i) => {
    const sx = k.x + Math.floor(i / jeSpalte) * spaltenBreite;
    const sy = listenOben + (i % jeSpalte) * zeile;
    teile.push(
      `<circle cx="${r(sx + 8)}" cy="${r(sy - 8)}" r="6" fill="${FARBE.hell}"/>`,
      text(s, sx + 28, sy, { groesse: Math.min(24, zeile * 0.5), farbe: FARBE.grau }),
    );
  });
  return { inhalt: teile.join(""), aussagen: [] };
}

// ------------------------------------------------------------ Nachschlagen

const NACH_SLUG = new Map(BILDWERKE.map((w) => [w.slug, w]));

export function bildwerkFuer(slug: string): Bildwerk | undefined {
  return NACH_SLUG.get(slug);
}

/** Die drei Bild-Adressen eines Beitrags, in der Reihenfolge der Maße. */
export function bildAdressen(slug: string, domain: string): string[] {
  return SEITENVERHAELTNISSE.map((m) => `${domain}${BILDPFAD}/${slug}-${m.kennung}.png`);
}

/** Dateiname ohne Pfad. */
export function bildDatei(slug: string, kennung: string): string {
  return `${slug}-${kennung}.png`;
}
