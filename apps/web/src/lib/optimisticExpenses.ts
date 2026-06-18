import type { OptimisticLocalStore } from "convex/browser";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";

// Optimistic-update logic for the expense list, kept pure so it can be unit
// tested against a fake OptimisticLocalStore (no live Convex client). The key
// correctness property: the optimistic row carries the SAME clientId the server
// mutation uses, so when the real row lands it replaces the placeholder cleanly
// — no divergent id, no full-replace race, no flicker or duplicate.

export type AddExpenseArgs = {
  clientId: string;
  amount: number;
  note: string;
  category: string;
  source: "manual" | "sms";
  direction: "debit" | "credit";
  date: string;
  party?: string;
  upiRef?: string;
};

// A synthetic expense doc that matches what listRecent returns, so the list
// renders it identically to a server row until the mutation confirms.
export function makeOptimisticExpense(args: AddExpenseArgs): Doc<"expenses"> {
  const now = Date.now();
  return {
    _id: `optimistic-${args.clientId}` as Id<"expenses">,
    _creationTime: now,
    ownerTokenIdentifier: "optimistic",
    clientId: args.clientId,
    amount: args.amount,
    note: args.note,
    category: args.category,
    source: args.source,
    direction: args.direction,
    date: args.date,
    party: args.party,
    upiRef: args.upiRef,
    createdAt: now,
    updatedAt: now,
  } as Doc<"expenses">;
}

// Insert the optimistic row at the top of every cached listRecent page so the
// expense shows instantly no matter which history limit is currently loaded.
export function applyAddExpenseOptimistic(
  localStore: OptimisticLocalStore,
  args: AddExpenseArgs
): void {
  const optimistic = makeOptimisticExpense(args);
  for (const { args: qArgs, value } of localStore.getAllQueries(api.expenses.listRecent)) {
    if (value === undefined) continue; // page not loaded yet — nothing to patch
    // Guard against a double-insert if the real row already arrived (same clientId).
    if (value.some((e) => e.clientId === args.clientId)) continue;
    localStore.setQuery(api.expenses.listRecent, qArgs, [optimistic, ...value]);
  }
}

// Remove a row from every cached listRecent page so a delete reflects instantly.
export function applyDeleteExpenseOptimistic(
  localStore: OptimisticLocalStore,
  args: { expenseId: Id<"expenses"> }
): void {
  for (const { args: qArgs, value } of localStore.getAllQueries(api.expenses.listRecent)) {
    if (value === undefined) continue;
    localStore.setQuery(
      api.expenses.listRecent,
      qArgs,
      value.filter((e) => e._id !== args.expenseId)
    );
  }
}
