import { useEffect, useRef, useState, useCallback } from "react";
import type { ChatMessage, Menu, Order } from "../../types";
import { emptySession, processUserMessage } from "../../lib/chat";
import { useOrders } from "../../hooks/useOrders";
import { useCustomerOrderUpdates } from "../../hooks/useCustomerOrderUpdates";
import { GcashPaymentCard } from "./GcashPaymentCard";
import {
  customerNtfySubscribeHint,
  getPendingChatStatusMessages,
  requestCustomerNotificationPermission,
  trackCustomerOrder,
} from "../../lib/customerNotify";

interface ChatWidgetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menu: Menu;
  isStoreOpen: boolean;
  queuedMessage?: string | null;
  onQueueConsumed?: () => void;
}

const QUICK_REPLIES = ["Flat white please", "Show me the full menu", "2 cappuccinos"];
const CLOSED_GREETING =
  "We're closed for orders right now. You can still browse the menu — check back soon for pickup.";

export function ChatWidget({
  open,
  onOpenChange,
  menu,
  isStoreOpen,
  queuedMessage,
  onQueueConsumed,
}: ChatWidgetProps) {
  const { orders } = useOrders();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "0", role: "bot", text: "Hi! What would you like to order today?" },
  ]);
  const [input, setInput] = useState("");
  const [session, setSession] = useState(emptySession());
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  const pushMessage = useCallback((role: ChatMessage["role"], text: string, orderId?: string) => {
    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}-${Math.random()}`, role, text, orderId },
    ]);
  }, []);

  useCustomerOrderUpdates(
    useCallback(
      (_order: Order, message: string) => {
        pushMessage("status", message);
        onOpenChangeRef.current(true);
      },
      [pushMessage]
    )
  );

  useEffect(() => {
    const pending = getPendingChatStatusMessages(orders);
    pending.forEach((message) => pushMessage("status", message));
  }, [orders, pushMessage]);

  useEffect(() => {
    setMessages([
      {
        id: "0",
        role: "bot",
        text: isStoreOpen ? "Hi! What would you like to order today?" : CLOSED_GREETING,
      },
    ]);
    setSession(emptySession());
    setInput("");
  }, [isStoreOpen]);

  function sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    pushMessage("user", trimmed);
    setInput("");

    window.setTimeout(() => {
      void processUserMessage(trimmed, sessionRef.current, menu, isStoreOpen).then((result) => {
        setSession(result.session);
        pushMessage("bot", result.text);
        if (result.type === "order") {
          trackCustomerOrder(result.order.id);
          void requestCustomerNotificationPermission();
          pushMessage("payment", "", result.order.id);
          pushMessage("bot", customerNtfySubscribeHint(result.order.id));
        }
      });
    }, 500);
  }

  useEffect(() => {
    if (open && isStoreOpen) inputRef.current?.focus();
  }, [open, isStoreOpen]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    if (open && queuedMessage && isStoreOpen) {
      sendText(queuedMessage);
      onQueueConsumed?.();
    } else if (open && queuedMessage && !isStoreOpen) {
      onQueueConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, queuedMessage, isStoreOpen]);

  return (
    <>
      <div
        className={`fixed bottom-24 right-6 z-50 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-[18px] border border-espresso/6 bg-white shadow-[0_24px_60px_rgba(26,18,14,0.12)] transition ${
          open ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        <div className="flex items-center justify-between bg-espresso px-5 py-4 text-white">
          <div>
            <h3 className="font-serif text-xl font-medium">Spazio</h3>
            <p className="mt-0.5 flex items-center text-xs opacity-65">
              <span
                className={`mr-1.5 inline-block h-2 w-2 rounded-full ${
                  isStoreOpen ? "bg-[#6dd47e]" : "bg-[#e07a7a]"
                }`}
              />
              {isStoreOpen ? "Ready to take your order" : "Closed for orders"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-2xl opacity-70"
            aria-label="Close chat"
          >
            ×
          </button>
        </div>

        <div className="max-h-[300px] overflow-y-auto bg-gradient-to-b from-[#faf7f2] to-white p-4">
          {messages.map((msg) => {
            if (msg.role === "payment" && msg.orderId) {
              const order = orders.find((o) => o.id === msg.orderId);
              if (order) {
                return <GcashPaymentCard key={msg.id} order={order} />;
              }
              return null;
            }

            return (
              <p
                key={msg.id}
                className={`mb-2 max-w-[88%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "ml-auto rounded-br-sm bg-terracotta text-white"
                    : msg.role === "status"
                      ? "mx-auto rounded-2xl border border-sage/25 bg-[#edf3ea] text-center text-sage"
                      : msg.role === "confirm"
                        ? "mx-auto rounded-full bg-espresso text-center text-xs text-white"
                        : "rounded-bl-sm bg-cream text-espresso"
                }`}
              >
                {msg.text}
              </p>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {isStoreOpen && (
          <div className="flex flex-wrap gap-2 px-4 pb-2">
            {QUICK_REPLIES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => sendText(q)}
                className="rounded-full border border-espresso/10 bg-cream px-3 py-1 text-xs text-espresso"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <form
          className="flex gap-2 border-t border-espresso/8 p-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (isStoreOpen) sendText(input);
          }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isStoreOpen ? "Type your order…" : "Closed for orders"}
            disabled={!isStoreOpen}
            className="flex-1 rounded-full border border-espresso/12 px-4 py-2.5 text-sm outline-none focus:border-terracotta disabled:cursor-not-allowed disabled:bg-cream/50 disabled:text-warm-gray"
          />
          <button
            type="submit"
            disabled={!isStoreOpen}
            className="rounded-full bg-espresso px-4 text-white disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Send"
          >
            →
          </button>
        </form>
      </div>

      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-label="Open chat"
        className={`fixed bottom-6 right-6 z-50 flex h-[60px] w-[60px] items-center justify-center rounded-full text-2xl text-white shadow-[0_16px_40px_rgba(184,92,56,0.45)] transition hover:scale-105 ${
          isStoreOpen
            ? "bg-gradient-to-br from-terracotta to-[#a04e2f]"
            : "bg-warm-gray"
        }`}
      >
        💬
      </button>
    </>
  );
}
