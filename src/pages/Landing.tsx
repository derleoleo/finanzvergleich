import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Calculator, DollarSign, Target, TrendingDown, Wallet,
  Check, ArrowRight, Shield, BarChart3, FileDown,
} from "lucide-react";

const features = [
  { icon: Calculator, title: "Fonds-Sparvertrag", desc: "LV vs. Depot – monatliche Sparrate mit vollständiger Kostenanalyse und Steuervergleich." },
  { icon: DollarSign, title: "Fonds-Einmalanlage", desc: "Einmalbetrag vergleichen – ideal für Erbschaften, Bonuszahlungen oder vorhandenes Kapital." },
  { icon: Target, title: "BestAdvice", desc: "Bestandsvertrag analysieren: Lohnt sich die Umschichtung in eine neue Fonds-LV?" },
  { icon: TrendingDown, title: "Rentenlücke", desc: "Versorgungslücke berechnen und den monatlichen Sparbedarf zur Schließung ermitteln." },
  { icon: Wallet, title: "Entnahmeplan", desc: "Kapitalentnahme simulieren – wie lange reicht das Kapital bei welcher Entnahmerate?" },
];

const proFeatures = [
  "Alle 5 Vergleichsrechner",
  "PDF-Export mit Berater-Branding",
  "BestAdvice & Rentenlücken-Rechner",
  "Voreinstellungen für schnellere Eingabe",
  "10 Berechnungen pro Monat",
  "14 Tage kostenlos testen",
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">

      {/* Navbar */}
      <nav className="border-b border-slate-100 bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <img src="/rentencheck-logo.svg" alt="RentenCheck" className="h-9 w-auto" />
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
              Anmelden
            </Link>
            <Link
              to="/login"
              className="text-sm font-semibold bg-slate-900 text-white px-4 py-2 rounded-xl hover:bg-slate-700 transition-colors"
            >
              Kostenlos starten
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-linear-to-br from-[#0B1E3D] to-[#163566] text-white py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-block bg-[#D4A843]/20 text-[#F0C96B] text-xs font-semibold px-3 py-1 rounded-full mb-6 border border-[#D4A843]/30">
            14 Tage kostenlos testen — keine Kreditkarte erforderlich
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
            LV oder Depot?<br />
            <span className="text-[#D4A843]">Jetzt professionell vergleichen.</span>
          </h1>
          <p className="text-lg text-slate-300 max-w-xl mx-auto mb-10">
            Professionelle Vergleichsrechner für Finanzberater und informierte Anleger.
            Transparent, nachvollziehbar, exportierbar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/login"
              className="bg-[#D4A843] hover:bg-[#F0C96B] text-[#0B1E3D] font-bold px-8 py-3.5 rounded-xl text-base transition-colors flex items-center justify-center gap-2"
            >
              Kostenlos starten <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to={createPageUrl("Pricing")}
              className="border border-white/30 hover:border-white/60 text-white px-8 py-3.5 rounded-xl text-base transition-colors text-center"
            >
              Preise ansehen
            </Link>
          </div>
        </div>
      </section>

      {/* So funktioniert's */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-12">So einfach geht's</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Registrieren", desc: "Kostenlosen Account anlegen – in unter einer Minute, keine Kreditkarte." },
              { step: "2", title: "Daten eingeben", desc: "Produkt-Konditionen eingeben. Voreinstellungen sparen Ihnen Zeit bei jedem neuen Kunden." },
              { step: "3", title: "Ergebnis exportieren", desc: "Auswertung als PDF mit Ihrem Logo und Berater-Profil an Kunden weitergeben." },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white text-xl font-bold flex items-center justify-center mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Rechner */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-3">Alle Rechner auf einen Blick</h2>
          <p className="text-slate-500 text-center mb-12 max-w-xl mx-auto">
            Von der monatlichen Sparrate bis zum Entnahmeplan – RentenCheck deckt alle wichtigen Vergleiche ab.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div key={f.title} className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center mb-4">
                  <f.icon className="w-5 h-5 text-slate-700" />
                </div>
                <h3 className="font-semibold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-600">{f.desc}</p>
              </div>
            ))}
            {/* Filler card */}
            <div className="bg-linear-to-br from-slate-800 to-slate-900 rounded-2xl p-6 flex flex-col justify-center items-center text-center">
              <FileDown className="w-8 h-8 text-[#D4A843] mb-3" />
              <p className="text-white font-semibold text-sm">PDF-Export mit Ihrem Logo</p>
              <p className="text-slate-400 text-xs mt-1">Ab Pro-Plan verfügbar</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-slate-900 text-center mb-3">Einfache Preise</h2>
          <p className="text-slate-500 text-center mb-12">Kostenlos starten, jederzeit kündbar.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Free */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Free</p>
              <div className="text-3xl font-bold text-slate-900 mb-1">0 €</div>
              <p className="text-sm text-slate-500 mb-6">für immer</p>
              <ul className="space-y-2 text-sm text-slate-700">
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500 shrink-0" /> Fonds-Sparvertrag</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500 shrink-0" /> Fonds-Einmalanlage</li>
                <li className="flex items-center gap-2"><Check className="w-4 h-4 text-green-500 shrink-0" /> 3 Berechnungen/Monat</li>
              </ul>
              <Link to="/login" className="mt-6 block text-center border border-slate-200 rounded-xl py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                Kostenlos starten
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-slate-900 rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-3">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pro</p>
                <span className="text-xs bg-[#D4A843] text-[#0B1E3D] font-bold px-2 py-0.5 rounded-full">14 Tage gratis</span>
              </div>
              <div className="text-3xl font-bold text-white mb-1">19,99 €</div>
              <p className="text-sm text-slate-400 mb-6">pro Monat</p>
              <ul className="space-y-2 text-sm text-slate-300">
                {proFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#D4A843] shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              <Link to={createPageUrl("Pricing")} className="mt-6 block text-center bg-[#D4A843] hover:bg-[#F0C96B] text-[#0B1E3D] rounded-xl py-2.5 text-sm font-bold transition-colors">
                14 Tage kostenlos testen
              </Link>
            </div>
          </div>

          <p className="text-center mt-6 text-sm text-slate-500">
            Auch als Jahrestarif verfügbar – spare 2 Monate.{" "}
            <Link to={createPageUrl("Pricing")} className="text-blue-600 hover:underline">Alle Pläne ansehen →</Link>
          </p>
        </div>
      </section>

      {/* Trust strip */}
      <section className="py-12 px-6 border-t border-slate-100">
        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
          {[
            { icon: Shield, text: "Zahlung sicher über Stripe" },
            { icon: BarChart3, text: "Berechnungen lokal & datenschutzkonform" },
            { icon: Wallet, text: "Jederzeit kündbar" },
          ].map((item) => (
            <div key={item.text} className="flex flex-col items-center gap-2">
              <item.icon className="w-6 h-6 text-slate-400" />
              <p className="text-sm text-slate-600">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <img src="/rentencheck-logo.svg" alt="RentenCheck" className="h-8 w-auto opacity-80" />
          <div className="flex gap-6 text-xs">
            <Link to="/impressum" className="hover:text-white transition-colors">Impressum</Link>
            <Link to="/datenschutz" className="hover:text-white transition-colors">Datenschutz</Link>
            <Link to="/agb" className="hover:text-white transition-colors">AGB</Link>
          </div>
          <p className="text-xs">© {new Date().getFullYear()} Leonard Brandt</p>
        </div>
      </footer>
    </div>
  );
}
