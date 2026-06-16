import { internalMutation, internalQuery, mutation, query, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import { requireTokenIdentifier } from "./authHelpers";
import { normalizeName } from "./contactMatch";

// IST calendar (Convex runs in UTC).
function istToday(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function isoDaysAgo(days: number): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000 - days * 86400_000).toISOString().slice(0, 10);
}

// The recurring "identity" of a debit: its UPI handle if present, else the
// normalized counterparty name. Matches both detection and future debits.
function keyFor(e: Doc<"expenses">): string | null {
  if (e.counterpartyHandle) return e.counterpartyHandle;
  if (e.party) return normalizeName(e.party) || null;
  return null;
}

function median(nums: number[]): number {
  const s = [...nums].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}
function mode(nums: number[]): number {
  const counts = new Map<number, number>();
  let best = nums[0];
  let bestN = 0;
  for (const n of nums) {
    const c = (counts.get(n) ?? 0) + 1;
    counts.set(n, c);
    if (c > bestN) {
      bestN = c;
      best = n;
    }
  }
  return best;
}

// Suggest recurring bills from the last ~4 months of debits: a counterparty seen
// in ≥3 distinct months with consistent amounts, not already tracked/dismissed.
export const detect = query({
  args: {},
  handler: async (ctx) => {
    const owner = await requireTokenIdentifier(ctx);
    const rows = await ctx.db
      .query("expenses")
      .withIndex("by_owner_date", (q) =>
        q.eq("ownerTokenIdentifier", owner).gte("date", isoDaysAgo(125))
      )
      .collect();
    const existing = await ctx.db
      .query("recurringRules")
      .withIndex("by_owner", (q) => q.eq("ownerTokenIdentifier", owner))
      .collect();
    const known = new Set(existing.map((r) => r.key));

    const groups = new Map<
      string,
      { label: string; amounts: number[]; months: Set<string>; days: number[]; last: string }
    >();
    for (const e of rows) {
      if (e.direction !== "debit") continue;
      const key = keyFor(e);
      if (!key || known.has(key)) continue;
      const g =
        groups.get(key) ?? { label: e.party || key, amounts: [], months: new Set<string>(), days: [], last: e.date };
      g.amounts.push(e.amount);
      g.months.add(e.date.slice(0, 7));
      g.days.push(Number(e.date.slice(8, 10)));
      if (e.date > g.last) g.last = e.date;
      if (e.party && (g.label === key || !g.label)) g.label = e.party;
      groups.set(key, g);
    }

    const candidates: { key: string; label: string; typicalAmount: number; dayOfMonth: number }[] = [];
    for (const [key, g] of groups) {
      if (g.months.size < 3) continue;
      const med = median(g.amounts);
      if (med <= 0) continue;
      const consistent = g.amounts.every((a) => Math.abs(a - med) <= 0.4 * med);
      if (!consistent) continue;
      candidates.push({ key, label: g.label, typicalAmount: med, dayOfMonth: mode(g.days) });
    }
    return candidates;
  },
});

export const confirm = mutation({
  args: { key: v.string(), label: v.string(), typicalAmount: v.number(), dayOfMonth: v.number() },
  handler: async (ctx, args) => {
    const owner = await requireTokenIdentifier(ctx);
    const existing = await ctx.db
      .query("recurringRules")
      .withIndex("by_owner_key", (q) => q.eq("ownerTokenIdentifier", owner).eq("key", args.key))
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { ...args, status: "active", updatedAt: now });
      return existing._id;
    }
    return ctx.db.insert("recurringRules", {
      ownerTokenIdentifier: owner,
      ...args,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Reject a suggestion so it won't resurface (stored as a dismissed rule).
export const dismiss = mutation({
  args: { key: v.string(), label: v.string() },
  handler: async (ctx, { key, label }) => {
    const owner = await requireTokenIdentifier(ctx);
    const existing = await ctx.db
      .query("recurringRules")
      .withIndex("by_owner_key", (q) => q.eq("ownerTokenIdentifier", owner).eq("key", key))
      .unique();
    if (existing) return;
    const now = Date.now();
    await ctx.db.insert("recurringRules", {
      ownerTokenIdentifier: owner,
      key,
      label,
      typicalAmount: 0,
      dayOfMonth: 1,
      status: "dismissed",
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const removeRule = mutation({
  args: { ruleId: v.id("recurringRules") },
  handler: async (ctx, { ruleId }) => {
    const owner = await requireTokenIdentifier(ctx);
    const rule = await ctx.db.get(ruleId);
    if (!rule || rule.ownerTokenIdentifier !== owner) throw new Error("Not found");
    await ctx.db.delete(ruleId);
  },
});

// Shared: active rules with the due date for `today`'s month and whether a
// matching debit has already landed this month.
async function upcomingForOwner(ctx: QueryCtx, owner: string, today: string) {
  const rules = (
    await ctx.db
      .query("recurringRules")
      .withIndex("by_owner", (q) => q.eq("ownerTokenIdentifier", owner))
      .collect()
  ).filter((r) => r.status === "active");
  if (rules.length === 0) return [];

  const month = today.slice(0, 7);
  const monthDebits = await ctx.db
    .query("expenses")
    .withIndex("by_owner_date", (q) =>
      q.eq("ownerTokenIdentifier", owner).gte("date", `${month}-01`).lte("date", `${month}-31`)
    )
    .collect();
  const seenKeys = new Set<string>();
  for (const e of monthDebits) {
    if (e.direction !== "debit") continue;
    const k = keyFor(e);
    if (k) seenKeys.add(k);
  }

  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  return rules.map((r) => {
    const day = Math.min(r.dayOfMonth, daysInMonth);
    const dueDate = `${month}-${pad(day)}`;
    return {
      ruleId: r._id,
      key: r.key,
      label: r.label,
      typicalAmount: r.typicalAmount,
      dayOfMonth: r.dayOfMonth,
      dueDate,
      seenThisMonth: seenKeys.has(r.key),
      lastRemindedMonth: r.lastRemindedMonth,
    };
  });
}

export const listUpcoming = query({
  args: { today: v.string() },
  handler: async (ctx, { today }) => {
    const owner = await requireTokenIdentifier(ctx);
    const rows = await upcomingForOwner(ctx, owner, today);
    return rows
      .map(({ lastRemindedMonth: _omit, ...r }) => r)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  },
});

// For the reminder cron: rules due within 3 days, not yet paid this month, not
// already reminded this month.
export const dueForReminder = internalQuery({
  args: { owner: v.string() },
  handler: async (ctx, { owner }) => {
    const today = istToday();
    const rows = await upcomingForOwner(ctx, owner, today);
    const month = today.slice(0, 7);
    const soon = new Date(Date.now() + 5.5 * 60 * 60 * 1000 + 3 * 86400_000).toISOString().slice(0, 10);
    return rows.filter(
      (r) => !r.seenThisMonth && r.lastRemindedMonth !== month && r.dueDate <= soon && r.dueDate >= today
    );
  },
});

export const markReminded = internalMutation({
  args: { ruleId: v.id("recurringRules"), month: v.string() },
  handler: async (ctx, { ruleId, month }) => {
    await ctx.db.patch(ruleId, { lastRemindedMonth: month, updatedAt: Date.now() });
  },
});
