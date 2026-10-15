"use client";

import { useEffect, useState } from "react";
import { Role } from "@irpc/types";
import { api } from "@/lib/api";

/** true for admins, false for everyone else, null while checking. Hides controls the API would refuse. */
export function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  useEffect(() => {
    let current = true;
    api.getMe().then((me) => current && setIsAdmin(me.role === Role.ADMIN)).catch(() => current && setIsAdmin(false));
    return () => { current = false; };
  }, []);
  return isAdmin;
}
