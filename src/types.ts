export type OrderStatus = "awaiting_payment" | "preparing" | "ready" | "completed";

export interface PaymentSettings {
  gcashNumber: string;
  gcashAccountName: string;
  /** Data URL or hosted image URL for GCash "Receive via QR" */
  gcashQrUrl?: string;
}

export interface NotificationSettings {
  alertsEnabled: boolean;
  /** Owner mobile — SMS is sent here when a customer confirms an order */
  ownerPhone: string;
  /** Semaphore.co API key for Philippine SMS */
  semaphoreApiKey: string;
  /** ntfy.sh topic — optional push alerts via the ntfy app */
  ntfyTopic: string;
  ownerEmail: string;
  emailAlertsEnabled: boolean;
  /** Zapier/Make webhook for custom automations */
  webhookUrl: string;
  browserAlertsEnabled: boolean;
}

export interface SupportSettings {
  /** Phone number customers can call or text */
  supportPhone: string;
  /** Optional custom label — defaults to "Call or text {number}" */
  supportPhoneLabel: string;
  /** Page customers visit (Messenger, Facebook, Instagram, etc.) */
  supportPageUrl: string;
  /** Label on the page link button — e.g. "Visit this page" */
  supportPageLabel: string;
}

export interface OrderLineItem {
  name: string;
  qty: number;
  price: number;
  /** When set, this add-on applies to a specific drink in the order */
  forDrink?: string;
  /** Groups a drink with its add-ons as one line in the order summary */
  bundleId?: string;
}

export interface Order {
  id: string;
  customerName: string;
  items: OrderLineItem[];
  total: number;
  status: OrderStatus;
  notes: string;
  createdAt: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  cost?: number;
  /** When false, hidden from customer menu and chat ordering */
  isAvailable?: boolean;
}

export interface MenuCategory {
  id: string;
  title: string;
  items: MenuItem[];
}

export interface Menu {
  categories: MenuCategory[];
}

export interface ChatMessage {
  id: string;
  role: "bot" | "user" | "confirm" | "payment" | "status" | "review";
  text: string;
  orderId?: string;
  /** Show quick recovery actions under this bot message */
  showRecovery?: boolean;
}

export interface ChatSession {
  items: OrderLineItem[];
  awaitingConfirm: boolean;
  awaitingName: boolean;
}

export interface OrderReview {
  id: string;
  customerName: string;
  rating: number;
  comment: string;
  orderId?: string;
  createdAt: string;
}
