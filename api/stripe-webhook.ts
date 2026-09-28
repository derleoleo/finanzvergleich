import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { ABSENDER, liste, mailLayout } from "./_mail-layout.js";

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

    default:
      // Nicht behandeltes Event – ignorieren
      break;
  }

  return res.status(200).json({ received: true });
}
