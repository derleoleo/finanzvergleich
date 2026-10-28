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

  it('teilt das Raster nach der Zahl der Felder', () => {
    const drei = renderToStaticMarkup(
      <SegmentedToggle value="depot" onChange={() => {}} options={DREI} />,
    );
    expect(drei).toContain('repeat(3, minmax(0, 1fr))');

    const zwei = renderToStaticMarkup(
      <SegmentedToggle
        value="a"
        onChange={() => {}}
        options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }] as const}
      />,
    );
    expect(zwei).toContain('repeat(2, minmax(0, 1fr))');
  });

  it('faellt auf das erste Feld zurueck, wenn der Wert zu keinem passt', () => {
    const html = renderToStaticMarkup(
      <SegmentedToggle value={'unbekannt' as 'depot'} onChange={() => {}} options={DREI} />,
    );
    // Kein Feld ist angehakt, der Schieber steht aber links statt irgendwo.
    expect(html).toContain('translateX(calc(0 * (100% + 0.25rem)))');
  });
});
