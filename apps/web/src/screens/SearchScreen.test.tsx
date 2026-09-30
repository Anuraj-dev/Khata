import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@convex/_generated/api", async () => (await import("../test/convexApiMock")).apiModuleMock);
vi.mock("convex/react", async () => (await import("../test/convexMock")).convexReactMock);

import { api } from "@convex/_generated/api";
import { SearchScreen } from "./SearchScreen";
import { resetConvexMock, setAuth, setQuery } from "../test/convexMock";

function setOnline(online: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    get: () => online,
  });
}

const rows = [
  {
    _id: "e1",
    clientId: "c1",
    amount: 25050,
    note: "Chai at Cafe",
    category: "food",
    source: "manual",
    direction: "debit",
    party: "IRCTC",
    udhaarPerson: "Ravi",
    date: "2026-09-02",
    ownerTokenIdentifier: "owner",
    createdAt: 2,
    updatedAt: 2,
  },
  {
    _id: "e2",
    clientId: "c2",
    amount: 1500000,
    note: "Rent",
    category: "bills",
    source: "sms",
    direction: "credit",
    party: "Landlord",
    date: "2026-09-01",
    ownerTokenIdentifier: "owner",
    createdAt: 1,
    updatedAt: 1,
  },
];

describe("SearchScreen", () => {
  beforeEach(() => {
    resetConvexMock();
    setOnline(true);
    setAuth({ isAuthenticated: true, isLoading: false });
    setQuery(api.expenses.listRange, rows);
  });

  it("says search needs a connection when offline, and asks a signed-out user to sign in", () => {
    setOnline(false);
    const { unmount } = render(<SearchScreen />);
    expect(screen.getByText("Search needs a connection.")).toBeInTheDocument();
    unmount();

    setOnline(true);
    setAuth({ isAuthenticated: false, isLoading: false });
    render(<SearchScreen />);
    expect(screen.getByText("Sign in to search your expenses.")).toBeInTheDocument();
    expect(screen.queryByText("Search needs a connection.")).not.toBeInTheDocument();
  });

  it("collapses a repeated clientId onto the first row", () => {
    setQuery(api.expenses.listRange, [
      { ...rows[0], _id: "e1", clientId: "same", note: "First row", party: "" },
      { ...rows[1], _id: "e2", clientId: "same", note: "Retry row", party: "" },
    ]);

    render(<SearchScreen />);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByText("First row")).toBeInTheDocument();
    expect(screen.queryByText("Retry row")).not.toBeInTheDocument();
  });

  it("orders a day by _creationTime when stored createdAt is missing or opposite", () => {
    setQuery(api.expenses.listRange, [
      {
        ...rows[0],
        _id: "old",
        clientId: "old",
        note: "Earlier row",
        party: "",
        date: "2026-09-02",
        createdAt: undefined,
        _creationTime: 10,
      },
      {
        ...rows[1],
        _id: "new",
        clientId: "new",
        note: "Later row",
        party: "",
        date: "2026-09-02",
        createdAt: 1,
        _creationTime: 50,
      },
    ]);

    render(<SearchScreen />);
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("Later row");
    expect(items[1]).toHaveTextContent("Earlier row");
  });

  it("filters the loaded month by party and category and counts the rows", async () => {
    const user = userEvent.setup();
    render(<SearchScreen />);

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText(/Chai at Cafe|IRCTC/)).toBeInTheDocument();

    await user.type(screen.getByLabelText("Search note, party, or person"), "irctc");
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText(/of 2/)).toBeInTheDocument();
    expect(screen.queryByText("Rent")).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText("Search note, party, or person"));
    await user.selectOptions(screen.getByLabelText("Category"), "bills");
    expect(screen.getByText("Landlord")).toBeInTheDocument();
    expect(screen.queryByText("IRCTC")).not.toBeInTheDocument();
  });

  it("downloads a CSV blob with rupees from paise", async () => {
    const user = userEvent.setup();
    const createObjectURL = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:khata");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    render(<SearchScreen />);
    await user.click(screen.getByRole("button", { name: "Download CSV" }));

    const blob = createObjectURL.mock.calls[0]?.[0];
    expect(blob).toBeInstanceOf(Blob);
    const csv = await (blob as Blob).text();
    expect(csv).toContain("250.50");
    expect(csv.startsWith("date,direction,amount_rupees,category,note,party,udhaar_person,source")).toBe(true);
    expect(csv).toContain("Food");
  });
});
