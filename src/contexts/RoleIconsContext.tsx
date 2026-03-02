"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type RoleIcons = Record<"papa" | "mama" | "michi", string>;

const DEFAULT_ICONS: RoleIcons = { papa: "👨", mama: "👩", michi: "👧" };

const RoleIconsContext = createContext<RoleIcons>(DEFAULT_ICONS);

export function RoleIconsProvider({ children }: { children: React.ReactNode }) {
  const [icons, setIcons] = useState<RoleIcons>(DEFAULT_ICONS);

  useEffect(() => {
    fetch("/api/role-icons")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && typeof data === "object") {
          setIcons({
            papa: data.papa ?? DEFAULT_ICONS.papa,
            mama: data.mama ?? DEFAULT_ICONS.mama,
            michi: data.michi ?? DEFAULT_ICONS.michi,
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <RoleIconsContext.Provider value={icons}>{children}</RoleIconsContext.Provider>
  );
}

export function useRoleIcons(): RoleIcons {
  return useContext(RoleIconsContext);
}
