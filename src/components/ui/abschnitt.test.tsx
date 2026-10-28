// Die eine Zusage, an der dieser Baustein haengt: Zugeklappt heisst nicht
// ausgehaengt. Der PDF-Export liest die Abschnitte aus dem DOM - faellt ein
// zugeklappter Inhalt heraus, fehlt er im Dokument, obwohl der Nutzer ihn im
// Export-Dialog angehakt hat.
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Abschnitt } from './abschnitt';

const markup = (offen: boolean) =>
  renderToStaticMarkup(
    <Abschnitt titel="Auszahlphase" untertitel="ab 67" offen={offen} onToggle={() => {}} pdfSection="auszahlung">
      <p>Inhalt, der im PDF stehen muss</p>
    </Abschnitt>,
  );

describe('Zusammenklappbarer Abschnitt', () => {
  it('behält den Inhalt im Markup, auch zugeklappt', () => {
    const zu = markup(false);
    expect(zu).toContain('Inhalt, der im PDF stehen muss');
    expect(zu).not.toContain('display:none');
  });

  it('trägt die Marke, an der der Export ihn aufklappt', () => {
    expect(markup(false)).toContain('data-pdf-expand');
    expect(markup(true)).toContain('data-pdf-expand');
  });

  it('meldet den Zustand an Hilfsmittel', () => {
    expect(markup(true)).toContain('aria-expanded="true"');
    expect(markup(false)).toContain('aria-expanded="false"');
  });

  it('reicht die PDF-Sektion durch', () => {
    expect(markup(true)).toContain('data-pdf-section="auszahlung"');
  });

  it('zeigt Titel und Untertitel', () => {
    expect(markup(false)).toContain('Auszahlphase');
    expect(markup(false)).toContain('ab 67');
  });
});
