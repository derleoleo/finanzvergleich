// Sichtbarer Hinweis, wenn eine Fassung nicht festgehalten werden konnte
// (Audit A02) – mit der Möglichkeit, genau das nachzuholen.
//
// Warum ein Nachtrag und kein erneutes Berechnen: Der Hauptdatensatz ist zu
// diesem Zeitpunkt bereits geschrieben. Ein zweiter Durchlauf des Rechners
// legte einen weiteren an, statt die fehlende Fassung zu ergänzen.

import { useState } from 'react';
import { AlertTriangle, RefreshCw, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  fassungFesthalten,
  FASSUNG_FEHLT_TEXT,
  type FassungEingabe,
} from '@/utils/fassungSpeichern';

type Props = {
  nachtrag: FassungEingabe;
  grund?: string;
  /** Wird nach erfolgreichem Nachtrag gerufen, damit die Liste neu lädt. */
  onNachgetragen?: () => void;
};

export default function FassungFehltHinweis({ nachtrag, grund, onNachgetragen }: Props) {
  const [laeuft, setLaeuft] = useState(false);
  const [erledigt, setErledigt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);

  const nachholen = async () => {
    setLaeuft(true);
    setFehler(null);
    const ergebnis = await fassungFesthalten(nachtrag);
    setLaeuft(false);
    if (ergebnis.stand === 'ok') {
      setErledigt(true);
      onNachgetragen?.();
    } else {
      setFehler(ergebnis.grund);
    }
  };

  if (erledigt) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
        <Check className="w-4 h-4 shrink-0" />
        Die Fassung wurde nachträglich festgehalten.
      </div>
    );
  }

  return (
    <div
      className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4"
      data-pdf-hide
    >
      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="text-sm text-amber-900 space-y-2">
        <p>{FASSUNG_FEHLT_TEXT}</p>
        {(fehler ?? grund) && (
          <p className="text-xs text-amber-700">Meldung: {fehler ?? grund}</p>
        )}
        <Button size="sm" variant="outline" onClick={nachholen} disabled={laeuft}>
          <RefreshCw className={`w-4 h-4 mr-2 ${laeuft ? 'animate-spin' : ''}`} />
          {laeuft ? 'Wird nachgetragen…' : 'Fassung nachtragen'}
        </Button>
      </div>
    </div>
  );
}
