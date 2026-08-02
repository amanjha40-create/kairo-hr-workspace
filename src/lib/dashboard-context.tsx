import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

interface Ctx {
  search: string;
  setSearch: (s: string) => void;
  inviteOpen: boolean;
  setInviteOpen: (b: boolean) => void;
}

const DashboardCtx = createContext<Ctx | null>(null);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [search, setSearch] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);

  const value = useMemo<Ctx>(
    () => ({
      search,
      setSearch,
      inviteOpen,
      setInviteOpen,
    }),
    [search, inviteOpen],
  );

  return <DashboardCtx.Provider value={value}>{children}</DashboardCtx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useDashboard() {
  const v = useContext(DashboardCtx);
  if (!v) throw new Error("useDashboard must be used inside DashboardProvider");
  return v;
}
