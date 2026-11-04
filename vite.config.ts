/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";

/**
 * Strukturierte Daten in die ausgelieferte HTML schreiben.
 *
 * Die Anwendung rendert im Browser; ein Crawler sieht ohne das hier nur ein
 * leeres `div`. Das Plugin haengt JSON-LD beim Bauen in den Kopf der Datei -
 * erzeugt aus denselben Modulen wie die sichtbare Seite, damit nicht zwei
 * Fassungen derselben Angaben entstehen.
 */
function strukturierteDatenPlugin(): PluginOption {
  return {
    name: "vorsorgewaage-strukturierte-daten",
    transformIndexHtml: {
      order: "pre",
      async handler(html: string) {
        const { strukturierteDatenHtml } = await import(
          "./src/utils/strukturierteDaten"
        );
        return html.replace("</head>", `${strukturierteDatenHtml()}
  </head>`);
      },
    },
  };
}

/**
 * Vorabtext in die ausgelieferte Startseite schreiben.
 *
 * Gemessen am gebauten `dist/`: Der Rumpf der Startseite enthielt genau
 * `<div id="root"></div>` - null Woerter. Ein Crawler, der JavaScript
 * ausfuehrt, stoert das nicht; die Abrufer der KI-Assistenten tun es nicht
 * und bekamen eine leere Seite. Begruendung und Inhalt stehen in
 * `src/utils/vorabInhalt.ts`.
 *
 * Title und Description kommen aus der Datei selbst, nicht aus einer zweiten
 * Fassung hier: `index.html` ist die Quelle fuer den Kopf der Startseite.
 */
function vorabInhaltPlugin(): PluginOption {
  return {
    name: "vorsorgewaage-vorabinhalt",
    transformIndexHtml: {
      order: "post",
      async handler(html: string) {
        const { vorabHtml, vorabSetzen } = await import("./src/utils/vorabInhalt");
        const titel = html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? "Vorsorgewaage";
        const beschreibung =
          html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? "";
        return vorabSetzen(html, vorabHtml("/", titel, beschreibung));
      },
    },
  };
}

/**
 * Der Ratgeber: aus `ratgeber/*.md` werden beim Bauen fertige HTML-Seiten.
 *
 * Kein zweites Build-System, kein JavaScript im Ergebnis, pro Beitrag eigener
 * Title, eigene Description, eigenes Canonical und ein Article-JSON-LD. Die
 * Begruendung und die Vorlage stehen in `src/utils/ratgeber.ts`; hier liegt nur
 * das Einsammeln der Dateien.
 *
 * Ausgegeben wird `ratgeber/<slug>/index.html`, nicht `<slug>.html`: Vercel
 * liefert eine Verzeichnisdatei auch ohne Schraegstrich am Ende aus, waehrend
 * `<slug>.html` ohne `cleanUrls` in die SPA-Umschreibung fallen wuerde.
 *
 * `configureServer` bedient dieselben Adressen im Entwicklungsserver - sonst
 * waere der Ratgeber nur nach einem Deployment pruefbar.
 */
function ratgeberPlugin(modus: string): PluginOption {
  const ordner = path.resolve(__dirname, "ratgeber");
  /*
   * Einzelne Textseiten direkt unter `/`, aus `seiten/*.md`.
   *
   * „Was ist Vorsorgewaage?" lag zuerst als React-Seite vor. Gemessen am
   * ausgelieferten HTML standen darin null Woerter - der Text erschien erst
   * nach dem Ausfuehren von JavaScript, waehrend eine Ratgeberseite ueber
   * 1.100 Woerter sofort liefert. Fuer eine Seite, die gefunden und zitiert
   * werden soll, ist das der Unterschied. Siehe `einzelseite` in
   * src/utils/ratgeber.ts.
   */
  const seitenOrdner = path.resolve(__dirname, "seiten");

  async function seiten(): Promise<Map<string, string>> {
    const { beitragLesen, beitragSeite, uebersichtSeite, einzelseite, fehlerseite, RATGEBER_PFAD } =
      await import("./src/utils/ratgeber");
    const { readdirSync, readFileSync, existsSync } = await import("node:fs");

    // Die Messung kommt aus derselben Umgebung wie in der Anwendung. Ohne sie
    // entsteht kein Skript - genau wie dort.
    const env = loadEnv(modus, process.cwd(), "VITE_");
    const mess =
      env.VITE_UMAMI_URL && env.VITE_UMAMI_WEBSITE_ID
        ? { basis: env.VITE_UMAMI_URL, seite: env.VITE_UMAMI_WEBSITE_ID }
        : undefined;

    const aus = new Map<string, string>();

    /*
     * Beide Listen werden gesammelt, nicht nur durchgeschleift: `llms.txt`
     * nennt jeden Beitrag mit Titel und Beschreibung und muss dafuer am Ende
     * wissen, was es gibt. Von Hand gepflegt waere die Datei beim ersten
     * neuen Beitrag veraltet.
     */
    let beitraege: ReturnType<typeof beitragLesen>[] = [];
    const textseiten: ReturnType<typeof beitragLesen>[] = [];

    if (existsSync(ordner)) {
      const dateien = readdirSync(ordner).filter((d) => d.endsWith(".md")).sort();
      beitraege = dateien.map((d) =>
        beitragLesen(d, readFileSync(path.join(ordner, d), "utf8")),
      );
      if (beitraege.length > 0) {
        aus.set(`${RATGEBER_PFAD.slice(1)}/index.html`, uebersichtSeite(beitraege, mess));
        for (const b of beitraege) {
          aus.set(`${RATGEBER_PFAD.slice(1)}/${b.slug}/index.html`, beitragSeite(b, mess, beitraege));
        }
      }
    }

    if (existsSync(seitenOrdner)) {
      for (const d of readdirSync(seitenOrdner).filter((f) => f.endsWith(".md")).sort()) {
        const b = beitragLesen(d, readFileSync(path.join(seitenOrdner, d), "utf8"));
        textseiten.push(b);
        const html = einzelseite(b, mess);
        /*
         * Zwei Formen, aus demselben Grund wie in seitenkoepfe.ts: Vercel
         * liefert die Verzeichnisdatei auch ohne Schraegstrich am Ende, der
         * Vorschauserver (sirv) sucht dagegen zuerst `<slug>.html`. Ohne die
         * zweite Form fiele die Seite in der Vorschau - und damit in den
         * E2E-Tests - in die SPA-Umschreibung.
         */
        aus.set(`${b.slug}/index.html`, html);
        aus.set(`${b.slug}.html`, html);
      }
    }

    /*
     * Die Karte der Seite fuer Assistenten, die sie abrufen. Begruendung in
     * `src/utils/llmsTxt.ts`. Steht hier und nicht in `public/`, weil der
     * Inhalt aus denselben Markdown-Dateien kommt wie die Seiten selbst.
     */
    const { llmsTxt } = await import("./src/utils/llmsTxt");
    aus.set("llms.txt", llmsTxt(beitraege, textseiten));

    /*
     * Die Seite fuer unbekannte Adressen.
     *
     * Sie entsteht hier und nicht im `seitenkoepfePlugin`, weil `mess` an
     * dieser Stelle schon vorliegt - die Fehlerseite soll gezaehlt werden wie
     * jede andere Seite. Vercel liefert `404.html` bei statischem
     * Ausgabeordner mit HTTP 404 aus; dass die SPA-Umschreibung sie nie zu
     * Gesicht bekam, war der ganze Fehler.
     */
    aus.set("404.html", fehlerseite(mess));

    return aus;
  }

  return {
    name: "vorsorgewaage-ratgeber",
    async generateBundle() {
      for (const [fileName, source] of await seiten()) {
        this.emitFile({ type: "asset", fileName, source });
      }
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pfad = (req.url ?? "").split("?")[0];
        // Nur Pfade ohne Punkt: Sonst faengt die Mitte Anfragen nach
        // /assets/... und den Modulen des Entwicklungsservers ab.
        /*
         * `llms.txt` hat einen Punkt im Namen und faellt sonst durch die
         * Pruefung unten - dann waere sie nur nach einem Build pruefbar.
         */
        if (pfad === "/llms.txt") {
          res.setHeader("Content-Type", "text/plain; charset=utf-8");
          res.end((await seiten()).get("llms.txt") ?? "");
          return;
        }
        if (pfad === "/" || /\.[a-z0-9]+$/i.test(pfad)) return next();
        const schluessel = pfad.replace(/^\//, "").replace(/\/$/, "");
        const karte = await seiten();
        const html = karte.get(`${schluessel}/index.html`) ?? karte.get(`${schluessel}.html`);
        if (!html) return next();
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(html);
      });
    },
  };
}

/**
 * Der Vorschauserver antwortet wie Vercel - sonst prueft niemand den 404.
 *
 * `vite preview` faellt fuer jede unbekannte Adresse ohne Punkt auf
 * `index.html` zurueck und antwortet mit 200. Das ist genau das Verhalten,
 * das in der Produktion gerade abgeschafft wurde: Ein Playwright-Test gegen
 * die Vorschau wuerde also das Gegenteil dessen messen, was live passiert.
 *
 * Die Mitte wird direkt registriert und nicht in der zurueckgegebenen
 * Funktion - nur dann laeuft sie VOR dem SPA-Rueckfall von Vite.
 *
 * Nachgestellt wird die Vercel-Regel, nicht mehr: Liegt eine Datei vor, soll
 * sie ausgeliefert werden; liegt keine vor, kommt `404.html` mit Status 404.
 *
 * Auch fuer Pfade mit Punkt. Die waren hier zuerst ausgenommen, weil sirv bei
 * fehlender Datei von sich aus 404 liefert - gemessen tat er das nicht:
 * `/ai-catalog.json` und `/gibtesnicht.txt` bekamen 200 mit der `index.html`,
 * weil Vites HTML-Rueckfall vorher greift. Genau der Fall, den die Vorschau
 * ehrlich abbilden soll.
 */
function vorschauPlugin(): PluginOption {
  let ausgabe = "dist";
  return {
    name: "vorsorgewaage-vorschau",
    apply: "serve",
    configResolved(config) {
      ausgabe = config.build.outDir;
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        const pfad = (req.url ?? "/").split("?")[0];
        const ohne = pfad.replace(/^\//, "").replace(/\/$/, "");
        const treffer =
          ohne === "" ||
          // Eine Datei mit Endung liegt unter genau diesem Namen.
          existsSync(path.resolve(ausgabe, ohne)) ||
          existsSync(path.resolve(ausgabe, `${ohne}/index.html`)) ||
          existsSync(path.resolve(ausgabe, `${ohne}.html`));
        if (treffer) return next();
        const seite = path.resolve(ausgabe, "404.html");
        res.statusCode = 404;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(existsSync(seite) ? readFileSync(seite, "utf8") : "404");
      });
    },
  };
}

/**
 * Jede oeffentliche Adresse der Anwendung bekommt ihren eigenen Kopf.
 *
 * Ohne das liefert die Single-Page-App ueberall dieselbe index.html - mit
 * demselben Title und einem Canonical auf die Startseite. Fuer einen Crawler
 * sind das Dubletten, und genau die Seiten, die Besucher bringen sollen
 * (Beispielfall, Preise), waeren nicht indexierbar.
 *
 * Laeuft in `closeBundle`, also nachdem Vite die index.html geschrieben hat:
 * Die Kopien entstehen aus der fertigen Datei und tragen damit automatisch
 * dieselben Buendelnamen.
 */
function seitenkoepfePlugin(): PluginOption {
  let ausgabe = "dist";
  return {
    name: "vorsorgewaage-seitenkoepfe",
    apply: "build",
    configResolved(config) {
      ausgabe = config.build.outDir;
    },
    async closeBundle() {
      const { SEITENKOEPFE, kopfSetzen, kopfSperren, dateinamen } = await import(
        "./src/utils/seitenkoepfe"
      );
      const { NICHT_INDEXIEREN, dateinamenFuer } = await import("./src/utils/adressen");
      const { readFileSync, writeFileSync, mkdirSync, existsSync } = await import("node:fs");
      const quelle = path.resolve(ausgabe, "index.html");
      if (!existsSync(quelle)) return;
      const html = readFileSync(quelle, "utf8");
      const schreiben = (name: string, inhalt: string) => {
        const ziel = path.resolve(ausgabe, name);
        mkdirSync(path.dirname(ziel), { recursive: true });
        writeFileSync(ziel, inhalt, "utf8");
      };

      for (const kopf of SEITENKOEPFE) {
        const inhalt = kopfSetzen(html, kopf);
        for (const name of dateinamen(kopf.pfad)) schreiben(name, inhalt);
      }

      /*
       * Die Adressen hinter der Anmeldung bekommen ebenfalls eine Datei.
       *
       * Zwei Gruende. Erstens: Seit die SPA-Umschreibung entfallen ist,
       * liefert Vercel nur aus, wofuer eine Datei vorliegt - ohne das waere
       * jeder Rechner nach einem Neuladen ein 404. Zweitens trugen sie bisher
       * `index, follow` und das Canonical der Startseite, waren fuer eine
       * Suchmaschine also 19 Dubletten der Startseite. Beides behebt
       * `kopfSperren`.
       */
      const gesperrt = kopfSperren(html);
      for (const pfad of NICHT_INDEXIEREN) {
        for (const name of dateinamenFuer(pfad)) schreiben(name, gesperrt);
      }
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [
    tailwindcss(),
    react(),
    strukturierteDatenPlugin(),
    vorabInhaltPlugin(),
    ratgeberPlugin(mode),
    seitenkoepfePlugin(),
    vorschauPlugin(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  /*
   * Die Fremdpakete aus dem Eintrittsbuendel herausziehen.
   *
   * Gemessen (Sourcemap des Eintritts auf minifizierte Bytes umgerechnet, von
   * 512 kB): react-dom 176,6 kB, @supabase/* zusammen 212,7 kB, react-router
   * 38,2 kB. Eigener Code sind rund 40 kB.
   *
   * Beim Messen VITE_SENTRY_DSN setzen, sonst taeuscht das Ergebnis: Ohne die
   * Variable ist der Zweig um Sentry.init in main.tsx statisch falsch und
   * Rollup wirft die Integrationen weg - das Sentry-Stueck ist dann 5,3 statt
   * 45,1 kB gzip. Siehe docs/startseite-buendel.md.
   *
   * Was das bringt - und was nicht. Beim allerersten Besuch laedt der Browser
   * dieselbe Menge, nur in vier Dateien statt einer. Der Gewinn liegt beim
   * naechsten Deployment: Eigener Code aendert sich oft, diese Pakete fast
   * nie. Bisher machte jede Aenderung an einer Zeile Anwendungscode die ganzen
   * 512 kB im Zwischenspeicher ungueltig; jetzt nur noch die rund 40 kB, in
   * denen die Aenderung steckt.
   *
   * Was es ausdruecklich nicht ist: eine Verkleinerung des ersten Ladens. Die
   * beiden Wege dorthin stehen in docs/startseite-buendel.md - sie verlangen
   * beide eine Entscheidung und sind deshalb nicht hier gemacht.
   *
   * react und react-dom bleiben zusammen in einem Stueck: Getrennt muesste der
   * Browser die Ladereihenfolge einhalten, und dafuer gibt es hier keinen
   * Gegenwert.
   */
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (/[\\/]node_modules[\\/]@supabase[\\/]/.test(id)) return "supabase";
          if (/[\\/]node_modules[\\/]@sentry(-internal)?[\\/]/.test(id)) return "sentry";
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return "react";
          if (/[\\/]node_modules[\\/]react-router(-dom)?[\\/]/.test(id)) return "router";
        },
      },
    },
  },
  test: {
    environment: "node",
    // Auch die Serverfunktionen: Die Drosselung entscheidet ueber Kosten
    // und Zugang, ihre Regeln gehoeren nicht nur in einen Kommentar.
    // Auch .tsx: Bausteine, die eine Aussage tragen, werden gerendert
    // geprueft - die Rechnerseiten liegen hinter der Bezahlschranke.
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "api/**/*.test.ts"],
  },
}));
