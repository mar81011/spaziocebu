import type { ChatMessage, ChatSession } from "../types";
import { emptySession } from "./chat";

const CHAT_KEY = "spazio_customer_chat";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export const OPEN_GREETING =
  "Hi! What can I get started for you today?\n\nOrder in plain language — I'll summarise everything before you confirm.";
export const CLOSED_GREETING =
  "We're closed for orders right now. You can still browse the menu — check back soon for pickup.";

interface StoredChat {
  messages: ChatMessage[];
  session: ChatSession;
  savedAt: string;
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const m = value as ChatMessage;
  return (
    typeof m.id === "string" &&
    typeof m.text === "string" &&
    (m.role === "bot" ||
      m.role === "user" ||
      m.role === "confirm" ||
      m.role === "payment" ||
      m.role === "status" ||
      m.role === "review") &&
    (m.orderId === undefined || typeof m.orderId === "string")
  );
}

function isChatSession(value: unknown): value is ChatSession {
  if (!value || typeof value !== "object") return false;
  const s = value as ChatSession;
  return (
    Array.isArray(s.items) &&
    typeof s.awaitingConfirm === "boolean" &&
    typeof s.awaitingName === "boolean"
  );
}

export function createGreeting(isStoreOpen: boolean): ChatMessage {
  return {
    id: "0",
    role: "bot",
    text: isStoreOpen ? OPEN_GREETING : CLOSED_GREETING,
  };
}

export function createDefaultChatState(isStoreOpen: boolean): {
  messages: ChatMessage[];
  session: ChatSession;
} {
  return {
    messages: [createGreeting(isStoreOpen)],
    session: emptySession(),
  };
}

export function loadChatState(): { messages: ChatMessage[]; session: ChatSession } | null {
  try {
    const raw = localStorage.getItem(CHAT_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw) as StoredChat;
    if (!data.savedAt || Date.now() - new Date(data.savedAt).getTime() > MAX_AGE_MS) {
      clearChatState();
      return null;
    }
    if (!Array.isArray(data.messages) || !isChatSession(data.session)) {
      clearChatState();
      return null;
    }
    if (!data.messages.every(isChatMessage)) {
      clearChatState();
      return null;
    }
    if (data.messages.length === 0) {
      clearChatState();
      return null;
    }

    return { messages: data.messages, session: data.session };
  } catch {
    clearChatState();
    return null;
  }
}

export function saveChatState(messages: ChatMessage[], session: ChatSession) {
  const payload: StoredChat = {
    messages,
    session,
    savedAt: new Date().toISOString(),
  };
  localStorage.setItem(CHAT_KEY, JSON.stringify(payload));
}

export function clearChatState() {
  localStorage.removeItem(CHAT_KEY);
}

export function resetChatState(isStoreOpen: boolean): {
  messages: ChatMessage[];
  session: ChatSession;
} {
  clearChatState();
  return createDefaultChatState(isStoreOpen);
}
