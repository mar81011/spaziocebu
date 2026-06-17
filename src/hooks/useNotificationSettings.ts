import { useCallback, useEffect, useState } from "react";
import type { NotificationSettings } from "../types";
import {
  NOTIFICATION_SETTINGS_UPDATED,
  getNotificationSettings,
  saveNotificationSettings,
} from "../lib/storage";

export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>(getNotificationSettings);

  const refresh = useCallback(() => setSettings(getNotificationSettings()), []);

  useEffect(() => {
    window.addEventListener(NOTIFICATION_SETTINGS_UPDATED, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(NOTIFICATION_SETTINGS_UPDATED, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  const update = useCallback((next: NotificationSettings) => {
    saveNotificationSettings(next);
    setSettings(next);
  }, []);

  return { settings, update };
}
