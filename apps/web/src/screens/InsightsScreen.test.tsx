import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { act } from "react";

vi.mock("@convex/_generated/api", async () => (await import("../test/convexApiMock")).apiModuleMock);
vi.mock("convex/react", async () => (await import("../test/convexMock")).convexReactMock);

import { api } from "@convex/_generated/api";
import { InsightsScreen } from "./InsightsScreen";
import { resetConvexMock, setAuth, setQuery } from "../test/convexMock";
import { toIsoDate } from "../lib/dates";

function debit(over: { date: string; amount: number; category: string; id: string; clientId?: string }) {
  return {
    _id: over.id,
    clientId: over.clientId,
    date: over.date,
    amount: over.amount,
    category: over.category,
    direction: "debit" as const,
    source: "manual" as const,
    note: over.category,
    party: "",
  };
}

describe("InsightsScreen", () => {
  const onLineDescriptor = Object.getOwnPropertyDescriptor(Navigator.prototype, "onLine")
    ?? Object.getOwnPropertyDescriptor(navigator, "onLine");

  beforeEach(() => {
    resetConvexMock();
  });

  afterEach(() => {
    if (onLineDescriptor) {
      Object.defineProperty(navigator, "onLine", onLineDescriptor);
    } else {
      Object.defineProperty(navigator, "onLine", { configurable: true, get: () => true });
    }
  });

  it("shows Loading while auth is resolving online", () => {
    setAuth({ isAuthenticated: false, isLoading: true });
    render(<InsightsScreen />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
  });

  it("renders an empty explanation when signed out instead of spinning forever", () => {
    setAuth({ isAuthenticated: false, isLoading: false });
    render(<InsightsScreen />);
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
    expect(screen.getByText("Insights unavailable")).toBeInTheDocument();
    expect(
      screen.getByText(/sign in to see a year of spending/i)
    ).toBeInTheDocument();
  });

  it("shows the offline state when the connection drops during a load", () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => true });
    setAuth({ isAuthenticated: true, isLoading: false });
    render(<InsightsScreen />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");

    act(() => {
      Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false });
      window.dispatchEvent(new Event("offline"));
    });
    expect(screen.getByText("You're offline")).toBeInTheDocument();
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();

    act(() => {
      Object.defineProperty(navigator, "onLine", { configurable: true, get: () => true });
      window.dispatchEvent(new Event("online"));
    });
    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
  });

  it("does not double-count a clientId the server stored twice", () => {
    const now = new Date();
    const current = toIsoDate(new Date(now.getFullYear(), now.getMonth(), 5));
    setAuth({ isAuthenticated: true, isLoading: false });
    setQuery(api.expenses.listRange, [
      debit({ id: "e1", clientId: "dup", date: current, amount: 12300, category: "food" }),
      debit({ id: "e2", clientId: "dup", date: current, amount: 12300, category: "food" }),
    ]);
    setQuery(api.categories.listCategories, []);

    render(<InsightsScreen />);
    expect(screen.getAllByText("₹123").length).toBeGreaterThan(0);
    expect(screen.queryByText("₹246")).not.toBeInTheDocument();
  });

  it("renders an empty explanation when offline, even if auth is still loading", () => {
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false });
    setAuth({ isAuthenticated: false, isLoading: true });
    render(<InsightsScreen />);
    expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
    expect(screen.getByText("You're offline")).toBeInTheDocument();
  });

  it("shows a 12-month window and a +100% per-category delta when spend doubles", () => {
    const now = new Date();
    const current = toIsoDate(new Date(now.getFullYear(), now.getMonth(), 5));
    const previous = toIsoDate(new Date(now.getFullYear(), now.getMonth() - 1, 10));
    setAuth({ isAuthenticated: true, isLoading: false });
    setQuery(api.expenses.listRange, [
      debit({ id: "e1", date: previous, amount: 10000, category: "food" }),
      debit({ id: "e2", date: current, amount: 20000, category: "food" }),
    ]);
    setQuery(api.categories.listCategories, []);

    render(<InsightsScreen />);

    expect(screen.getByText("Last 12 months")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: /food, 100 percent of spending, up 100 percent from last month/i,
      })
    ).toBeInTheDocument();
    expect(screen.getByText("+100%")).toBeInTheDocument();
  });
});
