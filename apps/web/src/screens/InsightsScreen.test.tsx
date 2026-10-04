import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { act } from "react";

vi.mock("@convex/_generated/api", async () => (await import("../test/convexApiMock")).apiModuleMock);
vi.mock("convex/react", async () => (await import("../test/convexMock")).convexReactMock);

import { api } from "@convex/_generated/api";
import { InsightsScreen } from "./InsightsScreen";
import { resetConvexMock, setAuth, setQuery } from "../test/convexMock";
import { toIsoDate } from "../lib/dates";

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

  it("renders the month total from the summary, not a second copy of the rows", () => {
    const now = new Date();
    const key = toIsoDate(new Date(now.getFullYear(), now.getMonth(), 5)).slice(0, 7);
    setAuth({ isAuthenticated: true, isLoading: false });
    setQuery(api.expenses.insightsSummary, [
      {
        key,
        debit: 12300,
        credit: 0,
        sms: 0,
        manual: 12300,
        categories: [{ category: "food", amount: 12300 }],
        merchants: [],
      },
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
    setQuery(api.expenses.insightsSummary, [
      {
        key: previous.slice(0, 7),
        debit: 10000,
        credit: 0,
        sms: 0,
        manual: 10000,
        categories: [{ category: "food", amount: 10000 }],
        merchants: [],
      },
      {
        key: current.slice(0, 7),
        debit: 20000,
        credit: 0,
        sms: 5000,
        manual: 15000,
        categories: [{ category: "food", amount: 20000 }],
        merchants: [],
      },
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
    expect(screen.getByRole("heading", { name: "SMS vs typed" })).toBeInTheDocument();
    expect(screen.queryByText("Cash vs UPI")).not.toBeInTheDocument();
    const monthLabel = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleString("en-IN", {
      month: "long",
      year: "numeric",
    });
    expect(screen.getByRole("button", { name: `${monthLabel}, ₹200` })).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: /spend over the last 12 months/i }).getAttribute("preserveAspectRatio"),
    ).toBe("xMidYMid meet");
  });

  it("says there is no spending, in the same tone as an empty month", () => {
    setAuth({ isAuthenticated: true, isLoading: false });
    setQuery(api.expenses.insightsSummary, []);
    setQuery(api.categories.listCategories, []);
    render(<InsightsScreen />);
    expect(screen.getByText("No spending this month.")).toBeInTheDocument();
    expect(screen.getByText("No spending in the last 12 months.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "SMS vs typed" })).not.toBeInTheDocument();
  });
});
