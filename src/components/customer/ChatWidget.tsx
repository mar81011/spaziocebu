import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { ChatMessage, Menu, Order } from "../../types";
import { emptySession, processUserMessage } from "../../lib/chat";
import { buildQuickReplies } from "../../lib/menuIcons";
import { PLACEHOLDER_EXAMPLES } from "../../lib/orderingGuide";
import { ChatOrderGuide } from "./ChatOrderGuide";
import { useOrders } from "../../hooks/useOrders";
import { useCustomerOrderUpdates } from "../../hooks/useCustomerOrderUpdates";
import { GcashPaymentCard } from "./GcashPaymentCard";
import { MicIcon, SendIcon } from "./ChatInputIcons";
import { ReviewPromptCard } from "./ReviewPromptCard";
import {
  getPendingChatStatusUpdates,
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

const OPEN_GREETING =
  "Hi! What can I get started for you today?\n\nOrder in plain language — I'll summarise everything before you confirm.";
const CLOSED_GREETING =
  "We're closed for orders right now. You can still browse the menu — check back soon for pickup.";

function isStalePaymentMessage(text: string, orders: Order[]): boolean {
  if (text.includes("Want phone updates? Subscribe to")) return true;
  if (!text.includes("SPAZIO-") && !text.includes("via GCash")) return false;

  const orderId = text.match(/(?:Order #|SPAZIO-)(\d+)/)?.[1];
  if (!orderId) return false;

  const order = orders.find((o) => o.id === orderId);
  return Boolean(order && order.status !== "awaiting_payment");
}

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
    { id: "0", role: "bot", text: OPEN_GREETING },
  ]);
  const [input, setInput] = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [thinking, setThinking] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechSupported] = useState(
    () => typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  );
  const [session, setSession] = useState(emptySession());
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const recognitionRef = useRef<SpeechRecognition | null>(null);
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
    useCallback((order: Order, message: string) => {
      pushMessage("status", message);
      if (order.status === "completed") {
        pushMessage("review", "", order.id);
      }
      onOpenChangeRef.current(true);
    }, [pushMessage])
  );

  useEffect(() => {
    const pending = getPendingChatStatusUpdates(orders);
    pending.forEach(({ order, message }) => {
      pushMessage("status", message);
      if (order.status === "completed") {
        pushMessage("review", "", order.id);
      }
    });
  }, [orders, pushMessage]);

  useEffect(() => {
    setMessages([
      {
        id: "0",
        role: "bot",
        text: isStoreOpen ? OPEN_GREETING : CLOSED_GREETING,
      },
    ]);
    setSession(emptySession());
    setInput("");
  }, [isStoreOpen]);

  function sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    pushMessage("user", trimmed);
    setInput("");
    setThinking(true);

    const history = messages
      .filter((m) => m.role === "user" || m.role === "bot")
      .map((m) => ({ role: m.role as "user" | "bot", text: m.text }));

    void processUserMessage(trimmed, sessionRef.current, menu, isStoreOpen, history)
      .then((result) => {
        setSession(result.session);
        pushMessage("bot", result.text);
        if (result.type === "order") {
          trackCustomerOrder(result.order.id);
          void requestCustomerNotificationPermission();
          pushMessage("payment", "", result.order.id);
        }
      })
      .finally(() => setThinking(false));
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

  const hasUserMessages = messages.some((m) => m.role === "user");
  const hasInput = input.trim().length > 0;
  const quickReplies = useMemo(() => buildQuickReplies(menu), [menu]);

  useEffect(() => {
    if (!open || !isStoreOpen || hasInput || hasUserMessages) return;
    const id = window.setInterval(() => {
      setPlaceholderIdx((index) => (index + 1) % PLACEHOLDER_EXAMPLES.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, [open, isStoreOpen, hasInput, hasUserMessages]);

  const toggleListening = useCallback(() => {
    if (!speechSupported || !isStoreOpen || thinking) return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = "en-PH";
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        inputRef.current?.focus();
      }
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }, [speechSupported, isStoreOpen, thinking, listening]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

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

        <div className="max-h-[340px] overflow-y-auto bg-gradient-to-b from-[#faf7f2] to-white p-4">
          {messages.map((msg) => {
            if (msg.text.includes("Want phone updates? Subscribe to")) return null;

            if (msg.role === "payment" && msg.orderId) {
              const order = orders.find((o) => o.id === msg.orderId);
              if (!order || order.status !== "awaiting_payment") return null;
              return <GcashPaymentCard key={msg.id} order={order} />;
            }

            if (msg.role === "review" && msg.orderId) {
              return (
                <ReviewPromptCard
                  key={msg.id}
                  orderId={msg.orderId}
                  onNavigate={() => onOpenChange(false)}
                />
              );
            }

            if (msg.role === "bot" && isStalePaymentMessage(msg.text, orders)) {
              return null;
            }

            const preserveWhitespace =
              msg.role !== "user" && msg.role !== "status" && msg.role !== "confirm";

            return (
              <p
                key={msg.id}
                className={`mb-2 max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  preserveWhitespace ? "whitespace-pre-wrap" : "whitespace-pre-line"
                } ${
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
          {thinking && (
            <p className="mb-2 max-w-[88%] rounded-2xl rounded-bl-sm bg-cream px-4 py-3 text-sm text-warm-gray">
              …
            </p>
          )}
          {isStoreOpen && !hasUserMessages && !thinking && <ChatOrderGuide />}
          <div ref={bottomRef} />
        </div>

        {isStoreOpen && !hasUserMessages && (
          <div className="border-t border-espresso/6 bg-[#faf7f2]/80 px-4 py-3">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-warm-gray">
              Try saying
            </p>
            <div className="flex flex-wrap gap-2">
              {quickReplies.map((q) => (
                <button
                  key={`${q.label}-${q.message}`}
                  type="button"
                  onClick={() => sendText(q.message)}
                  className="flex items-center gap-1.5 rounded-xl border border-espresso/10 bg-white px-3.5 py-2 text-xs font-medium text-espresso shadow-sm transition hover:border-terracotta/25 hover:bg-white active:scale-[0.98]"
                >
                  <span className="flex items-center gap-0.5 text-sm leading-none" aria-hidden>
                    <span>{q.icon}</span>
                    {q.secondaryIcon && <span>{q.secondaryIcon}</span>}
                  </span>
                  <span>{q.label}</span>
                </button>
              ))}
            </div>
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
            placeholder={
              isStoreOpen
                ? `Try: ${PLACEHOLDER_EXAMPLES[placeholderIdx]}`
                : "Closed for orders"
            }
            disabled={!isStoreOpen || thinking}
            className="min-w-0 flex-1 rounded-full border border-espresso/12 px-4 py-2.5 text-sm outline-none focus:border-terracotta disabled:cursor-not-allowed disabled:bg-cream/50 disabled:text-warm-gray"
          />
          {speechSupported && !hasInput ? (
            <button
              type="button"
              onClick={toggleListening}
              disabled={!isStoreOpen || thinking}
              aria-label={listening ? "Stop listening" : "Voice input"}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-40 ${
                listening
                  ? "bg-[#e41e3f] text-white shadow-[0_0_0_4px_rgba(228,30,63,0.2)]"
                  : "text-warm-gray hover:bg-espresso/5 hover:text-espresso"
              }`}
            >
              <MicIcon />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!isStoreOpen || thinking || !hasInput}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0084ff] text-white transition hover:bg-[#0073e6] disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Send"
            >
              <SendIcon />
            </button>
          )}
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
