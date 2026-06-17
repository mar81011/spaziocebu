import type { Order, OrderStatus } from "../types";

const TRACKED_ORDERS_KEY = "spazio_customer_orders";
const CHAT_SHOWN_KEY = "spazio_customer_chat_shown";
const NTFY_SENT_KEY = "spazio_customer_ntfy_sent";

type StatusMap = Record<string, OrderStatus[]>;

function readStatusMap(key: string): StatusMap {
  try {
    const data = JSON.parse(localStorage.getItem(key) || "{}") as StatusMap;
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

function writeStatusMap(key: string, map: StatusMap) {
  localStorage.setItem(key, JSON.stringify(map));
}

function markStatus(key: string, orderId: string, status: OrderStatus) {
  const map = readStatusMap(key);
  const list = map[orderId] ?? [];
  if (!list.includes(status)) {
    map[orderId] = [...list, status];
    writeStatusMap(key, map);
  }
}

function hasStatus(key: string, orderId: string, status: OrderStatus): boolean {
  return readStatusMap(key)[orderId]?.includes(status) ?? false;
}

const NOTIFY_STATUSES: OrderStatus[] = ["preparing", "ready", "completed"];

export function customerOrderTopic(orderId: string): string {
  return `Spazio-${orderId}`;
}

export function getTrackedOrderIds(): string[] {
  try {
    const ids = JSON.parse(localStorage.getItem(TRACKED_ORDERS_KEY) || "[]") as string[];
    return Array.isArray(ids) ? ids : [];
  } catch {
    return [];
  }
}

export function trackCustomerOrder(orderId: string) {
  const ids = getTrackedOrderIds();
  if (!ids.includes(orderId)) {
    localStorage.setItem(TRACKED_ORDERS_KEY, JSON.stringify([orderId, ...ids]));
  }
}

export function buildCustomerStatusMessage(order: Order): string | null {
  switch (order.status) {
    case "preparing":
      return `Payment confirmed! We're preparing order #${order.id} now.`;
    case "ready":
      return `Order #${order.id} is ready for pickup!`;
    case "completed":
      return `Thanks ${order.customerName}! Order #${order.id} is complete.`;
    default:
      return null;
  }
}

export function shouldNotifyCustomerStatus(status: OrderStatus): boolean {
  return NOTIFY_STATUSES.includes(status);
}

async function sendCustomerNtfy(orderId: string, title: string, message: string) {
  await fetch(`https://ntfy.sh/${encodeURIComponent(customerOrderTopic(orderId))}`, {
    method: "POST",
    body: message,
    headers: {
      Title: title,
      Priority: "high",
      Tags: "coffee,white_check_mark",
    },
  });
}

export async function notifyCustomerOnStatusChange(order: Order): Promise<void> {
  if (!shouldNotifyCustomerStatus(order.status)) return;

  const message = buildCustomerStatusMessage(order);
  if (!message) return;
  if (hasStatus(NTFY_SENT_KEY, order.id, order.status)) return;

  markStatus(NTFY_SENT_KEY, order.id, order.status);
  await sendCustomerNtfy(order.id, `Spazio · Order #${order.id}`, message);
}

const PENDING_REVIEW_KEY = "spazio_pending_review_order";

export function setPendingReviewOrder(orderId: string) {
  try {
    sessionStorage.setItem(PENDING_REVIEW_KEY, orderId);
  } catch {
    /* empty */
  }
}

export function getPendingReviewOrder(): string | null {
  try {
    return sessionStorage.getItem(PENDING_REVIEW_KEY);
  } catch {
    return null;
  }
}

export function clearPendingReviewOrder() {
  try {
    sessionStorage.removeItem(PENDING_REVIEW_KEY);
  } catch {
    /* empty */
  }
}

export interface CustomerStatusUpdate {
  order: Order;
  message: string;
}

export function getPendingChatStatusUpdates(orders: Order[]): CustomerStatusUpdate[] {
  const updates: CustomerStatusUpdate[] = [];

  for (const orderId of getTrackedOrderIds()) {
    const order = orders.find((o) => o.id === orderId);
    if (!order || !shouldNotifyCustomerStatus(order.status)) continue;
    if (hasStatus(CHAT_SHOWN_KEY, order.id, order.status)) continue;

    const message = buildCustomerStatusMessage(order);
    if (!message) continue;

    markStatus(CHAT_SHOWN_KEY, order.id, order.status);
    if (order.status === "completed") {
      setPendingReviewOrder(order.id);
    }
    updates.push({ order, message });
  }

  return updates;
}

const REVIEW_DRAFT_RATING_KEY = "spazio_review_draft_rating";

export function setReviewDraftRating(rating: number) {
  try {
    sessionStorage.setItem(REVIEW_DRAFT_RATING_KEY, String(rating));
  } catch {
    /* empty */
  }
}

export function consumeReviewDraftRating(): number | null {
  try {
    const value = sessionStorage.getItem(REVIEW_DRAFT_RATING_KEY);
    sessionStorage.removeItem(REVIEW_DRAFT_RATING_KEY);
    const rating = value ? Number(value) : NaN;
    return rating >= 1 && rating <= 5 ? rating : null;
  } catch {
    return null;
  }
}

export function scrollToReviewsSection() {
  document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function markChatStatusShown(orderId: string, status: OrderStatus) {
  markStatus(CHAT_SHOWN_KEY, orderId, status);
}

export function hasChatStatusShown(orderId: string, status: OrderStatus): boolean {
  return hasStatus(CHAT_SHOWN_KEY, orderId, status);
}

export function showCustomerBrowserNotification(order: Order) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

  const body = buildCustomerStatusMessage(order);
  if (!body) return;

  new Notification(`Spazio · Order #${order.id}`, { body });
}

export async function requestCustomerNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  return Notification.requestPermission();
}
