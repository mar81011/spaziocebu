import { useEffect, useRef } from "react";
import { useOrders } from "./useOrders";
import { useNotificationSettings } from "./useNotificationSettings";
import {
  requestBrowserNotificationPermission,
  showBrowserOrderNotification,
} from "../lib/notify";

export function useOrderNotifications() {
  const { orders } = useOrders();
  const { settings } = useNotificationSettings();
  const knownIdsRef = useRef<Set<string>>(new Set());
  const readyRef = useRef(false);

  useEffect(() => {
    if (!settings.browserAlertsEnabled) return;
    void requestBrowserNotificationPermission();
  }, [settings.browserAlertsEnabled]);

  useEffect(() => {
    if (!readyRef.current) {
      orders.forEach((order) => knownIdsRef.current.add(order.id));
      readyRef.current = true;
      return;
    }

    if (!settings.browserAlertsEnabled) return;

    for (const order of orders) {
      if (knownIdsRef.current.has(order.id)) continue;
      knownIdsRef.current.add(order.id);
      showBrowserOrderNotification(order);
    }
  }, [orders, settings.browserAlertsEnabled]);
}
