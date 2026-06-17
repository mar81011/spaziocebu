import type { Menu, MenuItem, Order, OrderLineItem, PaymentSettings, NotificationSettings } from "../types";
import { notifyOwnerOnNewOrder } from "./notify";
import { notifyCustomerOnStatusChange } from "./customerNotify";
import { isSupabaseConfigured } from "./supabase";
import * as db from "./supabaseDb";

const ORDERS_KEY = "spazio_orders";
const MENU_KEY = "spazio_menu";
const STORE_OPEN_KEY = "spazio_store_open";
const PAYMENT_KEY = "spazio_payment";
const NOTIFICATION_KEY = "spazio_notifications";

export const MENU_UPDATED = "spazio-menu-update";
export const ORDERS_UPDATED = "spazio-orders-update";
export const STORE_STATUS_UPDATED = "spazio-store-status-update";
export const PAYMENT_SETTINGS_UPDATED = "spazio-payment-settings-update";
export const NOTIFICATION_SETTINGS_UPDATED = "spazio-notification-settings-update";

let ordersCache: Order[] | null = null;
let menuCache: Menu | null = null;
let storeOpenCache: boolean | null = null;
let paymentCache: PaymentSettings | null = null;
let notificationCache: NotificationSettings | null = null;
let bootstrapDone = false;

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function emitMenuUpdate() {
  window.dispatchEvent(new Event(MENU_UPDATED));
}

function emitOrdersUpdate() {
  window.dispatchEvent(new Event(ORDERS_UPDATED));
}

function emitStoreStatusUpdate() {
  window.dispatchEvent(new Event(STORE_STATUS_UPDATED));
}

function emitPaymentSettingsUpdate() {
  window.dispatchEvent(new Event(PAYMENT_SETTINGS_UPDATED));
}

function emitNotificationSettingsUpdate() {
  window.dispatchEvent(new Event(NOTIFICATION_SETTINGS_UPDATED));
}

export function isDatabaseEnabled() {
  return isSupabaseConfigured;
}

export function isStorageReady() {
  return bootstrapDone;
}

export async function bootstrapStorage(): Promise<void> {
  if (!isSupabaseConfigured) {
    initMenu();
    initPaymentSettings();
    initNotificationSettings();
    seedSampleOrders();
    bootstrapDone = true;
    return;
  }

  try {
    const config = await db.fetchStoreConfig();
    storeOpenCache = config.is_open;
    paymentCache = db.paymentFromConfig(config);
    notificationCache = db.notificationFromConfig(config);
    ordersCache = await db.fetchOrders();
    menuCache = await db.fetchMenu();

    if (ordersCache.length === 0) {
      await seedSampleOrdersDb();
      ordersCache = await db.fetchOrders();
    }

    db.subscribeToDbChanges({
      onOrders: () => {
        void db.fetchOrders().then((orders) => {
          ordersCache = orders;
          emitOrdersUpdate();
        });
      },
      onMenu: () => {
        void db.fetchMenu().then((menu) => {
          menuCache = menu;
          emitMenuUpdate();
        });
      },
      onConfig: () => {
        void db.fetchStoreConfig().then((next) => {
          storeOpenCache = next.is_open;
          paymentCache = db.paymentFromConfig(next);
          notificationCache = db.notificationFromConfig(next);
          emitStoreStatusUpdate();
          emitPaymentSettingsUpdate();
          emitNotificationSettingsUpdate();
        });
      },
    });
  } catch (error) {
    console.error("Failed to load Supabase data:", error);
  }

  bootstrapDone = true;
}

function defaultPaymentSettings(): PaymentSettings {
  return {
    gcashNumber: "09171234567",
    gcashAccountName: "Spazio Coffee",
  };
}

function defaultNotificationSettings(): NotificationSettings {
  return {
    alertsEnabled: true,
    ownerPhone: "",
    semaphoreApiKey: "",
    ntfyTopic: "Spazio",
    ownerEmail: "",
    emailAlertsEnabled: false,
    webhookUrl: "",
    browserAlertsEnabled: true,
  };
}

function normalizeOrderStatus(status: string): Order["status"] {
  if (status === "pending") return "awaiting_payment";
  if (status === "awaiting_payment" || status === "preparing" || status === "ready" || status === "completed") {
    return status;
  }
  return "awaiting_payment";
}

function defaultMenu(): Menu {
  return {
    categories: [
      {
        id: "cat-coffee",
        title: "Coffee",
        items: [
          { id: "i-1", name: "Spazio Signature", description: "Espresso, oat milk, orange blossom", price: 185, cost: 70 },
          { id: "i-2", name: "Flat White", description: "Double ristretto, silky microfoam", price: 165, cost: 55 },
          { id: "i-3", name: "Pour Over", description: "Rotating single-origin, hand-brewed", price: 175, cost: 60 },
          { id: "i-4", name: "Cortado", description: "Equal parts espresso & warm milk", price: 155, cost: 50 },
          { id: "i-5", name: "Cappuccino", description: "Espresso with thick foam", price: 160, cost: 52 },
          { id: "i-6", name: "Matcha Latte", description: "Ceremonial grade, oat or dairy", price: 195, cost: 80 },
        ],
      },
      {
        id: "cat-addons",
        title: "Add-Ons",
        items: [
          { id: "i-7", name: "Almond Croissant", description: "House laminated, twice-baked", price: 145, cost: 55 },
          { id: "i-8", name: "Extra shot", description: "Additional espresso shot", price: 45, cost: 15 },
          { id: "i-9", name: "Oat milk swap", description: "Substitute dairy with oat milk", price: 35, cost: 12 },
          { id: "i-10", name: "Vanilla syrup", description: "House-made vanilla", price: 25, cost: 8 },
        ],
      },
    ],
  };
}

export function isStoreOpen(): boolean {
  if (isSupabaseConfigured) return storeOpenCache ?? true;
  const value = localStorage.getItem(STORE_OPEN_KEY);
  if (value === null) return true;
  return value === "true";
}

export function setStoreOpen(open: boolean) {
  if (isSupabaseConfigured) {
    storeOpenCache = open;
    emitStoreStatusUpdate();
    void db.updateStoreOpen(open).catch(console.error);
    return;
  }
  localStorage.setItem(STORE_OPEN_KEY, String(open));
  emitStoreStatusUpdate();
}

export function toggleStoreOpen() {
  setStoreOpen(!isStoreOpen());
  return isStoreOpen();
}

export function getPaymentSettings(): PaymentSettings {
  if (isSupabaseConfigured) return paymentCache ?? defaultPaymentSettings();
  try {
    const data = JSON.parse(localStorage.getItem(PAYMENT_KEY) || "null") as PaymentSettings | null;
    if (data?.gcashNumber) return data;
  } catch {
    /* empty */
  }
  return defaultPaymentSettings();
}

export function savePaymentSettings(settings: PaymentSettings) {
  if (isSupabaseConfigured) {
    paymentCache = settings;
    emitPaymentSettingsUpdate();
    void db.updatePaymentSettings(settings).catch(console.error);
    return;
  }
  localStorage.setItem(PAYMENT_KEY, JSON.stringify(settings));
  emitPaymentSettingsUpdate();
}

export function initPaymentSettings() {
  if (!localStorage.getItem(PAYMENT_KEY)) {
    savePaymentSettings(defaultPaymentSettings());
  }
}

export function getNotificationSettings(): NotificationSettings {
  if (isSupabaseConfigured) {
    const merged = { ...defaultNotificationSettings(), ...(notificationCache ?? {}) };
    if (!merged.ntfyTopic.trim()) merged.ntfyTopic = "Spazio";
    return merged;
  }
  try {
    const data = JSON.parse(localStorage.getItem(NOTIFICATION_KEY) || "null") as
      | NotificationSettings
      | null;
    if (data) {
      const merged = { ...defaultNotificationSettings(), ...data };
      if (!merged.ntfyTopic.trim()) merged.ntfyTopic = "Spazio";
      return merged;
    }
  } catch {
    /* empty */
  }
  return defaultNotificationSettings();
}

export function saveNotificationSettings(settings: NotificationSettings) {
  if (isSupabaseConfigured) {
    notificationCache = settings;
    emitNotificationSettingsUpdate();
    void db.updateNotificationSettings(settings).catch(console.error);
    return;
  }
  localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(settings));
  emitNotificationSettingsUpdate();
}

export function initNotificationSettings() {
  if (!localStorage.getItem(NOTIFICATION_KEY)) {
    saveNotificationSettings(defaultNotificationSettings());
  }
}

export function getMenu(): Menu {
  const normalize = (menu: Menu): Menu => ({
    categories: menu.categories.map((cat) => ({
      ...cat,
      items: cat.items.map((item) => ({ ...item, cost: item.cost ?? 0 })),
    })),
  });

  if (isSupabaseConfigured) return normalize(menuCache ?? defaultMenu());
  try {
    const data = JSON.parse(localStorage.getItem(MENU_KEY) || "null") as Menu | null;
    if (data?.categories) return normalize(data);
  } catch {
    /* empty */
  }
  return defaultMenu();
}

function saveMenuLocal(menu: Menu) {
  localStorage.setItem(MENU_KEY, JSON.stringify(menu));
  emitMenuUpdate();
}

export function saveMenu(menu: Menu) {
  if (isSupabaseConfigured) {
    void persistFullMenu(menu);
    return;
  }
  saveMenuLocal(menu);
}

async function persistFullMenu(menu: Menu) {
  await db.clearMenuDb();
  for (const [index, category] of menu.categories.entries()) {
    await db.upsertCategory(category.id, category.title, index);
    for (const [itemIndex, item] of category.items.entries()) {
      await db.upsertMenuItem({
        ...item,
        categoryId: category.id,
        sortOrder: itemIndex,
      });
    }
  }
  menuCache = await db.fetchMenu();
  emitMenuUpdate();
}

export function initMenu() {
  if (!localStorage.getItem(MENU_KEY)) {
    saveMenuLocal(defaultMenu());
  }
}

export function getAllMenuItems(menu: Menu) {
  return menu.categories.flatMap((c) =>
    c.items.map((item) => ({ ...item, category: c.title }))
  );
}

export function addCategory(title: string) {
  const menu = getMenu();
  const category = { id: uid(), title: title.trim(), items: [] };
  menu.categories.push(category);
  if (isSupabaseConfigured) {
    void db.upsertCategory(category.id, category.title, menu.categories.length - 1).then(async () => {
      menuCache = await db.fetchMenu();
      emitMenuUpdate();
    });
    menuCache = menu;
    emitMenuUpdate();
    return menu;
  }
  saveMenuLocal(menu);
  return menu;
}

export function updateCategory(categoryId: string, title: string) {
  const menu = getMenu();
  const cat = menu.categories.find((c) => c.id === categoryId);
  if (cat) cat.title = title.trim();
  if (isSupabaseConfigured) {
    const index = menu.categories.findIndex((c) => c.id === categoryId);
    void db.upsertCategory(categoryId, title.trim(), index).then(async () => {
      menuCache = await db.fetchMenu();
      emitMenuUpdate();
    });
    menuCache = menu;
    emitMenuUpdate();
    return menu;
  }
  saveMenuLocal(menu);
  return menu;
}

export function deleteCategory(categoryId: string) {
  const menu = getMenu();
  menu.categories = menu.categories.filter((c) => c.id !== categoryId);
  if (isSupabaseConfigured) {
    void db.deleteCategoryDb(categoryId).then(async () => {
      menuCache = await db.fetchMenu();
      emitMenuUpdate();
    });
    menuCache = menu;
    emitMenuUpdate();
    return menu;
  }
  saveMenuLocal(menu);
  return menu;
}

export function addMenuItem(
  categoryId: string,
  item: Pick<MenuItem, "name" | "description" | "price">
) {
  const menu = getMenu();
  const cat = menu.categories.find((c) => c.id === categoryId);
  if (!cat) return menu;
  const newItem = {
    id: uid(),
    name: item.name.trim(),
    description: item.description.trim(),
    price: item.price,
    cost: 0,
  };
  cat.items.push(newItem);
  if (isSupabaseConfigured) {
    void db
      .upsertMenuItem({
        ...newItem,
        categoryId,
        sortOrder: cat.items.length - 1,
      })
      .then(async () => {
        menuCache = await db.fetchMenu();
        emitMenuUpdate();
      });
    menuCache = menu;
    emitMenuUpdate();
    return menu;
  }
  saveMenuLocal(menu);
  return menu;
}

export function updateMenuItem(
  categoryId: string,
  itemId: string,
  updates: Partial<Pick<MenuItem, "name" | "description" | "price">>
) {
  const menu = getMenu();
  const cat = menu.categories.find((c) => c.id === categoryId);
  const item = cat?.items.find((i) => i.id === itemId);
  if (!item) return menu;
  if (updates.name !== undefined) item.name = updates.name.trim();
  if (updates.description !== undefined) item.description = updates.description.trim();
  if (updates.price !== undefined) item.price = updates.price;
  if (isSupabaseConfigured) {
    const sortOrder = cat?.items.findIndex((i) => i.id === itemId) ?? 0;
    void db
      .upsertMenuItem({
        ...item,
        categoryId,
        sortOrder,
      })
      .then(async () => {
        menuCache = await db.fetchMenu();
        emitMenuUpdate();
      });
    menuCache = menu;
    emitMenuUpdate();
    return menu;
  }
  saveMenuLocal(menu);
  return menu;
}

export function deleteMenuItem(categoryId: string, itemId: string) {
  const menu = getMenu();
  const cat = menu.categories.find((c) => c.id === categoryId);
  if (cat) cat.items = cat.items.filter((i) => i.id !== itemId);
  if (isSupabaseConfigured) {
    void db.deleteMenuItemDb(itemId).then(async () => {
      menuCache = await db.fetchMenu();
      emitMenuUpdate();
    });
    menuCache = menu;
    emitMenuUpdate();
    return menu;
  }
  saveMenuLocal(menu);
  return menu;
}

export function resetMenu() {
  const menu = defaultMenu();
  if (isSupabaseConfigured) {
    void persistFullMenu(menu);
    return menu;
  }
  localStorage.removeItem(MENU_KEY);
  saveMenuLocal(menu);
  return getMenu();
}

export function getOrders(): Order[] {
  if (isSupabaseConfigured) return ordersCache ?? [];
  try {
    const orders = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]") as Order[];
    return orders.map((o) => ({ ...o, status: normalizeOrderStatus(o.status as string) }));
  } catch {
    return [];
  }
}

function saveOrdersLocal(orders: Order[]) {
  localStorage.setItem(ORDERS_KEY, JSON.stringify(orders));
  emitOrdersUpdate();
}

function nextOrderIdLocal() {
  const orders = getOrders();
  const max = orders.reduce((m, o) => Math.max(m, parseInt(o.id, 10) || 0), 1041);
  return String(max + 1);
}

export async function addOrder({
  customerName,
  items,
  notes = "",
}: {
  customerName: string;
  items: OrderLineItem[];
  notes?: string;
}) {
  if (isSupabaseConfigured) {
    const order = await db.insertOrder({
      customerName: customerName || "Guest",
      items,
      notes,
    });
    ordersCache = [order, ...(ordersCache ?? [])];
    emitOrdersUpdate();
    void notifyOwnerOnNewOrder(order).catch(() => {});
    return order;
  }

  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const order: Order = {
    id: nextOrderIdLocal(),
    customerName: customerName || "Guest",
    items,
    total,
    status: "awaiting_payment",
    notes,
    createdAt: new Date().toISOString(),
  };
  saveOrdersLocal([order, ...getOrders()]);
  void notifyOwnerOnNewOrder(order).catch(() => {});
  return order;
}

export async function updateOrder(id: string, updates: Partial<Order>) {
  const existing = getOrders().find((o) => o.id === id);
  const previousStatus = existing?.status;

  if (isSupabaseConfigured) {
    const order = await db.patchOrder(id, updates);
    ordersCache = (ordersCache ?? []).map((o) => (o.id === id ? order : o));
    emitOrdersUpdate();
    if (updates.status && previousStatus && updates.status !== previousStatus) {
      void notifyCustomerOnStatusChange(order).catch(() => {});
    }
    return order;
  }

  const orders = getOrders().map((o) => (o.id === id ? { ...o, ...updates } : o));
  saveOrdersLocal(orders);
  const order = orders.find((o) => o.id === id);
  if (order && updates.status && previousStatus && updates.status !== previousStatus) {
    void notifyCustomerOnStatusChange(order).catch(() => {});
  }
  return order;
}

export async function deleteOrder(id: string) {
  if (isSupabaseConfigured) {
    await db.removeOrder(id);
    ordersCache = (ordersCache ?? []).filter((o) => o.id !== id);
    emitOrdersUpdate();
    return;
  }
  saveOrdersLocal(getOrders().filter((o) => o.id !== id));
}

async function seedSampleOrdersDb() {
  const now = Date.now();
  const samples = [
    {
      customerName: "Alex",
      items: [
        { name: "Flat White", qty: 1, price: 165 },
        { name: "Almond Croissant", qty: 1, price: 145 },
      ],
      notes: "Via chat",
      status: "preparing" as const,
      createdAt: new Date(now - 1000 * 60 * 12).toISOString(),
    },
    {
      customerName: "Maria",
      items: [{ name: "Spazio Signature", qty: 2, price: 185 }],
      notes: "",
      status: "ready" as const,
      createdAt: new Date(now - 1000 * 60 * 45).toISOString(),
    },
    {
      customerName: "James",
      items: [{ name: "Matcha Latte", qty: 1, price: 195 }],
      notes: "Oat milk",
      status: "completed" as const,
      createdAt: new Date(now - 1000 * 60 * 120).toISOString(),
    },
  ];

  for (const sample of samples) {
    await db.insertOrder(sample);
  }
}

export function seedSampleOrders() {
  if (getOrders().length > 0) return;
  const now = Date.now();
  saveOrdersLocal([
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

export async function resetOrders() {
  if (isSupabaseConfigured) {
    await db.clearOrders();
    await seedSampleOrdersDb();
    ordersCache = await db.fetchOrders();
    emitOrdersUpdate();
    return;
  }
  localStorage.removeItem(ORDERS_KEY);
  seedSampleOrders();
}
