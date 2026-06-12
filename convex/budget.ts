import { internalMutation, mutation, query, type QueryCtx, type MutationCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireTokenIdentifier } from "./authHelpers";

// Convex runs in UTC; the app's calendar is IST (matches smsIngest.toIstIsoDate).
function istTodayIso(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function rupees(paise: number): string {
  const r = paise / 100;
  return `₹${r.toLocaleString("en-IN", { maximumFractionDigits: paise % 100 === 0 ? 0 : 2 })}`;
}

// Labels for the built-in categories (they live client-side only; mirrored here
// so push copy can name them). Custom categories resolve via the table.
const BUILTIN_LABELS: Record<string, string> = {
  food: "Food",
  travel: "Travel",
  shopping: "Shopping",
  bills: "Bills",
  health: "Health",
};

type MonthMath = {
  month: string;
  monthSpent: number;
  todaySpent: number;
  daysInMonth: number;
  daysRemaining: number;
  dailyPlan: number;
  byCategory: Map<string, { total: number; count: number }>;
};

async function computeMonth(
  ctx: QueryCtx | MutationCtx,
  owner: string,
  today: string,
  limit: number
): Promise<MonthMath> {
  const month = today.slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const dayOfMonth = Number(today.slice(8, 10));
  const daysRemaining = daysInMonth - dayOfMonth + 1;

  const monthExpenses = await ctx.db
    .query("expenses")
    .withIndex("by_owner_date", (q) =>
      q.eq("ownerTokenIdentifier", owner).gte("date", `${month}-01`).lte("date", `${month}-31`)
    )
    .collect();

  let monthSpent = 0;
  let todaySpent = 0;
  const byCategory = new Map<string, { total: number; count: number }>();
  for (const e of monthExpenses) {
    if (e.direction !== "debit") continue;
    monthSpent += e.amount;
    if (e.date === today) todaySpent += e.amount;
    const agg = byCategory.get(e.category) ?? { total: 0, count: 0 };
    agg.total += e.amount;
    agg.count += 1;
    byCategory.set(e.category, agg);
  }

  const spentBeforeToday = monthSpent - todaySpent;
  const dailyPlan = Math.max(0, Math.floor((limit - spentBeforeToday) / daysRemaining));

  return { month, monthSpent, todaySpent, daysInMonth, daysRemaining, dailyPlan, byCategory };
}

// `today` comes from the client (its local IST date) so the query stays
// deterministic and the math matches what the user sees on their calendar.
export const getStatus = query({
  args: { today: v.string() },
  handler: async (ctx, { today }) => {
    const owner = await requireTokenIdentifier(ctx);
    const budget = await ctx.db
      .query("budgets")
      .withIndex("by_owner", (q) => q.eq("ownerTokenIdentifier", owner))
      .unique();
    if (!budget) return null;

    const m = await computeMonth(ctx, owner, today, budget.monthlyLimit);
    return {
      monthlyLimit: budget.monthlyLimit,
      monthSpent: m.monthSpent,
      todaySpent: m.todaySpent,
      daysRemaining: m.daysRemaining,
      dailyPlan: m.dailyPlan,
      safeToday: m.dailyPlan - m.todaySpent,
    };
  },
});

export const setBudget = mutation({
  args: { monthlyLimit: v.number() },
  handler: async (ctx, { monthlyLimit }) => {
    if (monthlyLimit <= 0) throw new Error("Limit must be positive");
    const owner = await requireTokenIdentifier(ctx);
    const existing = await ctx.db
      .query("budgets")
      .withIndex("by_owner", (q) => q.eq("ownerTokenIdentifier", owner))
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { monthlyLimit, updatedAt: now });
      return existing._id;
    }
    return ctx.db.insert("budgets", {
      ownerTokenIdentifier: owner,
      monthlyLimit,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const clearBudget = mutation({
  args: {},
  handler: async (ctx) => {
    const owner = await requireTokenIdentifier(ctx);
    const existing = await ctx.db
      .query("budgets")
      .withIndex("by_owner", (q) => q.eq("ownerTokenIdentifier", owner))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});

// Turns the overage into the user's own spending currency: "~2 Food spends",
// based on this month's top debit category. Returns "" when there's no good
// frame (unknown/"other" category, or the overage is smaller than one typical spend).
function consequencePhrase(
  byCategory: Map<string, { total: number; count: number }>,
  customLabels: Map<string, string>,
  overage: number
): string {
  let top: { id: string; total: number; count: number } | null = null;
  for (const [id, agg] of byCategory) {
    if (!top || agg.total > top.total) top = { id, ...agg };
  }
  if (!top || top.count === 0) return "";
  const label = BUILTIN_LABELS[top.id] ?? customLabels.get(top.id);
  if (!label) return "";
  const avg = top.total / top.count;
  const n = Math.round(overage / avg);
  if (n < 1) return "";
  return ` — that's ~${n} ${label} spend${n === 1 ? "" : "s"}`;
}

// Runs after every debit insert (manual, SMS auto-log, approval, background
// ingest). Sends at most ONE push per run, priority: 100% month > 80% month >
// daily plan crossed; each deduped via the budget row so a burst of expenses
// can't spam. Warm, concrete copy — never shame.
export const checkAfterExpense = internalMutation({
  args: { ownerTokenIdentifier: v.string() },
  handler: async (ctx, { ownerTokenIdentifier: owner }) => {
    const budget = await ctx.db
      .query("budgets")
      .withIndex("by_owner", (q) => q.eq("ownerTokenIdentifier", owner))
      .unique();
    if (!budget) return;

    const today = istTodayIso();
    const limit = budget.monthlyLimit;
    const m = await computeMonth(ctx, owner, today, limit);

    let title: string | null = null;
    let body = "";

    if (m.monthSpent >= limit && budget.lastMonthlyAlert100 !== m.month) {
      const over = m.monthSpent - limit;
      title = "Monthly budget crossed";
      body =
        over > 0
          ? `${rupees(over)} over your ${rupees(limit)} budget with ${m.daysRemaining} day${m.daysRemaining === 1 ? "" : "s"} to go. Chhoti bachat from here counts double 💪`
          : `You've hit your ${rupees(limit)} budget with ${m.daysRemaining} day${m.daysRemaining === 1 ? "" : "s"} to go. Chhoti bachat from here counts double 💪`;
      await ctx.db.patch(budget._id, {
        lastMonthlyAlert100: m.month,
        lastMonthlyAlert80: m.month,
        updatedAt: Date.now(),
      });
    } else if (
      m.monthSpent >= 0.8 * limit &&
      m.monthSpent < limit &&
      budget.lastMonthlyAlert80 !== m.month
    ) {
      const left = limit - m.monthSpent;
      const perDay = Math.floor(left / m.daysRemaining);
      title = "80% of the month's budget used";
      body = `${rupees(left)} left for ${m.daysRemaining} day${m.daysRemaining === 1 ? "" : "s"} — about ${rupees(perDay)}/day. You've got this 🙌`;
      await ctx.db.patch(budget._id, { lastMonthlyAlert80: m.month, updatedAt: Date.now() });
    } else if (
      m.dailyPlan > 0 &&
      m.todaySpent > m.dailyPlan &&
      budget.lastDailyAlertDate !== today
    ) {
      const over = m.todaySpent - m.dailyPlan;
      const customLabels = new Map<string, string>();
      for (const id of m.byCategory.keys()) {
        if (BUILTIN_LABELS[id] || id === "other") continue;
        const cat = await ctx.db
          .query("categories")
          .withIndex("by_owner_client_id", (q) =>
            q.eq("ownerTokenIdentifier", owner).eq("clientId", id)
          )
          .unique();
        if (cat) customLabels.set(id, cat.label);
      }
      const consequence = consequencePhrase(m.byCategory, customLabels, over);
      const daysLeft = m.daysRemaining - 1;
      const newPlan = daysLeft > 0 ? Math.max(0, Math.floor((limit - m.monthSpent) / daysLeft)) : 0;
      title = "Aaj thoda zyada ho gaya 😅";
      body =
        daysLeft > 0
          ? `${rupees(over)} over today's plan${consequence}. New plan: ${rupees(newPlan)}/day for the next ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`
          : `${rupees(over)} over today's plan${consequence}. Month ends today — fresh start tomorrow.`;
      await ctx.db.patch(budget._id, { lastDailyAlertDate: today, updatedAt: Date.now() });
    }

    if (title) {
      await ctx.scheduler.runAfter(0, internal.pushNotifications.sendToUser, {
        ownerTokenIdentifier: owner,
        title,
        body,
        data: { type: "budget" },
      });
    }
  },
});
