import { useCallback, useEffect, useState } from "react";
import type { SupportSettings } from "../types";
import {
  SUPPORT_SETTINGS_UPDATED,
  getSupportSettings,
  saveSupportSettings,
} from "../lib/storage";

export function useSupportSettings() {
  const [settings, setSettings] = useState<SupportSettings>(getSupportSettings);

  const refresh = useCallback(() => setSettings(getSupportSettings()), []);

  useEffect(() => {
    window.addEventListener(SUPPORT_SETTINGS_UPDATED, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(SUPPORT_SETTINGS_UPDATED, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  const update = useCallback((next: SupportSettings) => {
    saveSupportSettings(next);
    setSettings(next);
  }, []);

  return { settings, update };
}
