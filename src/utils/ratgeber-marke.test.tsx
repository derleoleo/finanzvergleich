// Haelt die Bildmarke der statischen Ratgeberseiten mit der Komponente
// zusammen.
//
// Die Ratgeberseiten entstehen ohne React, ihre Bildmarke steht deshalb als
// Zeichenkette in utils/ratgeber.ts. Vorher stand dort eine ganz andere,
// selbstgezeichnete Waage - und niemand hat es gemerkt, weil nichts die
// beiden verglichen hat. Auf Seiten, die Vertrauen gewinnen sollen, ist eine
// abweichende Marke kein Schoenheitsfehler.
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BrandMark } from '@/components/BrandLogo';
import { BILDMARKE } from './ratgeber';

/** Alle Formangaben eines SVG, in der Reihenfolge des Markups. */
function formen(svg: string): string[] {
  return [
    ...(svg.match(/\sd="[^"]+"/g) ?? []),
    ...(svg.match(/\sx="[^"]+"/g) ?? []),
    ...(svg.match(/\scx="[^"]+"/g) ?? []),
  ].map((t) => t.trim());
}

describe('Bildmarke auf den statischen Seiten', () => {
  const komponente = renderToStaticMarkup(<BrandMark />);

  it('zeichnet dieselben Formen wie die Komponente', () => {
    expect(formen(BILDMARKE)).toEqual(formen(komponente));
  });

  it('trägt dieselben Farben', () => {
    const farben = (s: string) => [...new Set(s.match(/#[0-9a-fA-F]{6}/g) ?? [])].sort();
    expect(farben(BILDMARKE)).toEqual(farben(komponente));
  });

  it('nutzt denselben Zeichenbereich', () => {
    expect(BILDMARKE).toContain('viewBox="0 0 48 48"');
    expect(komponente).toContain('viewBox="0 0 48 48"');
  });
});
