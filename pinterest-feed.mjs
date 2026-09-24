#!/usr/bin/env node
/* =====================================================================
 * Pinterest-productfeed generator — SOPHIES LABEL (US / USD)
 * ---------------------------------------------------------------------
 * Haalt actieve producten uit sophieslabel.com (Shopify Admin API) en
 * schrijft een tab-gescheiden Pinterest-catalogusfeed naar pinterest-feed.tsv.
 *
 * !! HET TOKEN STAAT HIER NIET IN, EN HOORT HIER NIET IN.             !!
 * De feed moet publiek gehost worden, dus de repo is publiek, dus een
 * token in dit bestand ligt op straat. Het token komt uit een env-var:
 *   lokaal   -> run-local.ps1 (leest secrets.local.ps1, niet in git)
 *   Actions  -> repo secret SHOPIFY_ADMIN_TOKEN
 * ===================================================================== */

const CONFIG = {
  SHOPIFY_STORE: "yxf7rt-pg.myshopify.com",
  SHOPIFY_ADMIN_TOKEN: "",            // ALTIJD via env-var. Laat leeg.
  SHOPIFY_API_VERSION: "2026-07",
  PRIMARY_DOMAIN: "sophieslabel.com", // geclaimd in Pinterest (naast yxf7rt-pg)
  BRAND: "Sophies Label",
  CURRENCY: "USD",
  DEFAULT_GPC: "Apparel & Accessories > Clothing > Dresses",
  INCLUDE_OUT_OF_STOCK: false,
  OUT: "./pinterest-feed.tsv",

  /* --- omvang ---------------------------------------------------------
   * Staat op de VOLLEDIGE catalogus: alle actieve producten, 2026-09-24
   * waren dat 656 producten / ~7.712 feedrijen. Keuze van de user.
   *
   * MAX_PRODUCTS  Bovengrens op het aantal producten. 0 = geen cap.
   *               Wil je het toch doseren, zet er dan bv. 50 of 150.
   *               Verhogen VOEGT ALLEEN TOE: de selectie is gesorteerd op
   *               product-id, dus wat al in de feed zat blijft erin.
   *               Producten die in en uit een feed knipperen is zelf een
   *               slecht signaal, dus verlaag deze waarde liever niet.
   * FEED_TAG      Alleen producten met deze tag. Leeg = alle producten.
   * ------------------------------------------------------------------ */
  FEED_TAG: "",
  MAX_PRODUCTS: 0,
};

import fs from "node:fs";
// Een env-var wint, maar een LEGE env-var telt als "niet gezet" en valt terug op
// CONFIG. Anders zet een niet-ingestelde GitHub-variable de cap stil op 0 (=uit).
const cfg = (k) => {
  const e = process.env[k];
  return e === undefined || e === "" ? CONFIG[k] : e;
};

const STORE = cfg("SHOPIFY_STORE");
const TOKEN = cfg("SHOPIFY_ADMIN_TOKEN");
const API = cfg("SHOPIFY_API_VERSION") || "2026-07";
const DOMAIN = String(cfg("PRIMARY_DOMAIN")).replace(/^https?:\/\//, "").replace(/\/+$/, "");
const BRAND = cfg("BRAND");
const CURRENCY = cfg("CURRENCY") || "USD";
const DEFAULT_GPC = cfg("DEFAULT_GPC");
const INCLUDE_OOS = String(cfg("INCLUDE_OUT_OF_STOCK")) === "true";
const OUT = cfg("OUT") || "./pinterest-feed.tsv";
const FEED_TAG = String(cfg("FEED_TAG") || "").trim().toLowerCase();
const MAX_PRODUCTS = parseInt(cfg("MAX_PRODUCTS") || "0", 10) || 0;

if (!TOKEN) {
  console.error("!! Geen SHOPIFY_ADMIN_TOKEN. Lokaal: .\\run-local.ps1  |  Actions: repo secret.");
  process.exit(1);
}

const HEADERS = ["id","title","description","link","image_link","availability","price","sale_price","brand","condition","custom_label_0","custom_label_1","custom_label_2","product_type","google_product_category","item_group_id","size","color"];

const clean = (s) => String(s || "").replace(/[\t\r\n]+/g, " ").trim();
const priceBand = (p) => (p < 25 ? "under-25" : p < 50 ? "25-50" : p < 100 ? "50-100" : "100-plus");

// Producttype -> Google Product Category (VOLLEDIG pad; te ondiep = Pinterest-warning 126)
function gpcOf(t) {
  t = String(t).toLowerCase();
  if (/jumpsuit|romper|playsuit/.test(t)) return "Apparel & Accessories > Clothing > One-Pieces > Jumpsuits & Rompers";
  if (/dress|gown|frock/.test(t)) return "Apparel & Accessories > Clothing > Dresses";
  if (/skirt/.test(t)) return "Apparel & Accessories > Clothing > Skirts";
  if (/\bshort/.test(t)) return "Apparel & Accessories > Clothing > Shorts";
  if (/\b(pant|trouser|legging|jean)/.test(t)) return "Apparel & Accessories > Clothing > Pants";
  if (/\b(top|blouse|shirt|cami|bodysuit|corset|bralette|tee|tank)/.test(t)) return "Apparel & Accessories > Clothing > Shirts & Tops";
  if (/hoodie|sweatshirt|sweater|knit|cardigan|jumper/.test(t)) return "Apparel & Accessories > Clothing > Outerwear > Coats & Jackets";
  if (/coat|jacket|blazer|outerwear/.test(t)) return "Apparel & Accessories > Clothing > Outerwear > Coats & Jackets";
  if (/\bshoe|heel|boot|sandal|sneaker|flat/.test(t)) return "Apparel & Accessories > Shoes";
  if (/necklace|pendant|choker/.test(t)) return "Apparel & Accessories > Jewelry > Necklaces";
  if (/earring/.test(t)) return "Apparel & Accessories > Jewelry > Earrings";
  if (/bracelet|bangle|anklet/.test(t)) return "Apparel & Accessories > Jewelry > Bracelets";
  if (/\bring(s)?\b/.test(t)) return "Apparel & Accessories > Jewelry > Rings";
  if (/jewel|brooch/.test(t)) return "Apparel & Accessories > Jewelry";
  if (/bag|clutch|purse|handbag|tote/.test(t)) return "Apparel & Accessories > Handbags, Wallets & Cases > Handbags";
  if (/wallet|cardholder/.test(t)) return "Apparel & Accessories > Handbags, Wallets & Cases > Wallets & Money Clips";
  if (/belt/.test(t)) return "Apparel & Accessories > Clothing Accessories > Belts";
  if (/\bhat\b|beanie|cap\b/.test(t)) return "Apparel & Accessories > Clothing Accessories > Hats";
  if (/scarf|shawl|wrap\b/.test(t)) return "Apparel & Accessories > Clothing Accessories > Scarves & Shawls";
  if (/sunglass|eyewear/.test(t)) return "Apparel & Accessories > Clothing Accessories > Sunglasses";
  if (/accessor/.test(t)) return "Apparel & Accessories > Clothing Accessories";
  return DEFAULT_GPC;
}

const sizedImg = (u) => (u ? u + (u.includes("?") ? "&" : "?") + "width=1000" : u);

async function getAllProducts() {
  const out = [];
  let url = `https://${STORE}/admin/api/${API}/products.json?limit=250&status=active`;
  while (url) {
    const r = await fetch(url, { headers: { "X-Shopify-Access-Token": TOKEN } });
    if (!r.ok) throw new Error("Shopify " + r.status + " " + (await r.text()).slice(0, 160));
    const j = await r.json();
    out.push(...(j.products || []));
    const link = r.headers.get("link") || "";
    const m = link.match(/<([^>]+)>;\s*rel="next"/);
    url = m ? m[1] : null;
  }
  return out;
}

function rowsFor(p) {
  const pid = String(p.id);
  const variants = p.variants || [];
  if (!variants.length) return [];
  const title = clean(p.title).substring(0, 500);
  const description = clean(String(p.body_html || p.title || "").replace(/<[^>]+>/g, "")).substring(0, 5000);
  const handle = p.handle || pid;
  const productType = clean(p.product_type).substring(0, 250);
  const gpc = gpcOf(productType + " " + title);
  const firstTag = clean(String(p.tags || "").split(",")[0] || "");
  const options = p.options || [];
  const sizeIdx = options.findIndex((o) => /size/i.test(String(o?.name || "")));
  const colorIdx = options.findIndex((o) => /colou?r/i.test(String(o?.name || "")));
  const optVal = (v, idx) => (idx >= 0 ? clean(v["option" + (idx + 1)]).substring(0, 100) : "");
  const imgById = new Map();
  for (const img of p.images || []) if (img?.id != null && img?.src) imgById.set(String(img.id), String(img.src));
  const defaultImage = (p.images && p.images[0]?.src) || "";

  const rows = [];
  for (const v of variants) {
    const inStock = v.inventory_management == null || (v.inventory_quantity ?? 0) > 0;
    if (!inStock && !INCLUDE_OOS) continue;
    const price = parseFloat(v.price || "0");
    const compareAt = parseFloat(v.compare_at_price || "0");
    const onSale = compareAt > price;
    const priceField = onSale ? `${compareAt.toFixed(2)} ${CURRENCY}` : `${price.toFixed(2)} ${CURRENCY}`;
    const salePriceField = onSale ? `${price.toFixed(2)} ${CURRENCY}` : "";
    const image = (v.image_id != null && imgById.get(String(v.image_id))) || defaultImage;
    if (!image) continue; // Pinterest vereist image_link
    const link = `https://${DOMAIN}/products/${handle}?utm_source=pinterest&utm_medium=cpc&utm_campaign=catalog&variant=${v.id}`;
    rows.push([
      String(v.id), title, description, link, sizedImg(image),
      inStock ? "in stock" : "out of stock", priceField, salePriceField,
      BRAND, "new", "", firstTag, priceBand(price),
      productType, gpc, pid, optVal(v, sizeIdx), optVal(v, colorIdx),
    ]);
  }
  return rows;
}

let products = await getAllProducts();
const totalActive = products.length;

if (FEED_TAG) {
  products = products.filter((p) =>
    String(p.tags || "").split(",").map((t) => t.trim().toLowerCase()).includes(FEED_TAG)
  );
}
// Deterministische volgorde, zodat een hogere cap alleen TOEVOEGT.
products.sort((a, b) => Number(a.id) - Number(b.id));
const afterTag = products.length;
if (MAX_PRODUCTS > 0) products = products.slice(0, MAX_PRODUCTS);

const allRows = [];
for (const p of products) allRows.push(...rowsFor(p));
const tsv = [HEADERS.join("\t"), ...allRows.map((r) => r.map((c) => clean(c)).join("\t"))].join("\n") + "\n";
const tmp = OUT + ".tmp";
fs.writeFileSync(tmp, tsv);
fs.renameSync(tmp, OUT);

console.log(`Feed geschreven: ${OUT}`);
console.log(`Actief in store : ${totalActive}`);
if (FEED_TAG) console.log(`Na tag "${FEED_TAG}" : ${afterTag}`);
if (MAX_PRODUCTS) console.log(`Na cap ${MAX_PRODUCTS}        : ${products.length}  (van ${afterTag} in aanmerking)`);
console.log(`In de feed      : ${products.length} producten | ${allRows.length} rijen | ${tsv.length} bytes`);
