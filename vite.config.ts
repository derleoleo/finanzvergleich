/// <reference types="vitest/config" />
import { defineConfig, type PluginOption } from "vite";
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

export default defineConfig({
  plugins: [tailwindcss(), react(), strukturierteDatenPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    // Auch die Serverfunktionen: Die Drosselung entscheidet ueber Kosten
    // und Zugang, ihre Regeln gehoeren nicht nur in einen Kommentar.
    include: ["src/**/*.test.ts", "api/**/*.test.ts"],
  },
});
