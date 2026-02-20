# Legal Consent System

## Überblick

Consent-Tracking für DSGVO-AVV-Zustimmung (B2B-SaaS). Zustimmungen werden in Supabase gespeichert und versioniert.

---

## Versionstabelle

| Version   | Datum         | Änderung                   |
|-----------|---------------|----------------------------|
| `2026-02` | Februar 2026  | Initial (AVV, AGB, B2B)    |

---

## Version-Bump-Anleitung

Bei Änderung von AVV, AGB oder B2B-Bedingungen:

1. **`src/utils/legalVersion.ts`**: `LEGAL_DOC_VERSION` auf neues `YYYY-MM` setzen
2. **`src/pages/AGB.tsx`** / **`src/pages/AVV.tsx`**: „Stand:" aktualisieren
3. Versionstabelle in dieser Datei ergänzen
4. **Kein Datenbankschema-Change nötig** – die neue Version erzeugt automatisch neue Einträge

Nach dem Bump sehen alle bestehenden Nutzer beim nächsten Seitenaufruf das ConsentGate-Modal (da `hasRequiredConsents` mit der neuen Version fehlschlägt).

---

## Consent-Gates-Übersicht

| Gate              | Ort                                | Auslöser                          | Fail-Verhalten  |
|-------------------|------------------------------------|-----------------------------------|-----------------|
| **Registrierung** | `src/pages/Login.tsx`              | Checkbox-Pflicht vor Submit       | Blocked (hard)  |
| **Legacy-Gate**   | `src/components/ConsentGate.tsx`   | useEffect bei jedem Auth-Login    | Fail-open       |
| **Pre-Checkout**  | `src/pages/Pricing.tsx`            | Klick auf Upgrade-Button          | Fail-open       |

**Fail-open** bedeutet: Bei einem Datenbankfehler (z.B. Supabase nicht erreichbar) wird der Nutzer nicht ausgesperrt, sondern darf fortfahren. Das wird mit `catch(() => setStatus("ok"))` / `catch { await handleCheckout(priceId) }` umgesetzt.

---

## Datenbankschema

```sql
create table public.finanzvergleich_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  consent_type text not null check (consent_type in ('avv','agb','b2b_confirm','privacy_notice')),
  document_version text not null,
  accepted_at timestamptz not null default now(),
  ip_address inet null,
  user_agent text null,
  constraint uq_user_consent_version unique (user_id, consent_type, document_version)
);
alter table public.finanzvergleich_consents enable row level security;
create policy "users_own_consents" on public.finanzvergleich_consents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

**Wichtig:** Dieses SQL muss einmalig im Supabase SQL-Editor ausgeführt werden (Phase 0).

---

## Consent-Typen

| Typ           | Bedeutung                                                   |
|---------------|-------------------------------------------------------------|
| `avv`         | Auftragsverarbeitungsvertrag gemäß Art. 28 DSGVO            |
| `agb`         | Allgemeine Geschäftsbedingungen                             |
| `b2b_confirm` | Bestätigung Unternehmereigenschaft (§ 14 BGB)               |
| `privacy_notice` | Datenschutzhinweis (optional, nicht required)            |

`REQUIRED_CONSENT_TYPES` in `src/utils/legalVersion.ts` definiert, welche 3 Typen für Zugang erforderlich sind.

---

## Edge Cases

### Nutzer ohne Session bei Registrierung (E-Mail-Bestätigung aktiv)
- `sessionCreated = false` → keine Session → Consents können nicht gespeichert werden
- Beim ersten echten Login greift ConsentGate automatisch (Legacy-Gate-Pfad)

### Multiple Tabs
- Upsert mit `ignoreDuplicates: true` + Unique Constraint → idempotent, kein Fehler bei Doppel-Klick

### Supabase nicht erreichbar
- Alle Gates sind fail-open: Nutzer wird nicht ausgesperrt
- Einzige Ausnahme: Registrierungs-Branch → bei Fehler wird `signOut()` gerufen und Fehlermeldung angezeigt (kein navigate)

### IP-Adresse
- Wird client-seitig nicht gespeichert (nicht verlässlich hinter Proxies/CDN)
- Kann nachträglich per Edge-Function ergänzt werden (Supabase Edge Function liest `x-forwarded-for`)

### Consent-Version erhöhen (alle Nutzer müssen erneut zustimmen)
- `LEGAL_DOC_VERSION` bumpen → ConsentGate schlägt für alle bestehenden Nutzer an
- Neue Zustimmungen werden mit neuer Version gespeichert; alte bleiben erhalten (kein Delete)
