import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

// Pflicht: Raw Body für Stripe-Signaturverifikation
export const config = { api: { bodyParser: false } };

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const PRICE_TO_PLAN: Record<string, "professional" | "business"> = {
  [process.env.VITE_STRIPE_PRICE_PRO_MONTHLY!]: "professional",
  [process.env.VITE_STRIPE_PRICE_PRO_YEARLY!]: "professional",
  [process.env.VITE_STRIPE_PRICE_UNLIMITED_MONTHLY!]: "business",
  [process.env.VITE_STRIPE_PRICE_UNLIMITED_YEARLY!]: "business",
};

function getPlan(priceId: string): "professional" | "business" {
  return PRICE_TO_PLAN[priceId] ?? "professional";
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

      await supabase.from("subscriptions").upsert(
        {
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
        },
        { onConflict: "user_id" }
      );
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

      await supabase.from("subscriptions").upsert(
        {
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
        },
        { onConflict: "user_id" }
      );
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

      await supabase.from("subscriptions").upsert(
        {
          user_id: data.user_id,
          plan: "free",
          status: "canceled",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
      break;
    }

    case "customer.subscription.trial_will_end": {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;

      const customer = await stripe.customers.retrieve(customerId);
      if (customer.deleted || !("email" in customer) || !customer.email) break;

      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "RentenCheck <info@rentencheck.app>",
        to: customer.email,
        subject: "Ihr Testzeitraum endet in 3 Tagen",
        html: `
          <!DOCTYPE html>
          <html lang="de">
          <body style="font-family: -apple-system, sans-serif; background: #f8fafc; margin: 0; padding: 40px 20px;">
            <div style="max-width: 560px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">
              <div style="background: #1e293b; padding: 32px 40px;">
                <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 700;">RentenCheck</h1>
              </div>
              <div style="padding: 40px;">
                <h2 style="color: #0f172a; margin: 0 0 16px; font-size: 20px;">Ihr Testzeitraum endet bald</h2>
                <p style="color: #475569; line-height: 1.6; margin: 0 0 24px;">
                  Ihr 14-tägiger kostenloser Testzeitraum endet in <strong>3 Tagen</strong>.
                  Damit Sie weiterhin uneingeschränkt alle Funktionen nutzen können, bleibt Ihr Abo
                  automatisch aktiv – es sei denn, Sie kündigen vorher im Kundenportal.
                </p>
                <p style="color: #475569; line-height: 1.6; margin: 0 0 8px; font-weight: 600;">
                  Was Sie behalten:
                </p>
                <ul style="color: #475569; line-height: 1.8; margin: 0 0 32px; padding-left: 20px;">
                  <li>Unbegrenzte Berechnungen (LV/Depot, Einmalanlage, Entnahmeplan)</li>
                  <li>BestAdvice-Analyse und Rentenlücken-Rechner</li>
                  <li>PDF-Export für alle Berechnungen</li>
                </ul>
                <a href="https://www.rentencheck.app/pricing" style="display: inline-block; background: #1e293b; color: white; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 600; font-size: 15px;">
                  Abo verwalten →
                </a>
              </div>
              <div style="background: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0;">
                <p style="color: #94a3b8; font-size: 12px; margin: 0; line-height: 1.6;">
                  RentenCheck · Leonard Brandt · Ernst-Bähre-Str. 3, 30453 Hannover<br />
                  <a href="https://www.rentencheck.app/datenschutz" style="color: #94a3b8;">Datenschutz</a> ·
                  <a href="https://www.rentencheck.app/impressum" style="color: #94a3b8;">Impressum</a>
                </p>
              </div>
            </div>
          </body>
          </html>
        `,
      });
      break;
    }

    default:
      // Nicht behandeltes Event – ignorieren
      break;
  }

  return res.status(200).json({ received: true });
}
