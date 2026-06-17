import { useCallback, useEffect, useState } from "react";
import { STORE_STATUS_UPDATED, isStoreOpen, setStoreOpen } from "../lib/storage";

export function useStoreStatus() {
  const [open, setOpen] = useState(isStoreOpen);

  const refresh = useCallback(() => setOpen(isStoreOpen()), []);

  useEffect(() => {
    window.addEventListener(STORE_STATUS_UPDATED, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(STORE_STATUS_UPDATED, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  const updateOpen = useCallback((value: boolean) => {
    setStoreOpen(value);
    setOpen(value);
  }, []);

  return { isOpen: open, setOpen: updateOpen };
}
