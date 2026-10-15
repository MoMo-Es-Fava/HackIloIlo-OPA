"use client";

import { useEffect, useState } from "react";
import { Role } from "@irpc/types";
import { api } from "@/lib/api";

/**
 * true for admins, false for everyone else, null while checking. Hides controls the API would refuse.
 * For now plant staff count as admin too (one admin level; see STAFF_IS_ADMIN in the API guards).
 */
export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  useEffect(() => {
    let current = true;
    api.getMe().then((me) => current && setIsAdmin(me.role === Role.ADMIN || me.role === Role.PLANT_STAFF)).catch(() => current && setIsAdmin(false));
    return () => { current = false; };
  }, []);
  return isAdmin;
}
