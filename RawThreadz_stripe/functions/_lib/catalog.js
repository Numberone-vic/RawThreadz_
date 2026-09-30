// Shared helpers for the Cloudflare Pages Functions.
// STRIPE_SECRET_KEY lives in the host's environment variables — never in the site files.
const STRIPE = "https://api.stripe.com/v1";

export class UserError extends Error {}

export async function stripe(env, path, { method = "GET", body } = {}) {
  const res = await fetch(STRIPE + path, {
    method,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      ...(body ? { "Content-Type": "application/x-www-form-urlencoded" } : {})
    },
    body
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || `Stripe error ${res.status}`);
  return data;
}

// Every ACTIVE Stripe product with a one-time price. Archive a product in Stripe to hide it.
export async function getCatalog(env) {
  const data = await stripe(env, "/products?active=true&limit=100&expand[]=data.default_price");
  return data.data
    .filter(p => p.default_price && p.default_price.unit_amount != null && !p.default_price.recurring)
    .map(p => ({
      id: p.id,
      name: p.name,
      description: p.description || "",
      image: p.images?.[0] || "",
      price: p.default_price.unit_amount,      // cents
      currency: p.default_price.currency,
      sizes: (p.metadata?.sizes || "").split(",").map(s => s.trim()).filter(Boolean),
      soldOut: p.metadata?.sold_out === "true"
    }));
}

export const json = (obj, status = 200, headers = {}) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...headers } });
