import type { ReactNode } from "react";

// Templates remount on every navigation, so each page gets the same short rise-in.
export default function AppTemplate({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
