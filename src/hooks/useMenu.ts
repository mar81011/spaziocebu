import { useCallback, useEffect, useState } from "react";
import type { Menu } from "../types";
import { MENU_UPDATED, getMenu } from "../lib/storage";

export function useMenu() {
  const [menu, setMenu] = useState<Menu>(getMenu);

  const refresh = useCallback(() => setMenu(getMenu()), []);

  useEffect(() => {
    window.addEventListener(MENU_UPDATED, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(MENU_UPDATED, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  return { menu, refresh };
}
