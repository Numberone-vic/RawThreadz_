import { getCatalog, stripe, json, UserError } from "../_lib/catalog.js";

// Countries the shop ships to (ISO codes). Edit as needed.
const ALLOWED_COUNTRIES = ["US"];

export async function onRequestPost({ request, env }) {
  try {
    const { items } = await request.json();
    if (!Array.isArray(items) || !items.length || items.length > 30) throw new UserError("Your cart is empty.");

    // Prices always come from Stripe, never from the browser.
    const catalog = new Map((await getCatalog(env)).map(p => [p.id, p]));
    const params = new URLSearchParams();

    items.forEach((it, i) => {
      const p = catalog.get(it?.id);
      if (!p || p.soldOut) throw new UserError("An item in your cart is no longer available.");
      if (p.sizes.length && !p.sizes.includes(it.size)) throw new UserError(`Please choose a size for ${p.name}.`);
      if (!Number.isInteger(it.qty) || it.qty < 1 || it.qty > 10) throw new UserError("Invalid quantity.");

      const k = `line_items[${i}]`;
      params.set(`${k}[quantity]`, it.qty);
      params.set(`${k}[price_data][currency]`, p.currency);
      params.set(`${k}[price_data][unit_amount]`, p.price);
      params.set(`${k}[price_data][product_data][name]`, p.sizes.length ? `${p.name} (${it.size})` : p.name);
      params.set(`${k}[price_data][product_data][metadata][product_id]`, p.id);
      if (p.sizes.length) params.set(`${k}[price_data][product_data][metadata][size]`, it.size);
      if (p.image) params.set(`${k}[price_data][product_data][images][0]`, p.image);
    });

    const origin = new URL(request.url).origin;
    params.set("mode", "payment");
    params.set("success_url", `${origin}/?checkout=success`);
    params.set("cancel_url", `${origin}/?checkout=cancelled`);
    params.set("allow_promotion_codes", "true"); // lets the owner run promo codes made in Stripe
    ALLOWED_COUNTRIES.forEach((c, i) => params.set(`shipping_address_collection[allowed_countries][${i}]`, c));
    if (env.SHIPPING_RATE_ID) params.set("shipping_options[0][shipping_rate]", env.SHIPPING_RATE_ID);

    const session = await stripe(env, "/checkout/sessions", { method: "POST", body: params });
    return json({ url: session.url });
  } catch (e) {
    if (e instanceof UserError) return json({ error: e.message }, 400);
    console.error(e);
    return json({ error: "Couldn't start checkout. Please try again." }, 500);
  }
}
