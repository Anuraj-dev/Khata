import { useNavigate, useLocation } from "react-router";

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
    id: "udhaar",
    label: "Udhaar",
    path: "/udhaar",
    icon: (active: boolean) => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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
  const tabs = TABS;

  return (
    <nav
      className="flex items-stretch border-t pb-safe"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-border-subtle)",
        boxShadow: "0 -1px 0 rgba(0,0,0,0.3)",
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
            className="flex flex-1 flex-col items-center justify-center gap-1 py-3 relative"
            style={{
              color: isActive ? "var(--color-accent)" : "var(--color-text-muted)",
              background: "none",
              border: "none",
              cursor: "pointer",
              transition: "color var(--dur-fast) var(--ease-out)",
            }}
          >
            {/* Active-tab top indicator */}
            <span
              aria-hidden="true"
              className="absolute top-0 left-1/2 h-[3px] w-8 -translate-x-1/2"
              style={{
                borderRadius: "var(--radius-pill)",
                background: "var(--gradient-accent)",
                opacity: isActive ? 1 : 0,
                transition: "opacity var(--dur-fast) var(--ease-out)",
              }}
            />
            <div className="relative active:scale-90 transition-transform duration-150">{tab.icon(isActive)}</div>
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
