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

  return (
    <nav
      className="flex items-stretch border-t pb-safe"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-border-subtle)",
      }}
    >
      {TABS.map((tab) => {
        const isActive =
          tab.path === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(tab.path);
        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className="flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-colors"
            style={{
              color: isActive ? "var(--color-accent)" : "var(--color-text-muted)",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            {tab.icon(isActive)}
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
