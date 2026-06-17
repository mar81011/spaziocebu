import type { Order } from "../types";
import { formatCurrency } from "./format";
import { getNotificationSettings } from "./storage";
import { normalizePhPhone } from "./phone";

export function buildOrderAlertMessage(order: Order): string {
  const items = order.items.map((i) => `${i.qty}× ${i.name}`).join(", ");
  return `Spazio: New order #${order.id} from ${order.customerName}. ${items}. Total ${formatCurrency(order.total)}. Awaiting GCash payment.`;
}

async function sendSemaphoreSms(phone: string, apiKey: string, message: string) {
  const body = new URLSearchParams({
    apikey: apiKey,
    number: normalizePhPhone(phone),
    message,
    sendername: "Spazio",
  });

  const response = await fetch("/api/send-sms", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error(`SMS failed (${response.status})`);
  }
}

async function sendNtfy(topic: string, title: string, message: string, tags = "coffee,moneybag") {
  await fetch(`https://ntfy.sh/${encodeURIComponent(topic)}`, {
    method: "POST",
    body: message,
    headers: {
      Title: title,
      Priority: "high",
      Tags: tags,
    },
  });
}

async function sendWebhook(
  webhookUrl: string,
  order: Order,
  message: string,
  ownerPhone: string
) {
  await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event: "new_order",
      message,
      ownerPhone,
      order,
    }),
  });
}

async function sendEmailAlert(email: string, order: Order, message: string) {
  await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(email)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      _subject: `Spazio order #${order.id} — ${order.customerName}`,
      message,
      _template: "table",
    }),
  });
}

/** Fired when the customer confirms an order in chat (before GCash payment). */
export async function notifyOwnerOnNewOrder(order: Order): Promise<void> {
  const settings = getNotificationSettings();
  if (!settings.alertsEnabled) return;

  const message = buildOrderAlertMessage(order);
  const tasks: Promise<void>[] = [];

  const phone = settings.ownerPhone.trim();
  const apiKey = settings.semaphoreApiKey.trim();
  if (phone && apiKey) {
    tasks.push(sendSemaphoreSms(phone, apiKey, message));
  }

  const topic = settings.ntfyTopic.trim();
  if (topic) {
    tasks.push(sendNtfy(topic, `Spazio · Order #${order.id}`, message));
  }

  const webhookUrl = settings.webhookUrl.trim();
  if (webhookUrl) {
    tasks.push(sendWebhook(webhookUrl, order, message, phone));
  }

  const email = settings.ownerEmail.trim();
  if (settings.emailAlertsEnabled && email) {
    tasks.push(sendEmailAlert(email, order, message));
  }

  await Promise.allSettled(tasks);
}

export async function sendTestOwnerAlert(): Promise<string> {
  const settings = getNotificationSettings();
  const topic = settings.ntfyTopic.trim();

  if (topic) {
    await sendNtfy(
      topic,
      "Spazio test",
      "Spazio test — you will get a push like this when a customer confirms an order.",
      "white_check_mark"
    );
    return `Test sent to ntfy.sh/${topic} — check your phone.`;
  }

  const phone = settings.ownerPhone.trim();
  const apiKey = settings.semaphoreApiKey.trim();
  if (!phone) return "Add an ntfy topic or your mobile number.";
  if (!apiKey) return "Add your Semaphore API key to send SMS.";

  const message = "Spazio test — you will get a text like this when a customer confirms an order.";
  await sendSemaphoreSms(phone, apiKey, message);
  return "Test SMS sent — check your phone.";
}

export function showBrowserOrderNotification(order: Order) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;

  new Notification(`New Spazio order #${order.id}`, {
    body: buildOrderAlertMessage(order),
  });
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (typeof Notification === "undefined") return "denied";
  if (Notification.permission !== "default") return Notification.permission;
  return Notification.requestPermission();
}
