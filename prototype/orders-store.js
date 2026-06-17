/**
 * Spazio prototype — shared storage (localStorage).
 * Orders + dynamic menu categories for index.html and admin.html.
 */
const SPAZIO_ORDERS_KEY = "spazio_orders";
const SPAZIO_MENU_KEY = "spazio_menu";

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/* ——— Menu ——— */

function getMenu() {
  try {
    const data = JSON.parse(localStorage.getItem(SPAZIO_MENU_KEY) || "null");
    if (data?.categories) return data;
  } catch {
    /* fall through */
  }
  return seedMenu(true);
}

function saveMenu(menu) {
  localStorage.setItem(SPAZIO_MENU_KEY, JSON.stringify(menu));
}

function seedMenu(returnOnly = false) {
  const menu = {
    categories: [
      {
        id: "cat-coffee",
        title: "Coffee",
        items: [
          { id: "i-1", name: "Spazio Signature", description: "Espresso, oat milk, orange blossom", price: 185 },
          { id: "i-2", name: "Flat White", description: "Double ristretto, silky microfoam", price: 165 },
          { id: "i-3", name: "Pour Over", description: "Rotating single-origin, hand-brewed", price: 175 },
          { id: "i-4", name: "Cortado", description: "Equal parts espresso & warm milk", price: 155 },
          { id: "i-5", name: "Cappuccino", description: "Espresso with thick foam", price: 160 },
          { id: "i-6", name: "Matcha Latte", description: "Ceremonial grade, oat or dairy", price: 195 },
        ],
      },
      {
        id: "cat-addons",
        title: "Add-Ons",
        items: [
          { id: "i-7", name: "Almond Croissant", description: "House laminated, twice-baked", price: 145 },
          { id: "i-8", name: "Extra shot", description: "Additional espresso shot", price: 45 },
          { id: "i-9", name: "Oat milk swap", description: "Substitute dairy with oat milk", price: 35 },
          { id: "i-10", name: "Vanilla syrup", description: "House-made vanilla", price: 25 },
        ],
      },
    ],
  };

  if (!returnOnly && !localStorage.getItem(SPAZIO_MENU_KEY)) {
    saveMenu(menu);
  }
  return menu;
}

function getAllMenuItems() {
  return getMenu().categories.flatMap((c) =>
    c.items.map((item) => ({ ...item, category: c.title }))
  );
}

function getMenuPricesMap() {
  const map = {};
  getAllMenuItems().forEach((item) => {
    map[item.name] = item.price;
  });
  return map;
}

function addCategory(title) {
  const menu = getMenu();
  menu.categories.push({ id: uid(), title: title.trim(), items: [] });
  saveMenu(menu);
  return menu;
}

function updateCategory(categoryId, title) {
  const menu = getMenu();
  const cat = menu.categories.find((c) => c.id === categoryId);
  if (cat) cat.title = title.trim();
  saveMenu(menu);
  return menu;
}

function deleteCategory(categoryId) {
  const menu = getMenu();
  menu.categories = menu.categories.filter((c) => c.id !== categoryId);
  saveMenu(menu);
  return menu;
}

function addMenuItem(categoryId, { name, description, price }) {
  const menu = getMenu();
  const cat = menu.categories.find((c) => c.id === categoryId);
  if (!cat) return menu;
  cat.items.push({
    id: uid(),
    name: name.trim(),
    description: (description || "").trim(),
    price: parseInt(price, 10) || 0,
  });
  saveMenu(menu);
  return menu;
}

function updateMenuItem(categoryId, itemId, updates) {
  const menu = getMenu();
  const cat = menu.categories.find((c) => c.id === categoryId);
  if (!cat) return menu;
  const item = cat.items.find((i) => i.id === itemId);
  if (!item) return menu;
  if (updates.name !== undefined) item.name = updates.name.trim();
  if (updates.description !== undefined) item.description = updates.description.trim();
  if (updates.price !== undefined) item.price = parseInt(updates.price, 10) || 0;
  saveMenu(menu);
  return menu;
}

function deleteMenuItem(categoryId, itemId) {
  const menu = getMenu();
  const cat = menu.categories.find((c) => c.id === categoryId);
  if (cat) cat.items = cat.items.filter((i) => i.id !== itemId);
  saveMenu(menu);
  return menu;
}

function resetMenu() {
  localStorage.removeItem(SPAZIO_MENU_KEY);
  return seedMenu();
}

/* ——— Orders ——— */

function getOrders() {
  try {
    return JSON.parse(localStorage.getItem(SPAZIO_ORDERS_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveOrders(orders) {
  localStorage.setItem(SPAZIO_ORDERS_KEY, JSON.stringify(orders));
}

function nextOrderId() {
  const orders = getOrders();
  const max = orders.reduce((m, o) => Math.max(m, parseInt(o.id, 10) || 0), 1041);
  return String(max + 1);
}

function addOrder({ customerName, items, notes = "" }) {
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const order = {
    id: nextOrderId(),
    customerName: customerName || "Guest",
    items,
    total,
    status: "pending",
    notes,
    createdAt: new Date().toISOString(),
  };
  const orders = getOrders();
  orders.unshift(order);
  saveOrders(orders);
  return order;
}

function updateOrder(id, updates) {
  const orders = getOrders().map((o) => (o.id === id ? { ...o, ...updates } : o));
  saveOrders(orders);
  return orders.find((o) => o.id === id);
}

function deleteOrder(id) {
  saveOrders(getOrders().filter((o) => o.id !== id));
}

function seedSampleOrders() {
  if (getOrders().length > 0) return;

  const now = Date.now();
  saveOrders([
    {
      id: "1042",
      customerName: "Alex",
      items: [
        { name: "Flat White", qty: 1, price: 165 },
        { name: "Almond Croissant", qty: 1, price: 145 },
      ],
      total: 310,
      status: "preparing",
      notes: "Via chat",
      createdAt: new Date(now - 1000 * 60 * 12).toISOString(),
    },
    {
      id: "1041",
      customerName: "Maria",
      items: [{ name: "Spazio Signature", qty: 2, price: 185 }],
      total: 370,
      status: "ready",
      notes: "",
      createdAt: new Date(now - 1000 * 60 * 45).toISOString(),
    },
    {
      id: "1040",
      customerName: "James",
      items: [{ name: "Matcha Latte", qty: 1, price: 195 }],
      total: 195,
      status: "completed",
      notes: "Oat milk",
      createdAt: new Date(now - 1000 * 60 * 120).toISOString(),
    },
  ]);
}

function formatCurrency(amount) {
  return `₱${amount.toLocaleString()}`;
}

function formatTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMenuForChat() {
  return getMenu()
    .categories.map((cat) => {
      const lines = cat.items.map((i) => `${i.name} ${formatCurrency(i.price)}`).join(", ");
      return `${cat.title}: ${lines}`;
    })
    .join(" · ");
}

function parseItemsFromText(text) {
  const lower = text.toLowerCase();
  const prices = getMenuPricesMap();
  const items = [];
  const allItems = getAllMenuItems().sort((a, b) => b.name.length - a.name.length);

  for (const menuItem of allItems) {
    const key = menuItem.name.toLowerCase();
    if (!lower.includes(key)) continue;

    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const qtyMatch = lower.match(new RegExp(`(\\d+)\\s*(?:x\\s*)?${escaped.split(" ")[0]}`, "i"));
    const qty = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

    if (!items.find((i) => i.name === menuItem.name)) {
      items.push({ name: menuItem.name, qty, price: prices[menuItem.name] });
    }
  }

  return items;
}

// Initialise menu on first load
if (!localStorage.getItem(SPAZIO_MENU_KEY)) {
  seedMenu();
}
