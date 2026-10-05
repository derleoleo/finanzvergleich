import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { ABSENDER, liste, mailLayout } from "./_mail-layout.js";
import {
  couponFuerWerber,
  WERBUNG_STATUS,
  WIEDERAUFNAHME_MS,
} from "./_werbung.js";

// Pflicht: Raw Body für Stripe-Signaturverifikation
export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_TO_PLAN: Record<string, "professional" | "business"> = {
  // Premium (aktuell)
  [process.env.VITE_STRIPE_PRICE_PREMIUM_MONTHLY!]: "business",
  [process.env.VITE_STRIPE_PRICE_PREMIUM_YEARLY!]:  "business",
  // Legacy – bestehende Abos behalten ihren Zugang
  [process.env.VITE_STRIPE_PRICE_PRO_MONTHLY!]: "professional",
  [process.env.VITE_STRIPE_PRICE_PRO_YEARLY!]: "professional",
  [process.env.VITE_STRIPE_PRICE_UNLIMITED_MONTHLY!]: "business",
  [process.env.VITE_STRIPE_PRICE_UNLIMITED_YEARLY!]: "business",
};

// Unbekannte Preise schalten bewusst KEINEN bezahlten Plan frei. Früher fiel
// jede nicht zugeordnete Preis-ID auf "professional" zurück – damit hätte
// jeder beliebige Preis im Stripe-Konto vollen Zugang gewährt.
function getPlan(priceId: string): "professional" | "business" | "free" {
  const plan = PRICE_TO_PLAN[priceId];
  if (!plan) {
    console.error(`[stripe-webhook] Unbekannte Preis-ID ${priceId} – kein Plan vergeben`);
    return "free";
  }
  return plan;
}

async function getRawBody(req: VercelRequest): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const rawBody = await getRawBody(req);
  const sig = req.headers["stripe-signature"] as string;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook-Signaturverifikation fehlgeschlagen:", err);
    return res.status(400).json({ error: "Invalid signature" });
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  /**
   * Schreibt die Subscription und meldet Fehler an Stripe zurück (HTTP 500).
   * Sonst gilt das Ereignis als verarbeitet, obwohl der Zugang nicht gesetzt
   * wurde – der Kunde zahlt dann ohne freigeschaltete Funktionen.
   */
  const speichereSubscription = async (zeile: Record<string, unknown>) => {
    const { error } = await supabase
      .from("subscriptions")
      .upsert(zeile, { onConflict: "user_id" });
    if (error) {
      console.error("stripe-webhook: Subscription konnte nicht gespeichert werden", {
        event: event.type,
        user_id: zeile.user_id,
        error,
      });
      return false;
    }
    return true;
  };

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.supabase_user_id;
      if (!userId || !session.subscription) break;

      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      );
      const priceId = subscription.items.data[0]?.price.id ?? "";
      const plan = getPlan(priceId);

      const gespeichert = await speichereSubscription({
          user_id: userId,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string,
          plan,
          status: subscription.status,
          current_period_end: subscription.items.data[0]?.current_period_end
            ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
            : null,
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
      });
      if (!gespeichert) return res.status(500).json({ error: "Speichern fehlgeschlagen" });
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.supabase_user_id;
      const customerId = subscription.customer as string;

      // Falls metadata fehlt, über stripe_customer_id suchen
      let resolvedUserId = userId;
      if (!resolvedUserId) {
        const { data } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .single();
        resolvedUserId = data?.user_id;
      }
      if (!resolvedUserId) break;

      const priceId = subscription.items.data[0]?.price.id ?? "";
      const plan = getPlan(priceId);

      const gespeichert = await speichereSubscription({
          user_id: resolvedUserId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscription.id,
          plan,
          status: subscription.status,
          current_period_end: subscription.items.data[0]?.current_period_end
            ? new Date(subscription.items.data[0].current_period_end * 1000).toISOString()
            : null,
          cancel_at_period_end: subscription.cancel_at_period_end,
          updated_at: new Date().toISOString(),
      });
      if (!gespeichert) return res.status(500).json({ error: "Speichern fehlgeschlagen" });
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const { data } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_customer_id", customerId)
        .single();

      if (!data?.user_id) break;

      const gespeichert = await speichereSubscription({
          user_id: data.user_id,
          plan: "free",
          status: "canceled",
          updated_at: new Date().toISOString(),
      });
      if (!gespeichert) return res.status(500).json({ error: "Speichern fehlgeschlagen" });
      break;
    }

    case "customer.subscription.trial_will_end": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const customer = await stripe.customers.retrieve(customerId);
      if (customer.deleted || !("email" in customer) || !customer.email) break;

      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: ABSENDER,
        to: customer.email,
        subject: "Ihr Testzeitraum endet in 3 Tagen",
        html: mailLayout({
          titel: "Testzeitraum endet bald",
          ueberschrift: "Ihr Testzeitraum endet bald",
          unterzeile: "Noch 3 Tage kostenlos.",
          absaetze: [
            "Guten Tag,",
            "Ihr 30-tägiger kostenloser Testzeitraum endet in <strong style=\"color:#1A1A2E;\">3 Tagen</strong>. Danach läuft Ihr Premium-Abo automatisch weiter, sofern Sie nicht vorher kündigen. Die Kündigung im Kundenportal dauert einen Moment und ist bis zum letzten Testtag kostenlos.",
            "<strong style=\"color:#1A1A2E;\">Premium enthält:</strong>",
            liste([
              "Unbegrenzte Berechnungen in allen sechs Rechnern",
              "BestAdvice-Analyse, Rentenlücke, Entnahmeplan und Altersvorsorgedepot",
              "PDF-Export mit Ihrem Logo und Berater-Profil",
            ]),
          ],
          knopf: { text: "Abo verwalten", url: "https://www.vorsorgewaage.de/pricing" },
        }),
      });
      break;
    }

    /**
     * Zahlungseingang. Zwei Rollen sind zu prüfen:
     *   1. Der Zahlende ist der Geworbene – damit entsteht der Anspruch.
     *   2. Der Zahlende ist der Werber – damit wird ein offener Anspruch
     *      einlösbar, der mangels Abo bisher nicht gutgeschrieben werden
     *      konnte.
     * Ohne Fall 2 bliebe eine Empfehlung dauerhaft offen, wenn der Werber
     * zum Zeitpunkt der Zahlung seines Geworbenen noch kein Abo hatte.
     * Während des Testzeitraums sind die Rechnungen 0 EUR, deshalb ist
     * `amount_paid > 0` der verlässliche Auslöser.
     */
    case "invoice.paid": {
      const rechnung = event.data.object as Stripe.Invoice;
      if (!rechnung.amount_paid || rechnung.amount_paid <= 0) break;

      const kundenId = rechnung.customer as string;
      const { data: zahlerAbo, error: zahlerFehler } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("stripe_customer_id", kundenId)
        .maybeSingle();
      // Ein Lesefehler ist kein "nicht gefunden": Stillschweigend aufzugeben
      // hieße, die Empfehlung zu verlieren. Lieber 500, dann liefert Stripe
      // das Ereignis erneut aus.
      if (zahlerFehler) {
        console.error("[stripe-webhook] subscriptions nicht lesbar", zahlerFehler);
        return res.status(500).json({ error: "Lesefehler" });
      }
      if (!zahlerAbo?.user_id) break;
      const zahlerId = zahlerAbo.user_id as string;

      /**
       * Schreibt die Gutschrift in drei Schritten (Audit A07):
       *
       *   registriert → in_arbeit → (Stripe) → belohnt
       *
       * Der Zwischenzustand ist der Kern. Vorher wurde sofort auf 'belohnt'
       * gesetzt und erst danach Stripe gerufen: Brach der Vorgang dazwischen
       * ab, stand 'belohnt' ohne Rabatt, und Wiederholungen suchten nur nach
       * 'registriert'. Der Werber wartete dann auf eine Gutschrift, die es
       * nicht gab.
       *
       * Die Beanspruchung verhindert weiterhin, dass zwei gleichzeitige
       * Ereignisse denselben Rabatt zweimal vergeben. Dass ein abgebrochener
       * Versuch wiederaufgenommen werden darf, ist gefahrlos, weil der
       * Stripe-Aufruf einen festen Idempotenzschlüssel je Werbung trägt.
       */
      const belohne = async (werbung: {
        id: string;
        werber_user_id: string;
      }): Promise<"ok" | "offen" | "fehler"> => {
        const coupon = couponFuerWerber();
        if (!coupon) {
          console.error("[stripe-webhook] STRIPE_COUPON_WERBER fehlt", { werbung: werbung.id });
          return "offen";
        }

        const { data: werberAbo, error: werberFehler } = await supabase
          .from("subscriptions")
          .select("stripe_subscription_id")
          .eq("user_id", werbung.werber_user_id)
          .maybeSingle();
        if (werberFehler) {
          console.error("[stripe-webhook] Abo des Werbers nicht lesbar", werberFehler);
          return "fehler";
        }
        // Kein laufendes Abo: Der Anspruch bleibt offen und wird bei der
        // nächsten Zahlung des Werbers erneut versucht.
        if (!werberAbo?.stripe_subscription_id) return "offen";

        // Schritt 1: beanspruchen. Ein haengengebliebener Versuch darf nach
        // einer Weile erneut aufgenommen werden - sonst bliebe die Werbung
        // fuer immer in_arbeit.
        const wiederaufnahmeAb = new Date(Date.now() - WIEDERAUFNAHME_MS).toISOString();
        const { data: beansprucht, error: anspruchFehler } = await supabase
          .from("werbungen")
          .update({
            status: WERBUNG_STATUS.inArbeit,
            in_arbeit_seit: new Date().toISOString(),
          })
          .eq("id", werbung.id)
          .or(
            `status.eq.${WERBUNG_STATUS.registriert},` +
              `and(status.eq.${WERBUNG_STATUS.inArbeit},in_arbeit_seit.lt."${wiederaufnahmeAb}")`
          )
          .select("id")
          .maybeSingle();
        if (anspruchFehler) {
          console.error("[stripe-webhook] Werbung nicht beanspruchbar", anspruchFehler);
          return "fehler";
        }
        // Ein anderes Ereignis war schneller oder arbeitet gerade daran.
        if (!beansprucht) return "ok";

        // Schritt 2: Rabatt setzen. Der Idempotenzschluessel macht einen
        // zweiten Versuch mit derselben Werbung bei Stripe wirkungslos -
        // genau das erlaubt die Wiederaufnahme oben.
        try {
          await stripe.subscriptions.update(
            werberAbo.stripe_subscription_id,
            { discounts: [{ coupon }] },
            { idempotencyKey: `werbung-rabatt-${werbung.id}` }
          );
        } catch (err) {
          console.error("[stripe-webhook] Rabatt konnte nicht gesetzt werden", err);
          // Zuruecknehmen, damit der naechste Lauf es sofort erneut versucht.
          // Misslingt auch das, bleibt der Datensatz in_arbeit - und wird
          // nach WIEDERAUFNAHME_MS ohnehin wieder aufgegriffen. Der Fehler
          // gehoert trotzdem ins Protokoll, sonst sieht niemand, dass die
          // Ruecknahme nicht griff.
          const { error: ruecknahmeFehler } = await supabase
            .from("werbungen")
            .update({ status: WERBUNG_STATUS.registriert, in_arbeit_seit: null })
            .eq("id", werbung.id)
            .eq("status", WERBUNG_STATUS.inArbeit);
          if (ruecknahmeFehler) {
            console.error(
              "[stripe-webhook] Ruecknahme der Beanspruchung fehlgeschlagen",
              { werbung: werbung.id, fehler: ruecknahmeFehler }
            );
          }
          return "fehler";
        }

        // Schritt 3: erst jetzt gilt die Werbung als belohnt.
        const { error: abschlussFehler } = await supabase
          .from("werbungen")
          .update({
            status: WERBUNG_STATUS.belohnt,
            stripe_coupon_id: coupon,
            belohnt_am: new Date().toISOString(),
            in_arbeit_seit: null,
          })
          .eq("id", werbung.id);
        if (abschlussFehler) {
          // Der Rabatt steht bei Stripe, nur die Notiz fehlt. Ein erneuter
          // Lauf setzt denselben Rabatt dank Idempotenzschluessel nicht
          // doppelt und kommt wieder hierher.
          console.error("[stripe-webhook] Abschluss der Werbung fehlgeschlagen", {
            werbung: werbung.id,
            fehler: abschlussFehler,
          });
          return "fehler";
        }

        // Hinweis an den Werber – ohne zu verraten, wer geworben wurde
        const { data: werberDaten } = await supabase.auth.admin.getUserById(
          werbung.werber_user_id
        );
        const werberMail = werberDaten?.user?.email;
        if (werberMail) {
          const resend = new Resend(process.env.RESEND_API_KEY);
          await resend.emails.send({
            from: ABSENDER,
            to: werberMail,
            subject: "Ihre Empfehlung wurde gutgeschrieben",
            html: mailLayout({
              titel: "Empfehlung gutgeschrieben",
              ueberschrift: "Danke für Ihre Empfehlung",
              unterzeile: "Der Rabatt liegt auf Ihrem Abo.",
              absaetze: [
                "Guten Tag,",
                "jemand, den Sie empfohlen haben, hat ein Premium-Abo abgeschlossen. Ihr Rabatt ist bereits hinterlegt und wird mit der nächsten Rechnung automatisch verrechnet.",
                "Sie können weiter empfehlen – jede Empfehlung, die zu einem Abo führt, wird gutgeschrieben.",
              ],
              knopf: { text: "Abo ansehen", url: "https://www.vorsorgewaage.de/pricing" },
            }),
          });
        }
        return "ok";
      };

      // Rolle 1: Der Zahlende wurde geworben → Anspruch entsteht jetzt.
      const { data: alsGeworbener, error: geworbenerFehler } = await supabase
        .from("werbungen")
        .select("id, werber_user_id, qualifiziert_am")
        .eq("geworbener_user_id", zahlerId)
        .eq("status", WERBUNG_STATUS.registriert)
        .maybeSingle();
      if (geworbenerFehler) {
        console.error("[stripe-webhook] werbungen nicht lesbar", geworbenerFehler);
        return res.status(500).json({ error: "Lesefehler" });
      }

      const offene: { id: string; werber_user_id: string }[] = [];
      if (alsGeworbener) {
        if (!alsGeworbener.qualifiziert_am) {
          // Der Anspruch wird festgehalten, bevor die Gutschrift versucht
          // wird. Gelingt sie heute nicht, ist er trotzdem dokumentiert.
          const { error } = await supabase
            .from("werbungen")
            .update({ qualifiziert_am: new Date().toISOString() })
            .eq("id", alsGeworbener.id);
          if (error) {
            console.error("[stripe-webhook] Anspruch nicht vermerkt", error);
            return res.status(500).json({ error: "Speichern fehlgeschlagen" });
          }
        }
        offene.push(alsGeworbener);
      }

      // Rolle 2: Der Zahlende hat geworben und hat jetzt ein Abo, auf das
      // ein offener Rabatt gelegt werden kann.
      // Audit A07: Auch haengengebliebene Versuche gehoeren hierher. Ohne sie
      // bliebe eine Werbung, deren Gutschrift abgebrochen ist, fuer immer in
      // Arbeit - sie wird sonst von keiner der beiden Rollen wieder gefunden.
      const steckengeblieben = new Date(Date.now() - WIEDERAUFNAHME_MS).toISOString();
      const { data: alsWerber, error: werberListeFehler } = await supabase
        .from("werbungen")
        .select("id, werber_user_id")
        .eq("werber_user_id", zahlerId)
        .or(
          `status.eq.${WERBUNG_STATUS.registriert},` +
            `and(status.eq.${WERBUNG_STATUS.inArbeit},in_arbeit_seit.lt."${steckengeblieben}")`
        )
        .not("qualifiziert_am", "is", null);
      if (werberListeFehler) {
        console.error("[stripe-webhook] offene Werbungen nicht lesbar", werberListeFehler);
        return res.status(500).json({ error: "Lesefehler" });
      }
      offene.push(...(alsWerber ?? []));

      for (const werbung of offene) {
        const ergebnis = await belohne(werbung);
        if (ergebnis === "fehler") {
          return res.status(500).json({ error: "Gutschrift fehlgeschlagen" });
        }
      }
      break;
    }

    default:
      // Nicht behandeltes Event – ignorieren
      break;
  }

  return res.status(200).json({ received: true });
}
