/* Products come from /api/products (your Stripe catalog); checkout goes through /api/checkout. */
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const money = (cents, cur = "usd") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: cur.toUpperCase() }).format(cents / 100);

let products = [];
let cart = [];                       // [{ id, size, qty }]
try { cart = JSON.parse(localStorage.getItem("cart")) || []; } catch { cart = []; }
let term = "", sortBy = "featured";

const grid = $("productsGrid"), cartItems = $("cartItems"), cartDrawer = $("cartDrawer");

/* ---------- products ---------- */
async function loadProducts() {
  const res = await fetch("/api/products");
  if (!res.ok) throw new Error("server error");
  products = await res.json();
}
const find = id => products.find(p => p.id === id);

function renderProducts() {
  let list = products.filter(p => p.name.toLowerCase().includes(term));
  if (sortBy === "price-asc") list.sort((a, b) => a.price - b.price);
  if (sortBy === "price-desc") list.sort((a, b) => b.price - a.price);
  if (!list.length) { grid.innerHTML = `<p class="cart-empty">No products found.</p>`; return; }
  grid.innerHTML = list.map(p => `
    <div class="product-card" data-id="${esc(p.id)}">
      ${p.image ? `<img class="product-image" src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" />` : ""}
      <h3>${esc(p.name)}</h3>
      ${p.description ? `<p class="desc">${esc(p.description)}</p>` : ""}
      <p>${money(p.price, p.currency)}</p>
      ${p.sizes.length ? `<select class="variant-select">${p.sizes.map(s => `<option>${esc(s)}</option>`).join("")}</select>` : ""}
      <button class="btn-primary" data-add ${p.soldOut ? "disabled" : ""}>${p.soldOut ? "Sold out" : "Add"}</button>
    </div>`).join("");
}

/* ---------- cart ---------- */
// Drop anything the owner removed, sold out, or whose size no longer exists.
function syncCart() {
  cart = cart.filter(i => {
    const p = find(i.id);
    return p && !p.soldOut && (!p.sizes.length || p.sizes.includes(i.size));
  });
}

function addToCart(id, size) {
  const item = cart.find(i => i.id === id && i.size === size);
  if (item) item.qty = Math.min(item.qty + 1, 10);
  else cart.push({ id, size, qty: 1 });
  updateCart();
  cartDrawer.classList.add("open");
}

function updateQty(id, size, change) {
  const item = cart.find(i => i.id === id && i.size === size);
  if (!item) return;
  item.qty = Math.min(item.qty + change, 10);
  if (item.qty <= 0) cart = cart.filter(i => i !== item);
  updateCart();
}

function updateCart() {
  let total = 0, cur = "usd";
  cartItems.innerHTML = cart.map(i => {
    const p = find(i.id);
    if (!p) return "";
    cur = p.currency;
    total += p.price * i.qty;
    return `
      <div class="cart-item">
        <div>
          ${esc(p.name)}${i.size ? ` <small>(${esc(i.size)})</small>` : ""}
          <div class="qty-controls">
            <button data-id="${esc(i.id)}" data-size="${esc(i.size)}" data-delta="-1">-</button>
            ${i.qty}
            <button data-id="${esc(i.id)}" data-size="${esc(i.size)}" data-delta="1">+</button>
          </div>
        </div>
        <span>${money(p.price * i.qty, p.currency)}</span>
      </div>`;
  }).join("");
  $("cartEmpty").style.display = cart.length ? "none" : "block";
  $("checkoutBtn").disabled = !cart.length;
  $("cartTotal").textContent = (total / 100).toFixed(2);
  $("cartCount").textContent = cart.reduce((a, b) => a + b.qty, 0);
  localStorage.setItem("cart", JSON.stringify(cart));
}

/* ---------- checkout (payment happens on Stripe's hosted page) ---------- */
async function checkout() {
  if (!cart.length) return;
  const status = $("cartStatus");
  status.textContent = "Taking you to secure checkout…";
  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Checkout failed");
    window.location.href = data.url;
  } catch (e) {
    status.textContent = e.message;
  }
}

/* ---------- events ---------- */
grid.addEventListener("click", e => {
  const btn = e.target.closest("[data-add]");
  if (!btn) return;
  const card = btn.closest(".product-card");
  addToCart(card.dataset.id, card.querySelector(".variant-select")?.value || "");
});
cartItems.addEventListener("click", e => {
  const b = e.target.closest("button[data-id]");
  if (b) updateQty(b.dataset.id, b.dataset.size, Number(b.dataset.delta));
});
$("searchInput").oninput = e => { term = e.target.value.toLowerCase(); renderProducts(); };
$("sortSelect").onchange = e => { sortBy = e.target.value; renderProducts(); };
$("cartButton").onclick = () => cartDrawer.classList.add("open");
$("cartClose").onclick = () => cartDrawer.classList.remove("open");
$("checkoutBtn").onclick = checkout;

/* ---------- init ---------- */
$("year").textContent = new Date().getFullYear();
(async () => {
  const result = new URLSearchParams(location.search).get("checkout");
  if (result) {
    const banner = $("banner");
    if (result === "success") { cart = []; banner.textContent = "Thank you! Your order is confirmed — check your email for the receipt."; }
    else banner.textContent = "Checkout cancelled — your cart is still here.";
    banner.hidden = false;
    history.replaceState(null, "", location.pathname);
  }
  updateCart();
  try {
    grid.innerHTML = `<p class="cart-empty">Loading…</p>`;
    await loadProducts();
    syncCart();
    updateCart();
    renderProducts();
  } catch {
    grid.innerHTML = `<p class="cart-empty">Couldn't load products. (Previewing locally? Run <code>npx wrangler pages dev .</code> so the /api functions work.)</p>`;
  }
})();
