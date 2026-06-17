export type OrderStatus = "awaiting_payment" | "preparing" | "ready" | "completed";

export interface PaymentSettings {
  gcashNumber: string;
  gcashAccountName: string;
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
