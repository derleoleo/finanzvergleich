/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
  plugins: [tailwindcss(), react()],
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
