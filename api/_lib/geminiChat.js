import { createClient } from "@supabase/supabase-js";

const DEFAULT_MODEL = "gemini-2.5-flash-lite";
const FALLBACK_MODELS = ["gemini-2.5-flash-lite", "gemini-2.5-flash"];

function geminiUrl(model) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
}

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    message: { type: "STRING" },
    cart: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          itemId: { type: "STRING" },
          qty: { type: "INTEGER" },
          forDrink: { type: "STRING" },
        },
        required: ["itemId", "qty"],
      },
    },
    updateCart: { type: "BOOLEAN" },
  },
  required: ["message", "updateCart"],
};

function flatMenuItems(menu) {
  return menu.categories.flatMap((cat) =>
    cat.items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      category: cat.title,
    }))
  );
}

function menuForPrompt(menu) {
  return flatMenuItems(menu).map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    category: item.category,
  }));
}

function buildSystemPrompt(menu, store) {
  const menuJson = JSON.stringify(menuForPrompt(menu), null, 2);
  const storeLines = store.isOpen
    ? [
        "Store is OPEN for pickup orders.",
        `GCash payment: ${store.gcashNumber} (${store.gcashAccountName}) — customer pays after confirming their order.`,
        "Pickup is usually ready 10–15 minutes after payment is received.",
      ]
    : ["Store is CLOSED — do not take orders. Tell the customer to check back later."];

  return `You are the friendly ordering assistant for Spazio café in Cebu, Philippines.

STRICT RULES:
1. ONLY discuss items listed in MENU_DATA. Never invent items, prices, sizes, or promotions.
2. If asked about something not in MENU_DATA, say you can only help with our current menu and placing orders.
3. Orders are pickup only. Do not offer delivery.
4. When updating the order, set updateCart to true and return the FULL cart using exact itemId values from MENU_DATA — include items already in the cart when the customer adds more.
5. When not changing the cart, set updateCart to false.
6. When listing menu items or an order summary, use line breaks: one item per line starting with •, category headers on their own line, and Total: on a separate line after items.
7. When the customer asks to see the menu, list the FULL MENU_DATA by category — not just items already in their cart. Set updateCart to false unless they add or change items.
8. After summarising items for checkout, ask the customer to reply "confirm" to continue.
9. Keep replies short, warm, and helpful.
10. Understand casual names (e.g. "cap" → Cappuccino, "croissant" → Almond Croissant) only when they clearly match a MENU_DATA item.
11. Add-ons (Extra shot, Oat milk swap, Vanilla syrup, etc.) must say which drink they apply to. Only add-on itemIds may use forDrink — never set forDrink on a coffee/drink itemId. When the same drink appears multiple times with different modifiers (e.g. "2 Spazio, extra shot on one and oat on the other"), split into separate cart lines — one drink per modifier bundle, never merge different modifier combos into one qty line.
12. If the order is already clear from the customer message, update the cart immediately — do not ask clarifying questions.
13. Do not discuss unrelated topics — gently redirect to ordering.
14. Prices in MENU_DATA are in Philippine Pesos (₱). Never guess prices.

MENU_DATA:
${menuJson}

STORE:
${storeLines.join("\n")}`;
}

function cartSummary(items) {
  if (!items.length) return "empty";
  return items
    .map((i) => (i.forDrink ? `${i.qty}× ${i.name} for ${i.forDrink}` : `${i.qty}× ${i.name}`))
    .join(", ");
}

function buildUserTurn(message, session) {
  const lines = [
    `[ORDER STATE]`,
    `Cart: ${cartSummary(session.items)}`,
    `Awaiting confirm: ${session.awaitingConfirm ? "yes" : "no"}`,
    ``,
    `Customer: ${message}`,
  ];
  return lines.join("\n");
}

function filterAvailableMenu(menu) {
  return {
    categories: (menu.categories ?? [])
      .map((cat) => ({
        ...cat,
        items: (cat.items ?? []).filter((item) => item.isAvailable !== false),
      }))
      .filter((cat) => cat.items.length > 0),
  };
}

function historyToContents(history) {
  if (!Array.isArray(history)) return [];
  return history
    .filter((m) => m?.text?.trim())
    .slice(-10)
    .map((m) => ({
      role: m.role === "bot" ? "model" : "user",
      parts: [{ text: m.text.trim() }],
    }));
}

async function fetchMenuFromSupabase(url, key) {
  const client = createClient(url, key);
  const [{ data: categories, error: catError }, { data: items, error: itemError }] =
    await Promise.all([
      client.from("menu_categories").select("*").order("sort_order"),
      client.from("menu_items").select("*").order("sort_order"),
    ]);
  if (catError) throw catError;
  if (itemError) throw itemError;

  return {
    categories: (categories ?? []).map((cat) => ({
      id: cat.id,
      title: cat.title,
      items: (items ?? [])
        .filter((item) => item.category_id === cat.id)
        .map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description ?? "",
          price: Number(item.price),
          isAvailable: item.is_available !== false,
        })),
    })),
  };
}

async function fetchStoreFromSupabase(url, key) {
  const client = createClient(url, key);
  const { data, error } = await client.from("store_config").select("is_open,gcash_number,gcash_account_name").eq("id", 1).single();
  if (error) throw error;
  return {
    isOpen: Boolean(data.is_open),
    gcashNumber: data.gcash_number,
    gcashAccountName: data.gcash_account_name,
  };
}

function cartLineKey(item) {
  return `${item.name}::${item.forDrink ?? ""}`;
}

function isAddonItemId(menu, itemId) {
  for (const cat of menu.categories) {
    if (!/add|extra|modifier/i.test(cat.title)) continue;
    const item = cat.items.find((row) => row.id === itemId);
    if (!item) continue;
    return /shot|swap|syrup|milk|extra/i.test(item.name) && Number(item.price) < 80;
  }
  return false;
}

function cartFromIds(cart, menu) {
  const byId = new Map();
  for (const cat of menu.categories) {
    for (const item of cat.items) {
      byId.set(item.id, item);
    }
  }

  const items = [];
  for (const entry of cart ?? []) {
    const item = byId.get(entry.itemId);
    if (!item) continue;
    const qty = Math.max(1, Math.min(99, Number(entry.qty) || 1));
    let forDrink =
      typeof entry.forDrink === "string" && entry.forDrink.trim() ? entry.forDrink.trim() : undefined;
    if (forDrink && !isAddonItemId(menu, entry.itemId)) {
      forDrink = undefined;
    }
    const line = { name: item.name, qty, price: item.price, forDrink };
    const existing = items.find((i) => cartLineKey(i) === cartLineKey(line));
    if (existing) existing.qty += qty;
    else items.push(line);
  }
  return items;
}

async function callGemini(apiKey, systemPrompt, history, userTurn, preferredModel) {
  const contents = [...historyToContents(history), { role: "user", parts: [{ text: userTurn }] }];
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 512,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
    },
  };

  const models = [
    preferredModel || DEFAULT_MODEL,
    ...FALLBACK_MODELS.filter((m) => m !== (preferredModel || DEFAULT_MODEL)),
  ];

  let lastError;
  for (const model of models) {
    try {
      const response = await fetch(`${geminiUrl(model)}?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const payload = await response.json();
      if (!response.ok) {
        const detail = payload?.error?.message ?? response.statusText;
        throw new Error(detail);
      }

      const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Gemini returned an empty response");

      return JSON.parse(text);
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      const retryable =
        /quota|limit:\s*0|not found|404|unavailable|shut down|deprecated/i.test(msg);
      if (!retryable) break;
      console.warn(`Gemini model ${model} failed, trying next…`, msg);
    }
  }

  throw new Error(`Gemini API error: ${lastError?.message ?? "All models failed"}`);
}

export async function handleChatRequest(body, env) {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "GEMINI_API_KEY is not configured" };
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return { ok: false, error: "Missing message" };
  }

  const session = body.session ?? { items: [], awaitingConfirm: false, awaitingName: false };
  const history = body.history ?? [];

  const supabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const supabaseKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;

  let menu = body.menu;
  let store = body.store ?? { isOpen: true, gcashNumber: "", gcashAccountName: "Spazio Coffee" };

  if (supabaseUrl && supabaseKey) {
    try {
      [menu, store] = await Promise.all([
        fetchMenuFromSupabase(supabaseUrl, supabaseKey),
        fetchStoreFromSupabase(supabaseUrl, supabaseKey),
      ]);
    } catch (err) {
      console.error("Supabase fetch failed, using client menu:", err);
      if (!menu?.categories?.length) {
        return { ok: false, error: "Could not load menu" };
      }
    }
  } else if (!menu?.categories?.length) {
    return { ok: false, error: "No menu available" };
  }

  menu = filterAvailableMenu(menu);

  if (!store.isOpen) {
    return {
      ok: true,
      message:
        "We're closed for orders right now. Browse the menu and check back soon — we'll be open for pickup again shortly.",
      updateCart: true,
      items: [],
      awaitingConfirm: false,
    };
  }

  const systemPrompt = buildSystemPrompt(menu, store);
  const userTurn = buildUserTurn(message, session);

  let ai;
  try {
    ai = await callGemini(apiKey, systemPrompt, history, userTurn, env.GEMINI_MODEL);
  } catch (err) {
    console.error("Gemini call failed:", err);
    return { ok: false, error: err.message };
  }

  let items = session.items ?? [];
  let awaitingConfirm = session.awaitingConfirm ?? false;

  if (ai.updateCart && Array.isArray(ai.cart)) {
    items = cartFromIds(ai.cart, menu);
    awaitingConfirm = items.length > 0;
  }

  return {
    ok: true,
    message: ai.message,
    items,
    awaitingConfirm,
    updateCart: Boolean(ai.updateCart),
  };
}
