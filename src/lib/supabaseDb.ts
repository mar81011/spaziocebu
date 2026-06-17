import type {
  Menu,
  MenuItem,
  NotificationSettings,
  Order,
  OrderLineItem,
  PaymentSettings,
} from "../types";
import { supabase } from "./supabase";

type StoreConfigRow = {
  id: number;
  is_open: boolean;
  gcash_number: string;
  gcash_account_name: string;
  alerts_enabled: boolean;
  owner_phone: string;
  semaphore_api_key: string;
  ntfy_topic: string;
  owner_email: string;
  email_alerts_enabled: boolean;
  webhook_url: string;
  browser_alerts_enabled: boolean;
};

type OrderRow = {
  id: number;
  customer_name: string;
  items: OrderLineItem[];
  total: number;
  status: Order["status"];
  notes: string;
  created_at: string;
};

function assertClient() {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

function rowToOrder(row: OrderRow): Order {
  return {
    id: String(row.id),
    customerName: row.customer_name,
    items: row.items,
    total: Number(row.total),
    status: row.status,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function configToPayment(row: StoreConfigRow): PaymentSettings {
  return {
    gcashNumber: row.gcash_number,
    gcashAccountName: row.gcash_account_name,
  };
}

function configToNotification(row: StoreConfigRow): NotificationSettings {
  return {
    alertsEnabled: row.alerts_enabled,
    ownerPhone: row.owner_phone,
    semaphoreApiKey: row.semaphore_api_key,
    ntfyTopic: row.ntfy_topic || "Spazio",
    ownerEmail: row.owner_email,
    emailAlertsEnabled: row.email_alerts_enabled,
    webhookUrl: row.webhook_url,
    browserAlertsEnabled: row.browser_alerts_enabled,
  };
}

export async function fetchStoreConfig(): Promise<StoreConfigRow> {
  const client = assertClient();
  const { data, error } = await client.from("store_config").select("*").eq("id", 1).single();
  if (error) throw error;
  return data as StoreConfigRow;
}

export async function fetchOrders(): Promise<Order[]> {
  const client = assertClient();
  const { data, error } = await client
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as OrderRow[]).map(rowToOrder);
}

export async function fetchMenu(): Promise<Menu> {
  const client = assertClient();
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
        .map(
          (item): MenuItem => ({
            id: item.id,
            name: item.name,
            description: item.description,
            price: Number(item.price),
            cost: Number(item.cost ?? 0),
          })
        ),
    })),
  };
}

export async function insertOrder({
  customerName,
  items,
  notes,
  status = "awaiting_payment",
  createdAt,
}: {
  customerName: string;
  items: OrderLineItem[];
  notes: string;
  status?: Order["status"];
  createdAt?: string;
}): Promise<Order> {
  const client = assertClient();
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const row: Record<string, unknown> = {
    customer_name: customerName,
    items,
    total,
    status,
    notes,
  };
  if (createdAt) row.created_at = createdAt;

  const { data, error } = await client.from("orders").insert(row).select("*").single();
  if (error) throw error;
  return rowToOrder(data as OrderRow);
}

export async function patchOrder(id: string, updates: Partial<Order>): Promise<Order> {
  const client = assertClient();
  const payload: Record<string, unknown> = {};
  if (updates.customerName !== undefined) payload.customer_name = updates.customerName;
  if (updates.items !== undefined) payload.items = updates.items;
  if (updates.total !== undefined) payload.total = updates.total;
  if (updates.status !== undefined) payload.status = updates.status;
  if (updates.notes !== undefined) payload.notes = updates.notes;

  const { data, error } = await client
    .from("orders")
    .update(payload)
    .eq("id", Number(id))
    .select("*")
    .single();
  if (error) throw error;
  return rowToOrder(data as OrderRow);
}

export async function removeOrder(id: string): Promise<void> {
  const client = assertClient();
  const { error } = await client.from("orders").delete().eq("id", Number(id));
  if (error) throw error;
}

export async function clearOrders(): Promise<void> {
  const client = assertClient();
  const { error } = await client.from("orders").delete().neq("id", 0);
  if (error) throw error;
}

export async function updateStoreOpen(isOpen: boolean): Promise<void> {
  const client = assertClient();
  const { error } = await client
    .from("store_config")
    .update({ is_open: isOpen, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw error;
}

export async function updatePaymentSettings(settings: PaymentSettings): Promise<void> {
  const client = assertClient();
  const { error } = await client
    .from("store_config")
    .update({
      gcash_number: settings.gcashNumber,
      gcash_account_name: settings.gcashAccountName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) throw error;
}

export async function updateNotificationSettings(settings: NotificationSettings): Promise<void> {
  const client = assertClient();
  const { error } = await client
    .from("store_config")
    .update({
      alerts_enabled: settings.alertsEnabled,
      owner_phone: settings.ownerPhone,
      semaphore_api_key: settings.semaphoreApiKey,
      ntfy_topic: settings.ntfyTopic,
      owner_email: settings.ownerEmail,
      email_alerts_enabled: settings.emailAlertsEnabled,
      webhook_url: settings.webhookUrl,
      browser_alerts_enabled: settings.browserAlertsEnabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", 1);
  if (error) throw error;
}

export async function upsertCategory(id: string, title: string, sortOrder: number): Promise<void> {
  const client = assertClient();
  const { error } = await client
    .from("menu_categories")
    .upsert({ id, title, sort_order: sortOrder });
  if (error) throw error;
}

export async function deleteCategoryDb(id: string): Promise<void> {
  const client = assertClient();
  const { error } = await client.from("menu_categories").delete().eq("id", id);
  if (error) throw error;
}

export async function upsertMenuItem(
  item: MenuItem & { categoryId: string; sortOrder: number }
): Promise<void> {
  const client = assertClient();
  const { error } = await client.from("menu_items").upsert({
    id: item.id,
    category_id: item.categoryId,
    name: item.name,
    description: item.description,
    price: item.price,
    cost: item.cost ?? 0,
    sort_order: item.sortOrder,
  });
  if (error) throw error;
}

export async function deleteMenuItemDb(id: string): Promise<void> {
  const client = assertClient();
  const { error } = await client.from("menu_items").delete().eq("id", id);
  if (error) throw error;
}

export async function clearMenuDb(): Promise<void> {
  const client = assertClient();
  const { error: itemsError } = await client.from("menu_items").delete().neq("id", "");
  if (itemsError) throw itemsError;
  const { error: catError } = await client.from("menu_categories").delete().neq("id", "");
  if (catError) throw catError;
}

export function paymentFromConfig(row: StoreConfigRow): PaymentSettings {
  return configToPayment(row);
}

export function notificationFromConfig(row: StoreConfigRow): NotificationSettings {
  return configToNotification(row);
}

export function subscribeToDbChanges(handlers: {
  onOrders?: () => void;
  onMenu?: () => void;
  onConfig?: () => void;
}) {
  const client = assertClient();
  const channel = client
    .channel("spazio-db")
    .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
      handlers.onOrders?.();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "menu_categories" }, () => {
      handlers.onMenu?.();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, () => {
      handlers.onMenu?.();
    })
    .on("postgres_changes", { event: "*", schema: "public", table: "store_config" }, () => {
      handlers.onConfig?.();
    })
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
