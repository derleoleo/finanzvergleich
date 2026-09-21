import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Nur die aktuell verkauften Preise dürfen einen Checkout starten. Ohne diese
// Liste würde jede Preis-ID aus dem Stripe-Konto akzeptiert, die der Browser
// schickt – auch vergessene Test- oder Altpreise.
const ERLAUBTE_PREISE = new Set(
  [
    process.env.VITE_STRIPE_PRICE_PREMIUM_MONTHLY,
    process.env.VITE_STRIPE_PRICE_PREMIUM_YEARLY,
  ].filter((id): id is string => Boolean(id))
);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  // JWT-Verifikation
  const supabaseAnon = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.VITE_SUPABASE_ANON_KEY!
  );
  const token = req.headers.authorization?.slice(7) ?? "";
  const {
    data: { user },
  } = await supabaseAnon.auth.getUser(token);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  const { priceId } = req.body as { priceId: string };
  if (!priceId) return res.status(400).json({ error: "priceId required" });
  if (!ERLAUBTE_PREISE.has(priceId)) {
    return res.status(400).json({ error: "Unbekannter Tarif" });
  }

  // Service-Role für Lese-/Schreibzugriff auf subscriptions
  const supabaseAdmin = createClient(
    process.env.VITE_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Vorhandene stripe_customer_id laden
  const { data: sub } = await supabaseAdmin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single();

  let customerId: string | undefined = sub?.stripe_customer_id ?? undefined;

  // Neuen Customer anlegen, falls noch keiner existiert
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    // Pflichtangaben für Rechnungen über 250 € (§ 14 Abs. 4 UStG): Name und
    // Anschrift des Leistungsempfängers. Die Angaben werden am Stripe-Kunden
    // gespeichert und erscheinen so auf allen Folgerechnungen.
    billing_address_collection: "required",
    name_collection: { business: { enabled: true, optional: false } },
    customer_update: { address: "auto", name: "auto" },
    locale: "de",
    subscription_data: {
      trial_period_days: 30,
      metadata: { supabase_user_id: user.id },
    },
    metadata: { supabase_user_id: user.id },
    success_url: `${req.headers.origin}/pricing?checkout=success`,
    cancel_url: `${req.headers.origin}/pricing`,
  });

  return res.status(200).json({ url: session.url });
}
