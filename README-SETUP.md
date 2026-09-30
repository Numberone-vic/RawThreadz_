# Raw ThreadZ — setup & owner guide

No monthly platform fee. Customers pay on Stripe's hosted checkout
(2.9% + 30¢ per successful US card charge, no monthly fee — confirm current rates on stripe.com/pricing).

## How the owner changes merch (no code, ever)
In the Stripe Dashboard → **Product catalog**:
- **Add an item:** Add product → name, description, photo, one-time price.
  Optional: under *Additional options → Metadata* add `sizes` = `S,M,L,XL,XXL`
  and the site shows a size dropdown.
- **Deal / bundle:** just make it its own product (e.g. "Black Set — jacket + sweatpants", $100)
  and say what's included in the description.
- **Sold out but still visible:** metadata `sold_out` = `true` (remove it to restock).
- **Take it off the site:** Archive the product.
- **Change a price:** edit the product's default price.
- **Promo codes:** create in Stripe → Coupons → add a promotion code. Customers enter it at checkout.
Changes show up on the site within about a minute.

## One-time setup (developer)
1. Stripe: create an account. Create a **restricted API key** with permissions
   Products: Read, Prices: Read, Checkout Sessions: Write. Start with test mode.
2. Push these files to a GitHub repo and create a **Cloudflare Pages** project from it
   (no build command, output directory `/`). The `functions/` folder deploys automatically.
3. In Pages → Settings → Environment variables, add `STRIPE_SECRET_KEY` (the restricted key).
4. Shipping: in Stripe → Shipping rates, create a rate (flat fee or free), copy its ID
   (`shr_...`), and add it as env var `SHIPPING_RATE_ID`. Countries shipped to are set
   at the top of `functions/api/checkout.js` (default: US).
5. Test with Stripe test cards (4242 4242 4242 4242), then swap in the live key.

## Local preview
Create `.dev.vars` containing `STRIPE_SECRET_KEY=rk_test_...`, then run `npx wrangler pages dev .`

## Notes
- Prices are always read from Stripe on the server; the browser can't change them.
- Sales tax isn't configured. If the owner needs to collect it, look at Stripe Tax.
- Stripe doesn't track stock counts; use the `sold_out` flag or archive.
- Before cancelling Shopify: export products/images/customers, and make sure
  rawthreadz.com isn't registered through Shopify (transfer or repoint DNS first).
