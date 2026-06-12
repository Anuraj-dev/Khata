import { internalAction, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

async function getAuth(): Promise<{ accessToken: string; projectId: string } | null> {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    console.error(
      "FIREBASE_SERVICE_ACCOUNT is not set on THIS deployment — push notifications are disabled. " +
        "Paste the Firebase service-account JSON in the deployment's env vars (dashboard → Settings → Environment Variables)."
    );
    return null;
  }
  let sa: { client_email: string; private_key: string; project_id: string };
  try {
    sa = JSON.parse(raw);
  } catch {
    console.error("FIREBASE_SERVICE_ACCOUNT is not valid JSON");
    return null;
  }

  const { SignJWT, importPKCS8 } = await import("jose");
  const privateKey = await importPKCS8(sa.private_key, "RS256");
  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  })
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(sa.client_email)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = (await resp.json()) as { access_token?: string };
  if (!data.access_token) {
    console.error("FCM OAuth failed:", data);
    return null;
  }
  return { accessToken: data.access_token, projectId: sa.project_id };
}

async function sendOne(
  fcmToken: string,
  auth: { accessToken: string; projectId: string },
  notification: { title: string; body: string },
  data: Record<string, string>
): Promise<void> {
  const resp = await fetch(
    `https://fcm.googleapis.com/v1/projects/${auth.projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: fcmToken,
          notification,
          data,
          android: { priority: "high" },
        },
      }),
    }
  );
  if (!resp.ok) {
    console.error(`FCM send failed (...${fcmToken.slice(-6)}): ${await resp.text()}`);
  }
}

function formatRupees(paise: number): string {
  return paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2);
}

// --- Internal queries ---

export const getTokensForUser = internalQuery({
  args: { ownerTokenIdentifier: v.string() },
  handler: async (ctx, { ownerTokenIdentifier }) => {
    const rows = await ctx.db
      .query("pushTokens")
      .withIndex("by_owner", (q) => q.eq("ownerTokenIdentifier", ownerTokenIdentifier))
      .collect();
    return rows.map((r) => r.fcmToken);
  },
});

export const getTripViewers = internalQuery({
  args: { tripId: v.id("trips") },
  handler: async (ctx, { tripId }) => {
    return ctx.db
      .query("tripMemberLinks")
      .withIndex("by_trip", (q) => q.eq("tripId", tripId))
      .collect();
  },
});

export const getPushTokenOwners = internalQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("pushTokens").collect();
    return [...new Set(all.map((t) => t.ownerTokenIdentifier))];
  },
});

// --- Internal actions ---

// Notify a specific user by their tokenIdentifier.
export const sendToUser = internalAction({
  args: {
    ownerTokenIdentifier: v.string(),
    title: v.string(),
    body: v.string(),
    data: v.record(v.string(), v.string()),
  },
  handler: async (ctx, { ownerTokenIdentifier, title, body, data }) => {
    const auth = await getAuth();
    if (!auth) return;
    const tokens = await ctx.runQuery(internal.pushNotifications.getTokensForUser, {
      ownerTokenIdentifier,
    });
    await Promise.all(tokens.map((t) => sendOne(t, auth, { title, body }, data)));
  },
});

// Notify all viewers of a trip when the owner adds a new expense.
export const notifyTripViewers = internalAction({
  args: {
    tripId: v.id("trips"),
    ownerTokenIdentifier: v.string(),
    expenseNote: v.string(),
    expenseAmount: v.number(),
    tripName: v.string(),
  },
  handler: async (ctx, { tripId, ownerTokenIdentifier, expenseNote, expenseAmount, tripName }) => {
    const auth = await getAuth();
    if (!auth) return;
    const viewers = await ctx.runQuery(internal.pushNotifications.getTripViewers, { tripId });
    if (!viewers.length) return;
    const notification = {
      title: tripName,
      body: `${expenseNote} · ₹${formatRupees(expenseAmount)} added`,
    };
    const data: Record<string, string> = { type: "trip_expense", tripId: tripId as string };
    for (const link of viewers) {
      if (link.viewerTokenIdentifier === ownerTokenIdentifier) continue;
      const tokens = await ctx.runQuery(internal.pushNotifications.getTokensForUser, {
        ownerTokenIdentifier: link.viewerTokenIdentifier,
      });
      await Promise.all(tokens.map((t) => sendOne(t, auth, notification, data)));
    }
  },
});

// Daily 9 PM IST cron: gentle reminder to log cash spends — only for users who
// logged nothing by hand today (UPI captures itself; cash doesn't).
export const sendCashNudges = internalAction({
  args: {},
  handler: async (ctx) => {
    const auth = await getAuth();
    if (!auth) return;
    const today = new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const owners = await ctx.runQuery(internal.pushNotifications.getPushTokenOwners, {});
    for (const owner of owners) {
      const hasManual = await ctx.runQuery(internal.expenses.hasManualOnDate, {
        ownerTokenIdentifier: owner,
        date: today,
      });
      if (hasManual) continue;
      const tokens = await ctx.runQuery(internal.pushNotifications.getTokensForUser, {
        ownerTokenIdentifier: owner,
      });
      await Promise.all(
        tokens.map((t) =>
          sendOne(
            t,
            auth,
            {
              title: "Any cash spends today?",
              body: "UPI logs itself — cash needs you. 10 seconds to add ✍️",
            },
            { type: "cash_nudge" }
          )
        )
      );
    }
  },
});

// Daily cron: remind users of outstanding trip balances.
export const sendSettlementReminders = internalAction({
  args: {},
  handler: async (ctx) => {
    const auth = await getAuth();
    if (!auth) return;
    const owners = await ctx.runQuery(internal.pushNotifications.getPushTokenOwners, {});
    for (const owner of owners) {
      const balances = await ctx.runQuery(internal.trips.getTripBalancesForOwner, { owner });
      const outstanding = balances.filter((b) => Math.abs(b.net) >= 100);
      if (!outstanding.length) continue;
      const tokens = await ctx.runQuery(internal.pushNotifications.getTokensForUser, {
        ownerTokenIdentifier: owner,
      });
      if (!tokens.length) continue;
      let title: string;
      let body: string;
      if (outstanding.length === 1) {
        const trip = outstanding[0];
        title = trip.name;
        body =
          trip.net > 0
            ? `You're owed ₹${formatRupees(trip.net)}`
            : `You owe ₹${formatRupees(Math.abs(trip.net))}`;
      } else {
        title = "Trip balances";
        body = `${outstanding.length} trips have outstanding balances`;
      }
      const data: Record<string, string> = { type: "settlement" };
      await Promise.all(tokens.map((t) => sendOne(t, auth, { title, body }, data)));
    }
  },
});
