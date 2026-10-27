import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";

/**
 * Kopf und Fuß für öffentliche Seiten außerhalb der Landingpage.
 *
 * Angemeldete sehen alles im Layout mit Seitenleiste; ohne Anmeldung fehlt
 * dieser Rahmen. Ein Weg zurück gehört dazu – und das Impressum muss nach
 * § 5 DDG von jeder Seite aus unmittelbar erreichbar sein, nicht nur von der
 * Startseite.
 *
 * Eine Stelle für alle Gastseiten (Preise, Beispielfall): Zwei Fassungen
 * desselben Fußes würden beim nächsten Rechtslink auseinanderlaufen.
 */
export default function GastRahmen({ children }: { children: ReactNode }) {
  return (
    <>
      <nav className="border-b border-slate-100 bg-white/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" aria-label="Zur Startseite">
            <BrandLogo markClassName="h-8 w-8" textClassName="text-xl text-slate-900" />
          </Link>
          <div className="flex items-center gap-3">
            <a
              href="/ratgeber/"
              className="hidden sm:block text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Ratgeber
            </a>
            <Link
              to="/pricing"
              className="hidden sm:block text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Preise
            </Link>
            <Link
              to="/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Anmelden
            </Link>
            <Link to="/login">
              <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white border-0">
                Kostenlos starten
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {children}

      <footer className="bg-slate-950 text-slate-500 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <BrandLogo className="opacity-60" markClassName="h-7 w-7" textClassName="text-lg text-white" />
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs">
            <a href="/ratgeber/" className="hover:text-white transition-colors">Ratgeber</a>
            <Link to="/impressum" className="hover:text-white transition-colors">Impressum</Link>
            <Link to="/datenschutz" className="hover:text-white transition-colors">Datenschutz</Link>
            <Link to="/agb" className="hover:text-white transition-colors">AGB</Link>
            <Link to="/legal/avv" className="hover:text-white transition-colors">AVV</Link>
            <Link to="/compliance" className="hover:text-white transition-colors">Compliance</Link>
          </div>
          <p className="text-xs">© {new Date().getFullYear()} Luisa Brandt</p>
        </div>
      </footer>
    </>
  );
}
