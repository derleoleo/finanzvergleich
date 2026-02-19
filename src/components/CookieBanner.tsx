import { useState } from "react";
import { Link } from "react-router-dom";

const STORAGE_KEY = "rc_cookie_consent";

export default function CookieBanner() {
  const [visible, setVisible] = useState(
    () => localStorage.getItem(STORAGE_KEY) !== "1"
  );

  if (!visible) return null;

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 text-white px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center gap-3 shadow-lg print:hidden">
      <p className="text-sm text-slate-300 flex-1">
        Diese App verwendet ausschließlich technisch notwendige Browser-Speicher
        (localStorage) für Ihre Sitzung und Eingaben – kein Tracking, keine
        Werbe-Cookies.{" "}
        <Link
          to="/datenschutz"
          className="underline text-slate-200 hover:text-white"
        >
          Mehr erfahren
        </Link>
      </p>
      <button
        onClick={accept}
        className="shrink-0 bg-white text-slate-900 text-sm font-semibold px-4 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
      >
        OK, verstanden
      </button>
    </div>
  );
}
