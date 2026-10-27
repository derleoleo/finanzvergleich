/// <reference types="vitest/config" />
import { defineConfig, loadEnv, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

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

  async function seiten(): Promise<Map<string, string>> {
    const { beitragLesen, beitragSeite, uebersichtSeite, RATGEBER_PFAD } = await import(
      "./src/utils/ratgeber"
    );
    const { readdirSync, readFileSync, existsSync } = await import("node:fs");
    if (!existsSync(ordner)) return new Map();

    // Die Messung kommt aus derselben Umgebung wie in der Anwendung. Ohne sie
    // entsteht kein Skript - genau wie dort.
    const env = loadEnv(modus, process.cwd(), "VITE_");
    const mess =
      env.VITE_UMAMI_URL && env.VITE_UMAMI_WEBSITE_ID
        ? { basis: env.VITE_UMAMI_URL, seite: env.VITE_UMAMI_WEBSITE_ID }
        : undefined;

    const dateien = readdirSync(ordner).filter((d) => d.endsWith(".md")).sort();
    const beitraege = dateien.map((d) =>
      beitragLesen(d, readFileSync(path.join(ordner, d), "utf8")),
    );

    const aus = new Map<string, string>();
    if (beitraege.length === 0) return aus;
    aus.set(`${RATGEBER_PFAD.slice(1)}/index.html`, uebersichtSeite(beitraege, mess));
    for (const b of beitraege) {
      aus.set(`${RATGEBER_PFAD.slice(1)}/${b.slug}/index.html`, beitragSeite(b, mess));
    }
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
        if (!pfad.startsWith("/ratgeber")) return next();
        const schluessel = pfad.replace(/^\//, "").replace(/\/$/, "");
        const karte = await seiten();
        const html =
          karte.get(`${schluessel}/index.html`) ?? karte.get(schluessel.replace(/$/, "/index.html"));
        if (!html) return next();
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(html);
      });
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [tailwindcss(), react(), strukturierteDatenPlugin(), ratgeberPlugin(mode)],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
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
