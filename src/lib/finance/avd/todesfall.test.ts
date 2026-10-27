// Todesfall-Szenarien: Was bleibt den Hinterbliebenen?
//
// Die Fragen, die hier festgeschrieben sind: Wird die Förderung nur dort
// zurückgefordert, wo das Gesetz es verlangt? Bleibt die Übertragung auf den
// Ehegatten ungeschmälert? Und sagt der Rechner es, wenn aus dem Vertrag
// nichts mehr kommt - statt eine Null ohne Begründung hinzustellen?
import { describe, expect, it } from 'vitest';
import { simuliereAvd, type AvdEingabe } from './simulation';
import { berechneTodesfallSzenarien, barwertRaten, restkapitalNachRaten } from './todesfall';
import { RECHTS_FLAGS_DEFAULT } from './config';

function eingabe(over: Partial<AvdEingabe> = {}): AvdEingabe {
  return {
    geburtsjahr: 1990,
    beitragsjahrStart: 2027,
    auszahlungsbeginnAlter: 67,
    berechtigung: 'unmittelbar',
    splitting: false,
    kinder: 0,
    ehegatteMittelbarBerechtigt: false,
    eigenbeitragMonatlich: 150,
    beitragsdynamikPaJahr: 0,
    zvEJahr: 48000,
    kirchensteuersatz: 0,
    soliBeruecksichtigen: false,
    steuersatzImAlter: 0.3,
    effektivkostenPaJahr: 0.005,
    fixkostenProJahr: 0,
    renditeBruttoPaJahr: 0.07,
    auszahlform: 'auszahlplan',
    teilkapitalAnteil: 0,
    auszahlplanEndalter: 85,
    rentenfaktorProZehntausend: 30,
    kvStatusImAlter: 'pflicht',
    depotKostenPaJahr: 0.003,
    vergleichsmodus: 'gleicher_nettoaufwand',
    sparerpauschbetrag: 0,
    inflationPaJahr: 0.02,
    zulagenZuflussVerzoegerungJahre: 1,
    erstattungReinvestieren: false,
    ...over,
  };
}

const szenarien = (e: AvdEingabe, alter: number[], garantie?: number) =>
  berechneTodesfallSzenarien({
    basis: e,
    ergebnis: simuliereAvd(e),
    alter,
    rentengarantiezeitJahre: garantie,
  });

describe('Todesfall in der Ansparphase', () => {
  it('überträgt dem Ehegatten das volle Kapital, ohne Rückforderung', () => {
    const e = eingabe();
    const [s] = szenarien(e, [50]);
    expect(s.phase).toBe('anspar');
    expect(s.ehegatte.rueckforderung).toBe(0);
    expect(s.ehegatte.steuer).toBe(0);
    expect(s.ehegatte.verfuegbar).toBeCloseTo(s.ehegatte.kapitalGesamt, 6);
    // § 93 Abs. 1 S. 4 Buchst. c EStG: förderunschädlich
    expect(s.ehegatte.verfuegbar).toBeGreaterThan(s.sonstige.verfuegbar);
  });

  it('fordert von sonstigen Erben genau die bis dahin erhaltene Förderung zurück', () => {
    const e = eingabe();
    const r = simuliereAvd(e);
    const [s] = szenarien(e, [50]);
    // Gegenprobe aus der Jahrestabelle: gutgeschriebene Zulagen plus
    // festgestellte Steuerermäßigung bis einschließlich des Todesjahres.
    // Beantragte, aber noch nicht zugeflossene Zulagen stecken nicht im
    // ausgezahlten Vermögen und werden deshalb nicht zurückgefordert
    // (§ 93 Abs. 1 S. 1 EStG).
    const bisDahin = r.jahre.filter((z) => z.alter <= 50);
    const erwartet = bisDahin.reduce(
      (n, z) => n + z.zulageZugeflossen + z.steuererstattung,
      0
    );
    // Der Unterschied ist nicht null - sonst prüfte der Test nichts
    const mitAnspruch = bisDahin.reduce((n, z) => n + z.zulage + z.steuererstattung, 0);
    expect(mitAnspruch).toBeGreaterThan(erwartet);
    expect(bisDahin.length).toBeGreaterThan(0);
    expect(s.sonstige.rueckforderung).toBeCloseTo(erwartet, 6);
    expect(s.sonstige.steuer).toBeGreaterThan(0);
    expect(s.sonstige.verfuegbar).toBeCloseTo(
      s.sonstige.kapitalGesamt - s.sonstige.rueckforderung - s.sonstige.steuer,
      6
    );
  });

  it('nennt die Kapitalstände zum jeweiligen Alter, nicht das Endkapital', () => {
    const e = eingabe();
    const r = simuliereAvd(e);
    const [frueh, spaet] = szenarien(e, [45, 60]);
    // Beide liegen unter dem Endkapital - genau das war der Zweck der Reihe
    expect(frueh.ehegatte.kapitalGesamt).toBeLessThan(r.endkapitalNominal);
    expect(spaet.ehegatte.kapitalGesamt).toBeLessThan(r.endkapitalNominal);
    expect(spaet.ehegatte.kapitalGesamt).toBeGreaterThan(frueh.ehegatte.kapitalGesamt);
    expect(spaet.sonstige.rueckforderung).toBeGreaterThan(frueh.sonstige.rueckforderung);
    expect(frueh.jahr).toBeLessThan(spaet.jahr);
  });

  it('weist aus, wenn Rückforderung und Steuer das Kapital übersteigen', () => {
    // Ein Vertrag, dessen Fixkosten den Beitrag aufzehren: Das Kapital kommt
    // nicht vom Boden, die erhaltene Förderung bleibt aber zurückzuzahlen.
    // Das ist der Fall, in dem an sonstige Erben nichts geht und der Rest aus
    // dem übrigen Nachlass zu tragen ist.
    const e = eingabe({
      eigenbeitragMonatlich: 150,
      fixkostenProJahr: 2400,
      kinder: 2,
      kinderKindergeldBisJahr: [],
    });
    const [s] = szenarien(e, [45]);
    expect(s.sonstige.rueckforderung).toBeGreaterThan(s.sonstige.kapitalGesamt);
    expect(s.sonstige.verfuegbar).toBe(0);
    expect(s.hinweise.some((h) => h.text.includes('übersteigen'))).toBe(true);
  });

  it('benennt die nicht reinvestierte Erstattung, die trotzdem zurückzuzahlen ist', () => {
    const ohne = szenarien(eingabe({ erstattungReinvestieren: false }), [50])[0];
    expect(ohne.hinweise.some((h) => h.text.includes('nicht wieder angelegt'))).toBe(true);
    const mit = szenarien(eingabe({ erstattungReinvestieren: true }), [50])[0];
    expect(mit.hinweise.some((h) => h.text.includes('nicht wieder angelegt'))).toBe(false);
    // Wieder angelegt steckt sie im Kapital - dann ist auch mehr da.
    expect(mit.ehegatte.kapitalGesamt).toBeGreaterThan(ohne.ehegatte.kapitalGesamt);
  });

  it('erfindet vor dem ersten Beitragsjahr keine Zahlen', () => {
    const [s] = szenarien(eingabe(), [30]);
    expect(s.phase).toBe('vor_beginn');
    expect(s.ehegatte.kapitalGesamt).toBe(0);
    expect(s.sonstige.verfuegbar).toBe(0);
    expect(s.hinweise.some((h) => h.text.includes('vor dem ersten Beitragsjahr'))).toBe(true);
  });

  it('erinnert an die Erbschaftsteuer, die hier nicht gerechnet wird', () => {
    for (const s of szenarien(eingabe(), [40, 50, 67, 75])) {
      expect(s.hinweise.some((h) => h.text.includes('Erbschaftsteuer'))).toBe(true);
    }
  });
});

describe('Todesfall in der Auszahlphase', () => {
  it('vererbt beim Auszahlplan das noch nicht ausgezahlte Kapital', () => {
    const e = eingabe({ auszahlform: 'auszahlplan' });
    const [beiBeginn, spaeter, nachEnde] = szenarien(e, [67, 75, 86]);

    expect(beiBeginn.phase).toBe('auszahl');
    expect(spaeter.phase).toBe('auszahl');
    expect(spaeter.ehegatte.kapitalGesamt).toBeLessThan(beiBeginn.ehegatte.kapitalGesamt);
    expect(spaeter.ehegatte.kapitalGesamt).toBeGreaterThan(0);

    // Nach dem Planende ist nichts mehr da - und das steht als Hinweis dabei.
    expect(nachEnde.phase).toBe('nach_plan_ende');
    expect(nachEnde.sonstige.verfuegbar).toBe(0);
    expect(nachEnde.hinweise.some((h) => h.text.includes('verbraucht'))).toBe(true);
  });

  it('fordert nur die Förderung des noch nicht ausgezahlten Teils zurück', () => {
    const e = eingabe();
    const r = simuliereAvd(e);
    const [beiBeginn, spaeter] = szenarien(e, [67, 80]);
    // Zu Beginn steht praktisch die ganze Förderung im Raum ...
    expect(beiBeginn.sonstige.rueckforderung).toBeGreaterThan(r.summeFoerderung * 0.9);
    expect(beiBeginn.sonstige.rueckforderung).toBeLessThanOrEqual(r.summeFoerderung + 1e-6);
    // ... und schmilzt mit jeder gezahlten Rate.
    expect(spaeter.sonstige.rueckforderung).toBeLessThan(
      beiBeginn.sonstige.rueckforderung
    );
  });

  it('zieht beim Teilkapital keine Förderung zweimal ein', () => {
    const e = eingabe({ teilkapitalAnteil: 0.3 });
    const [s] = szenarien(e, [70]);
    expect(s.teilkapitalBereitsAusgezahlt).toBeGreaterThan(0);
    expect(s.hinweise.some((h) => h.text.includes('privaten Vermögen'))).toBe(true);
  });

  it('lässt der Leibrente ohne Garantiezeit nichts übrig und sagt das', () => {
    const e = eingabe({ auszahlform: 'leibrente' });
    const [s] = szenarien(e, [75], 0);
    expect(s.ehegatte.verfuegbar).toBe(0);
    expect(s.garantierteRestrente).toBe(0);
    expect(s.hinweise.some((h) => h.text.includes('Ohne Rentengarantiezeit'))).toBe(true);
  });

  it('rechnet innerhalb der Rentengarantiezeit den Barwert der Restraten', () => {
    const e = eingabe({ auszahlform: 'leibrente' });
    const innen = szenarien(e, [70], 10)[0];
    const aussen = szenarien(e, [80], 10)[0];
    expect(innen.garantierteRestrente).toBeGreaterThan(0);
    expect(innen.ehegatte.verfuegbar).toBeCloseTo(innen.garantierteRestrente!, 6);
    expect(innen.phase).toBe('auszahl');
    expect(aussen.garantierteRestrente).toBe(0);
    expect(aussen.phase).toBe('nach_plan_ende');
    // Je länger die Garantie, desto mehr bleibt beim gleichen Todesalter
    const lang = szenarien(e, [70], 20)[0];
    expect(lang.garantierteRestrente!).toBeGreaterThan(innen.garantierteRestrente!);
    // Der Rentenfaktor wird dafür bewusst nicht verändert - das muss dastehen
    expect(innen.hinweise.some((h) => h.text.includes('Rentenfaktor'))).toBe(true);
  });
});

describe('Vergleichspartner im Todesfall', () => {
  it('rechnet das freie Depot in beiden Phasen mit', () => {
    const [anspar, auszahl] = szenarien(eingabe(), [50, 70]);
    expect(anspar.freiesDepot).toBeGreaterThan(0);
    expect(auszahl.freiesDepot).toBeGreaterThan(0);
  });

  it('zeigt die Fondspolice nur, wenn sie der gewählte Partner ist', () => {
    const ohne = szenarien(eingabe(), [50])[0];
    expect(ohne.fondsLv).toBeUndefined();

    const e = eingabe({
      vergleichspartner: 'fonds_lv',
      fondsLv: {
        renditeBruttoPaJahr: 0.07,
        terPaJahr: 0.003,
        kostenart: 'prozent',
        abschlusskostenGesamt: 0,
        verwaltungProMonat: 0,
        effektivkostenPaJahr: 0.012,
      },
    });
    const mit = szenarien(e, [50])[0];
    expect(mit.fondsLv).toBeGreaterThan(0);
    // Todesfallleistung einkommensteuerfrei: kein Abzug, deshalb liegt sie
    // über dem, was aus dem AVD an sonstige Erben geht.
    expect(mit.fondsLv!).toBeGreaterThan(mit.sonstige.verfuegbar);
    expect(mit.hinweise.some((h) => h.text.includes('einkommensteuerfrei'))).toBe(true);
  });

  it('wendet auf den Riester-Altvertrag dieselbe Rückforderung an', () => {
    const e = eingabe({
      vergleichspartner: 'riester_alt',
      riester: {
        beitragspflEinnahmenVorjahr: 45000,
        kinderGeborenVor2008: 0,
        effektivkostenPaJahr: 0.02,
        renditeBruttoPaJahr: 0.03,
      },
    });
    const [s] = szenarien(e, [50]);
    expect(s.riesterAlt).toBeDefined();
    expect(s.riesterAlt!.rueckforderung).toBeGreaterThan(0);
    expect(s.riesterAlt!.verfuegbar).toBeLessThan(s.riesterAlt!.kapitalGesamt);
    expect(szenarien(eingabe(), [50])[0].riesterAlt).toBeUndefined();
  });
});

describe('Rechenhelfer', () => {
  it('bricht das Restkapital nicht unter null', () => {
    expect(restkapitalNachRaten(1000, 200, 0, 10)).toBe(0);
    expect(restkapitalNachRaten(1000, 100, 0, 5)).toBeCloseTo(500, 6);
    expect(restkapitalNachRaten(0, 100, 0.01, 12)).toBe(0);
  });

  it('rechnet den Barwert auch ohne Zins', () => {
    expect(barwertRaten(100, 0, 12)).toBeCloseTo(1200, 6);
    expect(barwertRaten(100, 0.01, 12)).toBeLessThan(1200);
    expect(barwertRaten(100, 0.01, 0)).toBe(0);
    expect(barwertRaten(0, 0.01, 12)).toBe(0);
  });
});

describe('Gegenproben der Nachprüfung (E02, E03)', () => {
  it('liquidiert das freie Depot zum Rentenbeginn wie die reguläre Rechnung (E02)', () => {
    // Am selben Stichtag, vor der ersten Rate, muss derselbe Betrag
    // herauskommen. Vorher fehlten im Todesfall die bereits über die
    // Vorabpauschale versteuerten Beträge im Einstand (§ 19 Abs. 1 InvStG) -
    // derselbe Gewinn wurde zweimal belastet.
    const e = eingabe();
    const r = simuliereAvd(e);
    const [beiBeginn] = szenarien(e, [67]);
    expect(beiBeginn.freiesDepot).toBeCloseTo(r.depot.endkapitalNetto, 6);
  });

  it('verlangt einen Einstand über den Einzahlungen (E02)', () => {
    // Gegenprobe zur Probe selbst: Ohne positive Vorabpauschalen wäre der
    // Test wertlos, weil beide Wege ohnehin gleich rechnen.
    const r = simuliereAvd(eingabe());
    const letzte = r.jahre[r.jahre.length - 1];
    expect(letzte.depotEinstand).toBeGreaterThan(r.depot.eingezahlt);
  });

  it('mindert die Rückforderung um das planmäßig ausgezahlte Teilkapital (E03)', () => {
    // 30 % werden zu Beginn planmäßig ausgezahlt und dabei besteuert. Für
    // diesen Teil gibt es keine Rückforderung mehr; es bleiben 70 %.
    const ohne = eingabe({ teilkapitalAnteil: 0 });
    const mit = eingabe({ teilkapitalAnteil: 0.3 });
    const rOhne = simuliereAvd(ohne);
    const rMit = simuliereAvd(mit);
    const [sOhne] = szenarien(ohne, [67]);
    const [sMit] = szenarien(mit, [67]);

    expect(sOhne.sonstige.rueckforderung).toBeCloseTo(rOhne.summeFoerderung, 0);
    expect(sMit.sonstige.rueckforderung).toBeLessThan(sOhne.sonstige.rueckforderung);
    // 70 % der Förderung, nicht die ganze
    expect(sMit.sonstige.rueckforderung).toBeCloseTo(rMit.summeFoerderung * 0.7, 0);
  });

  it('bezieht die Rückforderung durchgehend auf das Ganze (E03)', () => {
    // Auch später muss der Anteil am gesamten Kapital zum Auszahlungsbeginn
    // gelten, nicht am Rest nach der Teilentnahme.
    const e = eingabe({ teilkapitalAnteil: 0.3 });
    const r = simuliereAvd(e);
    const gesamt = r.gefoerderterKapitalanteil + r.ungefoerderterKapitalanteil;
    for (const alter of [67, 72, 80]) {
      const [s] = szenarien(e, [alter]);
      const anteil = s.ehegatte.kapitalGesamt / gesamt;
      expect(
        s.sonstige.rueckforderung,
        `Alter ${alter}`
      ).toBeCloseTo(r.summeFoerderung * anteil, 0);
    }
  });
});

describe('Grenzen des Modells, jetzt als Angabe (Nachpruefung)', () => {
  it('versteuert die garantierte Restrente mit dem Satz der Hinterbliebenen', () => {
    // Eine Hinterbliebenenrente versteuert der Empfaenger. Vorher trug der
    // Barwert die Rente nach Steuersatz *und* Krankenversicherung des Sparers.
    const sparer = eingabe({ auszahlform: 'leibrente', steuersatzImAlter: 0.4 });
    const niedriger = eingabe({
      auszahlform: 'leibrente',
      steuersatzImAlter: 0.4,
      steuersatzHinterbliebene: 0.15,
    });
    const a = szenarien(sparer, [70], 10)[0];
    const b = szenarien(niedriger, [70], 10)[0];
    expect(b.garantierteRestrente!).toBeGreaterThan(a.garantierteRestrente!);
  });

  it('benennt die Annahme, solange kein eigener Satz angegeben ist', () => {
    const ohne = szenarien(eingabe({ auszahlform: 'leibrente' }), [70], 10)[0];
    expect(
      ohne.hinweise.some(
        (h) => h.art === 'warnung' && h.text.includes('Steuersatz des Sparers')
      )
    ).toBe(true);
    const mit = szenarien(
      eingabe({ auszahlform: 'leibrente', steuersatzHinterbliebene: 0.2 }),
      [70],
      10
    )[0];
    expect(mit.hinweise.some((h) => h.text.includes('Steuersatz des Sparers'))).toBe(false);
    expect(mit.hinweise.some((h) => h.text.includes('Kranken- und Pflegeversicherung der Hinterbliebenen'))).toBe(true);
  });

  it('fordert noch nicht gutgeschriebene Zulagen nicht zurueck', () => {
    // Nur in der Ansparphase kann ein Anspruch offen sein; zum
    // Auszahlungsbeginn sind die Nachzuegler gebucht.
    const e = eingabe();
    const r = simuliereAvd(e);
    const [anspar] = szenarien(e, [50]);
    const bis50 = r.jahre.filter((z) => z.alter <= 50);
    const offen = bis50.reduce((n, z) => n + z.zulage - z.zulageZugeflossen, 0);
    expect(offen).toBeGreaterThan(0);
    expect(anspar.sonstige.rueckforderung).toBeCloseTo(
      bis50.reduce((n, z) => n + z.zulageZugeflossen + z.steuererstattung, 0),
      6
    );
    expect(anspar.hinweise.some((h) => h.text.includes('nicht zurückgefordert'))).toBe(true);

    // In der Auszahlphase zaehlt die ganze Foerderung
    const [auszahl] = szenarien(e, [67]);
    expect(auszahl.sonstige.rueckforderung).toBeCloseTo(r.summeFoerderung, 0);
  });

  it('kennt auch die strengere Lesart (Rechtsflag)', () => {
    const e = eingabe();
    const streng = berechneTodesfallSzenarien({
      basis: e,
      ergebnis: simuliereAvd(e),
      alter: [50],
      flags: { ...RECHTS_FLAGS_DEFAULT, todesfallRueckforderungNurZugeflossen: false },
    })[0];
    const vorgabe = szenarien(e, [50])[0];
    expect(streng.sonstige.rueckforderung).toBeGreaterThan(
      vorgabe.sonstige.rueckforderung
    );
    expect(streng.hinweise.some((h) => h.text.includes('strengere Lesart'))).toBe(true);
  });
});
