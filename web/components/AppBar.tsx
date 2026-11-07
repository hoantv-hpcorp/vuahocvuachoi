import type { ReactNode } from "react";

export function AppBar({ children }: { children: ReactNode }) {
  return <header className="appbar">{children}</header>;
}
