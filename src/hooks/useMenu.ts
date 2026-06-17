import { useCallback, useEffect, useState } from "react";
import type { Menu } from "../types";
import { MENU_UPDATED, applyLocalMenuMirror, getMenu, getPublicMenu, refreshMenu } from "../lib/storage";

type UseMenuOptions = {
  publicOnly?: boolean;
};

export function useMenu(options: UseMenuOptions = {}) {
  const { publicOnly = false } = options;

  const selectMenu = useCallback(
    (menu: Menu) => (publicOnly ? getPublicMenu(menu) : menu),
    [publicOnly]
  );

  const [menu, setMenu] = useState(() => selectMenu(getMenu()));

  const refreshFromCache = useCallback(() => {
    setMenu(selectMenu(getMenu()));
  }, [selectMenu]);

  const refreshFromDb = useCallback(() => {
    void refreshMenu().then((next) => setMenu(selectMenu(next)));
  }, [selectMenu]);

  useEffect(() => {
    const onStorage = () => setMenu(selectMenu(applyLocalMenuMirror()));
    window.addEventListener(MENU_UPDATED, refreshFromCache);
    window.addEventListener("storage", onStorage);
    const onVisible = () => {
      if (document.visibilityState === "visible") refreshFromDb();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener(MENU_UPDATED, refreshFromCache);
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refreshFromCache, refreshFromDb, selectMenu]);

  return { menu, refresh: refreshFromDb };
}
