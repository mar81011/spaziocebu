import type {
  Menu,
  MenuItem,
  NotificationSettings,
  Order,
  OrderLineItem,
  OrderReview,
  PaymentSettings,
  SupportSettings,
} from "../types";
import { withDefaultGcashQr } from "./payment";
import { mergeSupportSettings } from "./support";
import { supabase } from "./supabase";

type StoreConfigRow = {
  id: number;
  is_open: boolean;
  gcash_number: string;
  gcash_account_name: string;
  gcash_qr_url: string;
  alerts_enabled: boolean;
  owner_phone: string;
  semaphore_api_key: string;
  ntfy_topic: string;
  owner_email: string;
  email_alerts_enabled: boolean;
  webhook_url: string;
  browser_alerts_enabled: boolean;
  support_phone: string;
  messenger_url: string;
  support_page_label: string;
  support_phone_label: string;
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

type ReviewRow = {
  id: number;
  customer_name: string;
  rating: number;
  comment: string;
  order_id: number | null;
  created_at: string;
};

function assertClient() {
  if (!supabase) throw new Error("Supabase is not configured");
  return supabase;
}

export function formatDbError(error: unknown): string {
  if (!error) return "Unknown database error.";
  if (typeof error === "object") {
    const row = error as { message?: string; details?: string; hint?: string; code?: string };
    const parts = [row.message, row.details, row.hint, row.code ? `(${row.code})` : ""].filter(Boolean);
    if (parts.length) return parts.join(" — ");
  }
  if (error instanceof Error) return error.message;
  return String(error);
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
  return withDefaultGcashQr({
    gcashNumber: row.gcash_number,
    gcashAccountName: row.gcash_account_name,
    gcashQrUrl: row.gcash_qr_url ?? "",
  });
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

function configToSupport(row: StoreConfigRow): SupportSettings {
  return mergeSupportSettings({
    supportPhone: row.support_phone ?? "",
    supportPageUrl: row.messenger_url ?? "",
    supportPageLabel: row.support_page_label ?? "",
    supportPhoneLabel: row.support_phone_label ?? "",
  });
}

export async function fetchStoreConfig(): Promise<StoreConfigRow> {
  const client = assertClient();
  const { data, error } = await client.from("store_config").select("*").eq("id", 1).single();
  if (error) throw error;
  return data as StoreConfigRow;
}

function rowToReview(row: ReviewRow): OrderReview {
  return {
    id: String(row.id),
    customerName: row.customer_name,
    rating: row.rating,
    comment: row.comment,
    orderId: row.order_id != null ? String(row.order_id) : undefined,
    createdAt: row.created_at,
  };
}

export async function fetchReviews(): Promise<OrderReview[]> {
  const client = assertClient();
  const { data, error } = await client
    .from("order_reviews")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as ReviewRow[]).map(rowToReview);
}

export async function insertReview(review: {
  customerName: string;
  rating: number;
  comment: string;
  orderId?: string;
}): Promise<OrderReview> {
  const client = assertClient();
  const { data, error } = await client
    .from("order_reviews")
    .insert({
      customer_name: review.customerName.trim(),
      rating: review.rating,
      comment: review.comment.trim(),
      order_id: review.orderId ? Number(review.orderId) : null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return rowToReview(data as ReviewRow);
}

export async function deleteReviewDb(id: string): Promise<void> {
  const client = assertClient();
  const { error } = await client.from("order_reviews").delete().eq("id", Number(id));
  if (error) throw error;
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
            isAvailable: item.is_available !== false,
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
      gcash_qr_url: settings.gcashQrUrl ?? "",
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

export async function updateSupportSettings(settings: SupportSettings): Promise<void> {
  const client = assertClient();
  const payload = {
    support_phone: settings.supportPhone,
    messenger_url: settings.supportPageUrl,
    support_page_label: settings.supportPageLabel,
    support_phone_label: settings.supportPhoneLabel,
    updated_at: new Date().toISOString(),
  };
  const { error } = await client.from("store_config").update(payload).eq("id", 1);
  if (!error) return;

  const missingColumn =
    error.message.includes("support_page_label") ||
    error.message.includes("support_phone_label") ||
    error.message.includes("messenger_url") ||
    error.message.includes("support_phone") ||
    error.code === "PGRST204";

  if (missingColumn) {
    const { error: retryError } = await client
      .from("store_config")
      .update({
        support_phone: settings.supportPhone,
        messenger_url: settings.supportPageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    if (!retryError) return;
    throw retryError;
  }

  throw error;
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

const AVAILABILITY_MIGRATION_HINT =
  "Run supabase/migration_admin_and_availability.sql in the Supabase SQL Editor to enable availability toggles.";

export async function upsertMenuItem(
  item: MenuItem & { categoryId: string; sortOrder: number }
): Promise<void> {
  const client = assertClient();
  const base = {
    id: item.id,
    category_id: item.categoryId,
    name: item.name,
    description: item.description,
    price: item.price,
    sort_order: item.sortOrder,
  };
  const isAvailable = item.isAvailable !== false;
  const mustPersistAvailability = item.isAvailable === false;

  const attempts: Record<string, unknown>[] = [
    { ...base, cost: item.cost ?? 0, is_available: isAvailable },
    { ...base, is_available: isAvailable },
    { ...base, cost: item.cost ?? 0 },
    { ...base },
  ];

  let lastError: { code?: string; message?: string } | null = null;

  for (const row of attempts) {
    const { error } = await client.from("menu_items").upsert(row);
    if (!error) {
      if (mustPersistAvailability && !("is_available" in row)) {
        throw new Error(`Could not save item availability. ${AVAILABILITY_MIGRATION_HINT}`);
      }
      return;
    }
    if (error.code === "PGRST204") {
      lastError = error;
      continue;
    }
    throw error;
  }

  if (mustPersistAvailability) {
    throw new Error(`Could not save item availability. ${AVAILABILITY_MIGRATION_HINT}`);
  }
  if (lastError) throw lastError;
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

export function supportFromConfig(row: StoreConfigRow): SupportSettings {
  return configToSupport(row);
}

export function subscribeToDbChanges(handlers: {
  onOrders?: () => void;
  onMenu?: () => void;
  onConfig?: () => void;
  onReviews?: () => void;
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
    .on("postgres_changes", { event: "*", schema: "public", table: "order_reviews" }, () => {
      handlers.onReviews?.();
    })
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}

export type AdminUsersCheck = {
  available: boolean;
  rpcMissing: boolean;
  invalidKey: boolean;
  error?: string;
};

export async function checkAdminUsers(): Promise<AdminUsersCheck> {
  const client = assertClient();
  const { data, error } = await client.rpc("has_admin_users");
  if (error) {
    const invalidKey =
      error.message.includes("Invalid API key") ||
      error.code === "401" ||
      (typeof error === "object" && "status" in error && error.status === 401);
    const rpcMissing =
      !invalidKey &&
      (error.message.includes("Could not find the function") ||
        error.message.includes("function public.has_admin_users") ||
        error.code === "PGRST202");
    console.warn("has_admin_users RPC unavailable:", error.message);
    return { available: false, rpcMissing, invalidKey, error: error.message };
  }
  return { available: Boolean(data), rpcMissing: false, invalidKey: false };
}

export async function hasAdminUsers(): Promise<boolean> {
  const check = await checkAdminUsers();
  return check.available;
}

export async function verifyAdminLogin(username: string, password: string): Promise<boolean> {
  const client = assertClient();
  const { data, error } = await client.rpc("verify_admin_login", {
    p_username: username.trim(),
    p_password: password,
  });
  if (error) throw error;
  return Boolean(data);
}

export async function updateAdminPassword(
  username: string,
  oldPassword: string,
  newPassword: string
): Promise<boolean> {
  const client = assertClient();
  const { data, error } = await client.rpc("update_admin_password", {
    p_username: username.trim(),
    p_old_password: oldPassword,
    p_new_password: newPassword,
  });
  if (error) throw error;
  return Boolean(data);
}
