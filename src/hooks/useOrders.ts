import { useCallback, useEffect, useState } from "react";
import type { Order } from "../types";
import { ORDERS_UPDATED, getOrders } from "../lib/storage";

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>(getOrders);

  const refresh = useCallback(() => setOrders(getOrders()), []);
  useEffect(() => {
    window.addEventListener(ORDERS_UPDATED, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(ORDERS_UPDATED, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  return { orders, refresh };
}
