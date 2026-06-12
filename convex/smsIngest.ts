import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { requireTokenIdentifier } from "./authHelpers";
import { parseSms, isUpiSms, categorizeSms, smsClientId } from "./smsParser";

// Convex runs in UTC; the app is IST. Convert an epoch-ms SMS receive time to the
// IST calendar date (yyyy-mm-dd) so the fallback date matches what the device-side
// poller would have produced.
function toIstIsoDate(ms: number): string {
  return new Date(ms + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// Called by the app (native, authenticated) to bind this device's opaque secret
// to the signed-in user. The background SMS receiver later posts that secret to
// the HTTP ingest endpoint, which resolves it back to this owner. Upsert by
// secret so re-registering the same device just refreshes the mapping.
export const registerDevice = mutation({
  args: { deviceSecret: v.string(), platform: v.string() },
  handler: async (ctx, { deviceSecret, platform }) => {
    const owner = await requireTokenIdentifier(ctx);
    const existing = await ctx.db
      .query("smsDevices")
      .withIndex("by_secret", (q) => q.eq("deviceSecret", deviceSecret))
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { ownerTokenIdentifier: owner, platform, updatedAt: now });
      return existing._id;
    }
    return ctx.db.insert("smsDevices", {
      ownerTokenIdentifier: owner,
      deviceSecret,
      platform,
      updatedAt: now,
    });
  },
});

// Called on sign-out to unbind this device. Removes the secret→owner mapping so
// any SMS the background receiver posts after logout resolves to nothing (the
// HTTP route answers 401, and the receiver then forgets its config). Only the
// caller's own device row is deletable.
export const unregisterDevice = mutation({
  args: { deviceSecret: v.string() },
  handler: async (ctx, { deviceSecret }) => {
    const owner = await requireTokenIdentifier(ctx);
    const existing = await ctx.db
      .query("smsDevices")
      .withIndex("by_secret", (q) => q.eq("deviceSecret", deviceSecret))
      .unique();
    if (existing && existing.ownerTokenIdentifier === owner) {
      await ctx.db.delete(existing._id);
    }
  },
});

function buildNote(party: string | undefined, direction: "debit" | "credit"): string {
  if (party) return party;
  return direction === "credit" ? "Money received" : "Bank transaction";
}

// Called only by the HTTP ingest route (convex/http.ts) on behalf of the native
// background receiver. Resolves the device secret to an owner, then mirrors the
// foreground poller's logic (useSmsPoller + smsQueue.autoLog/enqueue): confident
// parses auto-log as an expense (deduped by clientId), ambiguous bank SMS go to
// the manual review queue. Returns { ok } so the endpoint can answer 200/401.
export const ingestFromDevice = internalMutation({
  args: {
    deviceSecret: v.string(),
    sender: v.string(),
    body: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, { deviceSecret, sender, body, timestamp }) => {
    const device = await ctx.db
      .query("smsDevices")
      .withIndex("by_secret", (q) => q.eq("deviceSecret", deviceSecret))
      .unique();
    if (!device) return { ok: false as const, reason: "unknown_device" as const };
    const owner = device.ownerTokenIdentifier;

    // Only care about bank/UPI SMS; ignore everything else silently.
    if (!isUpiSms(sender, body)) return { ok: true as const, action: "ignored" as const };

    const parsed = parseSms(body);
    const date = parsed?.date ?? toIstIsoDate(timestamp);

    // Confident parse (amount + direction) → log directly, deduped on clientId.
    if (parsed && parsed.amount && parsed.direction) {
      const clientId = smsClientId({ ...parsed, date }, body);
      const existing = await ctx.db
        .query("expenses")
        .withIndex("by_owner_client_id", (q) =>
          q.eq("ownerTokenIdentifier", owner).eq("clientId", clientId)
        )
        .unique();
      if (existing) return { ok: true as const, action: "duplicate" as const };

      const now = Date.now();
      await ctx.db.insert("expenses", {
        clientId,
        amount: parsed.amount,
        note: buildNote(parsed.party, parsed.direction),
        category: categorizeSms(parsed.party, body),
        source: "sms",
        direction: parsed.direction,
        upiRef: parsed.upiRef,
        party: parsed.party,
        date,
        ownerTokenIdentifier: owner,
        createdAt: now,
        updatedAt: now,
      });
      if (parsed.direction === "debit") {
        await ctx.scheduler.runAfter(0, internal.budget.checkAfterExpense, {
          ownerTokenIdentifier: owner,
        });
      }
      return { ok: true as const, action: "logged" as const };
    }

    // Ambiguous bank SMS → manual review queue (+ review push), mirroring
    // smsQueue.enqueue.
    await ctx.db.insert("smsReviewQueue", {
      rawSms: body,
      parsedAmount: parsed?.amount,
      parsedParty: parsed?.party,
      parsedDirection: parsed?.direction,
      parsedDate: date,
      parsedUpiRef: parsed?.upiRef,
      status: "pending",
      ownerTokenIdentifier: owner,
      createdAt: Date.now(),
    });
    const rupeesStr = parsed?.amount
      ? `₹${parsed.amount % 100 === 0 ? parsed.amount / 100 : (parsed.amount / 100).toFixed(2)} · `
      : "";
    await ctx.scheduler.runAfter(0, internal.pushNotifications.sendToUser, {
      ownerTokenIdentifier: owner,
      title: "Transaction needs review",
      body: `${rupeesStr}tap to review`,
      data: { type: "sms_review" },
    });
    return { ok: true as const, action: "queued" as const };
  },
});
