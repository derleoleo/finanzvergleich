import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import BrandLogo from "@/components/BrandLogo";

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
export default function GastRahmen({
  children,
  /**
   * Anmelden und „Kostenlos starten" anzeigen?
   *
   * Auf der Anmeldeseite selbst führen beide dorthin, wo man schon ist –
   * dort bleibt die Leiste bei Marke und Verweisen.
   */
  aktionen = true,
}: {
  children: ReactNode;
  aktionen?: boolean;
}) {
  return (
    <>
      <nav className="border-b border-slate-100 bg-white/90 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* inline-flex: Ein schlichter Anker baut eine Textzeile um das
              Logo und macht die Leiste zwei Pixel hoeher als die der
              Startseite, wo die Marke ohne Anker steht. */}
          <Link to="/" aria-label="Zur Startseite" className="inline-flex">
            <BrandLogo markClassName="h-8 w-8" textClassName="text-xl text-slate-900" />
          </Link>
          {/*
            Drei Gruppen, genau wie auf der Landingpage: Marke links,
            Navigation in der Mitte, Aktionen rechts. Vorher steckten
            Navigation und Aktionen in einer Gruppe - dann schiebt
            `justify-between` alles an den rechten Rand, und die Leiste sieht
            anders aus als die der Startseite.
          */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-500">
            <a href="/ratgeber/" className="hover:text-slate-900 transition-colors">Ratgeber</a>
            <Link to="/beispiel" className="hover:text-slate-900 transition-colors">Beispielfall</Link>
            <Link to="/pricing" className="hover:text-slate-900 transition-colors">Preise</Link>
          </div>
          {/* min-h-9: Ohne Aktionen faellt die Leiste auf die Hoehe der
              Marke zusammen und waere auf der Anmeldeseite vier Pixel
              niedriger als ueberall sonst. */}
          <div className="flex items-center gap-3 min-h-9">
            {aktionen && (
              <>
                <Link
                  to="/login"
                  className="hidden md:block text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Anmelden
                </Link>
                {/* Dieselben Klassen wie in Landing.tsx. Die Button-Komponente
                    hat eine eigene Hoehe und machte die Leiste zwei Pixel
                    hoeher als die der Startseite. */}
                <Link
                  to="/login"
                  className="text-sm font-semibold bg-brand-cyan hover:bg-brand-blue text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Kostenlos starten
                </Link>
              </>
            )}
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
