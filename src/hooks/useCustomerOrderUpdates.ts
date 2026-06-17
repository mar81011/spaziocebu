import { useEffect, useRef } from "react";
import type { Order } from "../types";
import { useOrders } from "./useOrders";
import {
  buildCustomerStatusMessage,
  getTrackedOrderIds,
  hasChatStatusShown,
  markChatStatusShown,
  setPendingReviewOrder,
  shouldNotifyCustomerStatus,
  showCustomerBrowserNotification,
} from "../lib/customerNotify";

export function useCustomerOrderUpdates(onStatusMessage?: (order: Order, message: string) => void) {
  const { orders } = useOrders();
  const statusRef = useRef<Map<string, string>>(new Map());
  const readyRef = useRef(false);
  const onStatusMessageRef = useRef(onStatusMessage);
  onStatusMessageRef.current = onStatusMessage;

  useEffect(() => {
    const tracked = getTrackedOrderIds();

    if (!readyRef.current) {
      for (const id of tracked) {
        const order = orders.find((o) => o.id === id);
        if (order) statusRef.current.set(id, order.status);
      }
      readyRef.current = true;
      return;
    }

    for (const id of tracked) {
      const order = orders.find((o) => o.id === id);
      if (!order) continue;

      const previous = statusRef.current.get(id);
      if (previous === order.status) continue;

      statusRef.current.set(id, order.status);
      if (previous === undefined || !shouldNotifyCustomerStatus(order.status)) continue;
      if (hasChatStatusShown(order.id, order.status)) continue;

      const message = buildCustomerStatusMessage(order);
      if (!message) continue;

      markChatStatusShown(order.id, order.status);
      if (order.status === "completed") {
        setPendingReviewOrder(order.id);
      }
      onStatusMessageRef.current?.(order, message);
      showCustomerBrowserNotification(order);
    }
  }, [orders]);
}
