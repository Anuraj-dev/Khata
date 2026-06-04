import { useNavigate, useLocation } from "react-router";
import { useQuery } from "convex/react";
import { Capacitor } from "@capacitor/core";
import { api } from "@convex/_generated/api";

const TABS = [
  {
    id: "expenses",
    label: "Expenses",
    path: "/",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </svg>
    ),
  },
  {
    id: "upi",
    label: "UPI",
    path: "/upi",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: "trips",
    label: "Trips",
    path: "/trips",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12h18M3 6h18M3 18h18" />
      </svg>
    ),
  },
  {
    id: "insights",
    label: "Insights",
    path: "/insights",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
] as const;

export function BottomNavBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const pendingSms = useQuery(api.smsQueue.listPending);
  const badgeCount = pendingSms?.length ?? 0;

  // SMS-derived UPI inbox is native-only — web users log manually, never show SMS UI on web.
  const tabs = TABS.filter((tab) => tab.id !== "upi" || Capacitor.isNativePlatform());

  return (
    <nav
      className="flex items-stretch border-t pb-safe"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-border-subtle)",
      }}
    >
      {tabs.map((tab) => {
        const isActive =
          tab.path === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(tab.path);
        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-colors relative"
            style={{
              color: isActive ? "var(--color-accent)" : "var(--color-text-muted)",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            <div className="relative">
              {tab.icon(isActive)}
              {tab.id === "upi" && badgeCount > 0 && (
                <span
                  className="absolute -top-1 -right-1.5 flex items-center justify-center rounded-full text-[10px] font-bold"
                  style={{
                    background: "var(--color-error)",
                    color: "#fff",
                    minWidth: 16,
                    height: 16,
                    padding: "0 3px",
                  }}
                >
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              )}
            </div>
            <span
              className="text-xs font-medium"
              style={{ color: isActive ? "var(--color-accent)" : "var(--color-text-muted)" }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
