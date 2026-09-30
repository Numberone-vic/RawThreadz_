import { getCatalog, json } from "../_lib/catalog.js";

export async function onRequestGet({ env }) {
  try {
    return json(await getCatalog(env), 200, { "Cache-Control": "public, max-age=60" });
  } catch (e) {
    console.error(e);
    return json({ error: "Could not load products." }, 500);
  }
}
