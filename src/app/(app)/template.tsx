import { ViewTransition, type ReactNode } from "react";

/*
  Templates remount on every navigation. Links tag their direction (nav-forward / nav-back),
  so the page slides the way the user is travelling. Untagged changes (refresh, server
  actions, browser back) stay still so unrelated updates don't flash the whole page.
*/
const DIRECTIONAL = { "nav-forward": "nav-forward", "nav-back": "nav-back", default: "none" };

export default function AppTemplate({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={DIRECTIONAL} exit={DIRECTIONAL} default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
