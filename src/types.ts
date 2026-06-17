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
  role: "bot" | "user" | "confirm" | "payment" | "status";
  text: string;
  orderId?: string;
}

export interface ChatSession {
  items: OrderLineItem[];
  awaitingConfirm: boolean;
  awaitingName: boolean;
}
