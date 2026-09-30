// Weiterempfehlung: eigener Link zum Teilen, Stand der Empfehlungen.
//
// Der Code wird erst beim Öffnen erzeugt – wer nie empfiehlt, bekommt auch
// keinen. Belohnt wird erst, wenn der Geworbene nach dem Testzeitraum
// tatsächlich zahlt; das steht auch so im Text, damit niemand auf eine
// sofortige Gutschrift wartet.
import { useState } from "react";
import { Gift, Copy, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

type Stand = {
  code: string;
  link: string;
  geworben: number;
  belohnt: number;
};

export default function Weiterempfehlung() {
  const [offen, setOffen] = useState(false);
  const [stand, setStand] = useState<Stand | null>(null);
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState(false);
  const [kopiert, setKopiert] = useState(false);

  const oeffnen = async () => {
    setOffen(true);
    if (stand || laedt) return;
    setLaedt(true);
    setFehler(false);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Keine Sitzung");

      const res = await fetch("/api/referral", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error("Abruf fehlgeschlagen");
      setStand((await res.json()) as Stand);
    } catch {
      setFehler(true);
    } finally {
      setLaedt(false);
    }
  };

  const kopieren = async () => {
    if (!stand) return;
    try {
      await navigator.clipboard.writeText(stand.link);
      setKopiert(true);
      setTimeout(() => setKopiert(false), 2000);
    } catch {
      // Zwischenablage gesperrt – der Link steht sichtbar daneben
      setKopiert(false);
    }
  };

  if (!offen) {
    return (
      <Button
        variant="outline"
        className="w-full justify-start text-slate-600 hover:text-slate-900"
        onClick={oeffnen}
      >
        <Gift className="w-4 h-4 mr-2" />
        Weiterempfehlen
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-medium text-sm text-slate-900">Weiterempfehlen</span>
        <Button size="sm" variant="ghost" onClick={() => setOffen(false)}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      {laedt && <p className="text-xs text-slate-500">Link wird erzeugt…</p>}

      {fehler && (
        <p className="text-xs text-red-500">
          Der Link konnte nicht geladen werden. Bitte später erneut versuchen.
        </p>
      )}

      {stand && (
        <>
          <p className="text-xs text-slate-600 leading-relaxed">
            Empfehlen Sie Vorsorgewaage weiter: Wer über Ihren Link ein Premium-Abo
            abschließt, spart bei der ersten Rechnung – und Sie bekommen den Rabatt
            auf Ihr laufendes Abo, sobald die erste Zahlung eingegangen ist.
          </p>

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-2">
            <div className="text-[11px] text-slate-500 mb-1">Ihr Empfehlungslink</div>
            <div className="text-[11px] text-slate-800 break-all font-mono">
              {stand.link}
            </div>
          </div>

          <Button
            size="sm"
            className="w-full bg-slate-800 hover:bg-slate-700"
            onClick={kopieren}
          >
            {kopiert ? (
              <>
                <Check className="w-3 h-3 mr-2" /> Kopiert
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 mr-2" /> Link kopieren
              </>
            )}
          </Button>

          <p className="text-[11px] text-slate-500">
            {stand.geworben === 0
              ? "Noch keine Empfehlung erfasst."
              : `${stand.geworben} ${stand.geworben === 1 ? "Empfehlung" : "Empfehlungen"} erfasst, davon ${stand.belohnt} gutgeschrieben.`}
          </p>
        </>
      )}
    </div>
  );
}
