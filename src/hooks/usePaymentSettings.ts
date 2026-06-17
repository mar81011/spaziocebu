import { useCallback, useEffect, useState } from "react";
import type { PaymentSettings } from "../types";
import {
  PAYMENT_SETTINGS_UPDATED,
  getPaymentSettings,
  savePaymentSettings,
} from "../lib/storage";

export function usePaymentSettings() {
  const [settings, setSettings] = useState<PaymentSettings>(getPaymentSettings);

  const refresh = useCallback(() => setSettings(getPaymentSettings()), []);

  useEffect(() => {
    window.addEventListener(PAYMENT_SETTINGS_UPDATED, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(PAYMENT_SETTINGS_UPDATED, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  const update = useCallback((next: PaymentSettings) => {
    savePaymentSettings(next);
    setSettings(next);
  }, []);

  return { settings, update };
}
