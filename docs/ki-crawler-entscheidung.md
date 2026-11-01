# KI-Crawler: Was heute gilt und was zu entscheiden ist

Stand 01.11.2026. Alle Angaben aus der Dokumentation der Anbieter selbst,
nicht aus Fachartikeln. Die Entscheidung am Ende gehört dem Betreiber.

## Was heute in `public/robots.txt` steht

```
User-agent: *
Allow: /
Disallow: /api/

Sitemap: https://www.vorsorgewaage.de/sitemap.xml
```

Drei Zeilen Regel, eine Angabe zur Sitemap. **Kein einziger KI-Crawler ist
gesperrt.** Die Gruppe `User-agent: *` gilt für alle, die keine eigene Gruppe
haben — und keiner hat eine. Damit ist der heutige Zustand: alles erlaubt,
Training eingeschlossen. Das ist kein Versehen und kein Fehler, aber es ist
eine Vorentscheidung, die nie bewusst getroffen wurde.

`Disallow: /api/` bleibt in jeder Variante richtig: Dort liegen die
Serverfunktionen für Stripe und Resend, nicht Inhalte.

## Die Crawler und ihre drei verschiedenen Zwecke

Das ist der Kern: Es sind nicht „die KI-Bots". Jeder Anbieter betreibt
getrennte Crawler für getrennte Zwecke, und man kann den einen erlauben und
den anderen sperren.

| Zweck | OpenAI | Anthropic | Perplexity | Google |
|---|---|---|---|---|
| **Training** der Modelle | `GPTBot` | `ClaudeBot` | – (eigener Index, kein Training) | `Google-Extended` |
| **Suchindex** des Assistenten | `OAI-SearchBot` | `Claude-SearchBot` | `PerplexityBot` | Googlebot (derselbe wie für die Suche) |
| **Abruf beim Antworten** auf eine Nutzerfrage | `ChatGPT-User` | `Claude-User` | `Perplexity-User` | – |

Belege, wörtlich aus den Anbieterseiten:

- OpenAI: „GPTBot […] is used to crawl content that may be used in training our
  generative AI foundation models." Dagegen: „OAI-SearchBot is used to surface
  websites in search results in ChatGPT's search features. Sites that are
  opted out of OAI-SearchBot will not be shown in ChatGPT search answers."
  OpenAI nennt die Trennung ausdrücklich als Zweck: ein Betreiber „can allow
  OAI-SearchBot in order to appear in search results while disallowing GPTBot".
- Anthropic: „ClaudeBot helps enhance the utility and safety of our generative
  AI models by collecting web content that could potentially contribute to
  their training." Zu `Claude-SearchBot`: Sperren „prevents our system from
  indexing your content for search optimization, which may reduce your site's
  visibility".
- Perplexity: `PerplexityBot` „is designed to surface and link websites in
  search results on Perplexity. **It is not used to crawl content for AI
  foundation models.**" Hier ist Sperren also reiner Sichtbarkeitsverlust ohne
  Gegenwert.
- Google: `Google-Extended` steuert Training und „grounding" für Gemini und
  Vertex AI. Wichtig: „Google-Extended does not impact a site's inclusion in
  Google Search nor is it used as a ranking signal in Google Search."

**Zwei Einschränkungen, die man kennen muss.** Die Abruf-Crawler
(`ChatGPT-User`, `Perplexity-User`) halten sich nach Angabe der Anbieter nicht
zuverlässig an `robots.txt`, weil ein Mensch den Abruf ausgelöst hat.
Perplexity: „Since a user requested the fetch, this fetcher generally ignores
robots.txt rules." OpenAI: „Because these actions are initiated by a user,
robots.txt rules may not apply." Eine Sperre dort ist also eine Bitte, keine
Tür. Und `robots.txt` ist ohnehin nur für Crawler verbindlich, die sich daran
halten wollen.

## Die drei Varianten

### A — Alles offen (heutiger Zustand, nichts tun)

Maximale Sichtbarkeit in allen Assistenten. Die eigenen Texte dürfen auch in
Trainingsdaten fremder Modelle landen.

### B — Sichtbarkeit ja, Training nein

Die mittlere Variante. Die Suchindex-Crawler bleiben erlaubt, die
Trainings-Crawler werden gesperrt:

```
User-agent: GPTBot
Disallow: /

User-agent: ClaudeBot
Disallow: /

User-agent: Google-Extended
Disallow: /
```

Dass das ohne Sichtbarkeitsverlust geht, sagen die Anbieter selbst (siehe die
Zitate oben zu OpenAI und Google-Extended). `PerplexityBot` bleibt in jedem
Fall erlaubt — er trainiert nach eigener Angabe nicht.

Preis dieser Variante: Was ein Modell nicht gelernt hat, kann es nicht aus dem
Gedächtnis nennen — es findet die Seite nur, wenn es im Antwortmoment sucht.
Für ein Angebot, das noch keine Marke ist, zählt eher das Finden als das
Erinnern, aber eine Garantie ist das nicht.

### C — Alles gesperrt

```
User-agent: GPTBot
User-agent: OAI-SearchBot
User-agent: ClaudeBot
User-agent: Claude-SearchBot
User-agent: PerplexityBot
User-agent: Google-Extended
Disallow: /
```

Nicht zu empfehlen. Der Eingangstrichter lebt davon, gefunden zu werden, und
dieser Kanal fällt damit ganz weg — bei Perplexity ohne jeden Gegenwert, weil
dort gar nicht trainiert wird.

## Was *nicht* hilft

**`llms.txt` nicht anlegen.** Der Vorschlag (Jeremy Howard, 2024) hat nach
zwei Jahren keinen nachgewiesenen Abnehmer. Google schreibt es ausdrücklich
hin: „You don't need to create new machine readable files, AI text files,
markup, or Markdown to appear in Google Search (including its generative AI
capabilities), as Google Search itself doesn't use them. […] Google Search
ignores them." Kein Anbieter dokumentiert, dass er die Datei liest — OpenAI,
Anthropic und Google *veröffentlichen* eine für ihre eigenen
Entwicklerunterlagen, was etwas anderes ist. Fachartikel behaupten
Gegenteiliges, ohne eine Herstelleraussage zu nennen.

**Kein Schalter in der Search Console nötig.** Hier gab es einen Widerspruch
in Googles eigener Dokumentation, der aufgelöst ist: Die Einstellung
„Search generative AI" (Einstellungen → Search generative AI) ist ein
*Opt-out*, nicht ein Opt-in — „This is the default control for all
properties" für „Include my site's links and content in Search generative AI
features". Es ist also nichts zu aktivieren. Nur wenn man *heraus* will, muss
man dort hin. Die Einstellung gilt pro Property und ist unabhängig von
`Google-Extended`, das nur das Training betrifft.

**Keine besondere Auszeichnung für AI Overviews.** „There are no additional
requirements to appear in AI Overviews or AI Mode, nor other special
optimizations necessary." Voraussetzung ist allein die normale Indexierung:
„a page must be indexed and eligible to be shown in Google Search with a
snippet." Umgekehrt heißt das: `nosnippet` und `max-snippet` würden die
Darstellung dort beschneiden — beides setzt das Projekt nicht ein, richtig so.

## Was inhaltlich zitierfähig macht — gemessen

Der Ratgeber ist dafür der richtige Ort, und er ist in besserem Zustand als
erwartet. Gemessen an den vier Beiträgen:

| Beitrag | Überschriften | Normverweise | Zahlentabellen | Zahlenangaben | Wörter |
|---|---|---|---|---|---|
| begruendungspflicht-paragraf-61-vvg | 1×h1, 8×h2 | 23 | 2 | 27 | 1217 |
| grenzfoerderquote-altersvorsorgedepot | 1×h1, 7×h2 | 12 | 3 | 77 | 1153 |
| riester-bestand-wechseln-oder-behalten | 1×h1, 8×h2 | 21 | 5 | 80 | 1442 |
| was-im-todesfall-bleibt-altersvorsorgedepot | 1×h1, 7×h2 | 9 | 4 | 46 | 1079 |

Sauber: genau ein `h1` je Seite, keine übersprungene Ebene, Rechtsstand auf
jeder Seite, Zahlen aus derselben Engine wie der Rechner (festgehalten durch
`src/lib/finance/avd/ratgeber-*-zahlen.test.ts`). Das ist genau das Material,
das ein Assistent zitieren kann: prüfbare Aussagen mit Norm und Zahl.

**Die eine Lücke: keine einzige Überschrift ist eine Frage.** Null von rund
30. Assistenten gleichen die Frage des Nutzers gegen Abschnittsüberschriften
ab — „Was bleibt im Todesfall vom Altersvorsorgedepot?" trifft, „Die
Hinterbliebenenregelung" trifft nicht. Das umzuschreiben ist redaktionelle
Arbeit am Text und keine technische Änderung, deshalb steht es hier und nicht
im Code.

## Zu entscheiden

1. Variante A, B oder C für `robots.txt`? (Empfehlung: B — Sichtbarkeit ohne
   Training, weil die Anbieter selbst bestätigen, dass das zusammen geht.)
2. Sollen Abschnittsüberschriften im Ratgeber zu Fragen umformuliert werden?
