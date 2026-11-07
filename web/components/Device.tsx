import type { ReactNode } from "react";

export function Device({ children }: { children: ReactNode }) {
  return (
    <main className="stage">
      <div className="device">
        <div className="statusbar" aria-hidden="true">
          <span>9:41</span>
          <span>100%</span>
        </div>
        {children}
      </div>
    </main>
  );
}
