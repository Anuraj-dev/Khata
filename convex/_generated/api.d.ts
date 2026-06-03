/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type { FunctionReference } from "convex/server";

type ExpenseCategory = "food" | "travel" | "shopping" | "bills" | "health" | "other";
type Direction = "debit" | "credit";
type TripStatus = "active" | "settled";

declare const api: {
  expenses: {
    listByDate: FunctionReference<"query", "public", { date: string }, any>;
    listRecent: FunctionReference<"query", "public", { limit?: number }, any>;
    addExpense: FunctionReference<
      "mutation",
      "public",
      {
        clientId: string;
        amount: number;
        note: string;
        category: ExpenseCategory;
        source: "manual" | "sms";
        direction: Direction;
        upiRef?: string;
        party?: string;
        date: string;
      },
      any
    >;
    updateExpense: FunctionReference<
      "mutation",
      "public",
      {
        expenseId: string;
        note?: string;
        category?: ExpenseCategory;
        amount?: number;
        date?: string;
      },
      any
    >;
    deleteExpense: FunctionReference<"mutation", "public", { expenseId: string }, any>;
  };
  trips: {
    listTrips: FunctionReference<"query", "public", { status?: TripStatus }, any>;
    getTrip: FunctionReference<"query", "public", { tripId: string }, any>;
    listTripExpenses: FunctionReference<"query", "public", { tripId: string }, any>;
    createTrip: FunctionReference<
      "mutation",
      "public",
      { clientId: string; name: string; members: string[]; startDate?: string },
      any
    >;
    addTripExpense: FunctionReference<
      "mutation",
      "public",
      {
        clientId: string;
        tripId: string;
        paidBy: string;
        amount: number;
        note: string;
        splitAmong: string[];
        date: string;
      },
      any
    >;
    settleTrip: FunctionReference<"mutation", "public", { tripId: string }, any>;
  };
  settlements: {
    listByTrip: FunctionReference<"query", "public", { tripId: string }, any>;
    markSettled: FunctionReference<"mutation", "public", { settlementId: string }, any>;
    saveSettlements: FunctionReference<
      "mutation",
      "public",
      {
        tripId: string;
        settlements: { fromMember: string; toMember: string; amount: number }[];
      },
      any
    >;
  };
  smsQueue: {
    listPending: FunctionReference<"query", "public", Record<string, never>, any>;
    enqueue: FunctionReference<
      "mutation",
      "public",
      {
        rawSms: string;
        parsedAmount?: number;
        parsedParty?: string;
        parsedDirection?: Direction;
        parsedDate?: string;
        parsedUpiRef?: string;
      },
      any
    >;
    approve: FunctionReference<
      "mutation",
      "public",
      {
        queueId: string;
        amount: number;
        note: string;
        category: ExpenseCategory;
        direction: Direction;
        date: string;
        party?: string;
        upiRef?: string;
      },
      any
    >;
    reject: FunctionReference<"mutation", "public", { queueId: string }, any>;
  };
  users: {
    store: FunctionReference<"mutation", "public", Record<string, never>, any>;
  };
};

export { api };

export declare const internal: {
  smsQueue: {
    purgeOldRejected: FunctionReference<"mutation", "internal", Record<string, never>, any>;
  };
};

export declare const components: Record<string, never>;
