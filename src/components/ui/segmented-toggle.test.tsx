// Der Umschalter war auf genau zwei Optionen festgelegt - als Tupeltyp, mit
// grid-cols-2 und einer Tastaturlogik, die nur zwischen 0 und 1 sprang. Die
// Einstiegsleiste des AVD-Rechners braucht drei. Diese Tests halten fest, dass
// die Erweiterung auch wirklich traegt.
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SegmentedToggle } from './segmented-toggle';

const DREI = [
  { value: 'depot', label: 'Freies Depot' },
  { value: 'fonds_lv', label: 'Fondspolice' },
  { value: 'riester_alt', label: 'Riester-Bestand' },
] as const;

describe('Umschalter mit mehr als zwei Feldern', () => {
  it('rendert alle drei Felder als Optionsfelder', () => {
    const html = renderToStaticMarkup(
      <SegmentedToggle value="fonds_lv" onChange={() => {}} options={DREI} ariaLabel="Vergleich" />,
    );
    expect((html.match(/role="radio"/g) ?? [])).toHaveLength(3);
    expect(html).toContain('role="radiogroup"');
    for (const o of DREI) expect(html).toContain(o.label);
  });

  it('markiert genau das gewählte Feld', () => {
    const html = renderToStaticMarkup(
      <SegmentedToggle value="riester_alt" onChange={() => {}} options={DREI} />,
    );
    expect((html.match(/aria-checked="true"/g) ?? [])).toHaveLength(1);
    expect((html.match(/aria-checked="false"/g) ?? [])).toHaveLength(2);
  });

  // Auf 320 px Breite liefen die Beschriftungen aus ihren Feldern heraus:
  // „Riester-Bestand" um 26 px, „Steuerfrei (z.B. vor 2005)" um 104 px. Schuld
  // war das feste Raster aus gleich breiten Spalten (`minmax(0, 1fr)`), das
  // jede Spalte beliebig schmal werden liess. Jetzt bricht die Leiste um, und
  // jedes Feld bleibt mindestens so breit wie seine Beschriftung.
  it('bricht um, statt die Beschriftungen herauslaufen zu lassen', () => {
    const html = renderToStaticMarkup(
      <SegmentedToggle value="depot" onChange={() => {}} options={DREI} />,
    );
    expect(html).toContain('flex-wrap');
    // Ein Feld je Beschriftung, keines schmaler als sein Text: `shrink-0`
    // haelt die gemessene Breite, `whitespace-nowrap` den Text in einer Zeile.
    expect((html.match(/shrink-0/g) ?? [])).toHaveLength(3);
    expect((html.match(/whitespace-nowrap/g) ?? [])).toHaveLength(3);
  });

  // Auf breiten Schirmen war an der alten Darstellung nichts auszusetzen, und
  // sie bleibt deshalb unveraendert: ab `xl` wieder ein Raster aus gleich
  // breiten Spalten in einer Reihe. Dieselbe Auszeichnung traegt beides - was
  // im Raster gilt, ist im Flex-Fluss wirkungslos und umgekehrt.
  it('nutzt ab xl wieder das Raster aus gleich breiten Spalten', () => {
    const html = renderToStaticMarkup(
      <SegmentedToggle value="depot" onChange={() => {}} options={DREI} />,
    );
    expect(html).toContain('xl:inline-grid');
    expect(html).toContain('repeat(3, minmax(0, 1fr))');

    const zwei = renderToStaticMarkup(
      <SegmentedToggle
        value="a"
        onChange={() => {}}
        options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] as const}
      />,
    );
    expect(zwei).toContain('repeat(2, minmax(0, 1fr))');
  });

  // Das gewaehlte Feld ist fett, und fett ist breiter. Ohne Platzhalter waere
  // die Leiste beim Umschalten gesprungen: auf 420 px von einer Reihe auf zwei,
  // nur weil „Riester-Bestand" gewaehlt wurde.
  it('haelt die Feldbreite unabhaengig davon, was gewaehlt ist', () => {
    const html = renderToStaticMarkup(
      <SegmentedToggle value="depot" onChange={() => {}} options={DREI} />,
    );
    // Jede Beschriftung steht zweimal da: einmal sichtbar, einmal unsichtbar
    // und fett als Platzhalter fuer die Breite.
    for (const o of DREI) expect((html.match(new RegExp(o.label, 'g')) ?? [])).toHaveLength(2);
    // Und der Platzhalter ist fuer Screenreader weg, sonst hiesse jedes Feld
    // doppelt.
    expect((html.match(/aria-hidden="true"[^>]*class="invisible/g) ?? [])).toHaveLength(3);
  });

  it('faellt auf das erste Feld zurueck, wenn der Wert zu keinem passt', () => {
    const html = renderToStaticMarkup(
      <SegmentedToggle value={'unbekannt' as 'depot'} onChange={() => {}} options={DREI} />,
    );
    // Kein Feld ist angehakt - aber die Gruppe bleibt mit der Tastatur
    // erreichbar, und zwar beim ersten Feld.
    expect(html).not.toContain('aria-checked="true"');
    expect((html.match(/tabindex="0"/g) ?? [])).toHaveLength(1);
    const ersterKnopf = html.indexOf('role="radio"');
    expect(html.indexOf('tabindex="0"')).toBeLessThan(html.indexOf('Fondspolice'));
    expect(ersterKnopf).toBeGreaterThan(0);
  });
});
