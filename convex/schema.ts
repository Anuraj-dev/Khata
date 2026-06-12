import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    image: v.optional(v.string()),
    tokenIdentifier: v.string(),
  }).index("by_token", ["tokenIdentifier"]),

  expenses: defineTable({
    clientId: v.string(),
    amount: v.number(),
    note: v.string(),
    // Open string: built-in categories ("food", "travel", …) plus user-defined
    // ones synced from the `categories` table. The client resolves the id to a
    // label/emoji/color, falling back to a generic look for unknown ids.
    category: v.string(),
    source: v.union(v.literal("manual"), v.literal("sms")),
    direction: v.union(v.literal("debit"), v.literal("credit")),
    upiRef: v.optional(v.string()),
    party: v.optional(v.string()),
    // Udhaar tag: the free-text person this expense is lent to / borrowed from /
    // repaid by. Balance per person = Σ tagged debits − Σ tagged credits, so the
    // expense direction alone carries the meaning — no separate kind needed.
    udhaarPerson: v.optional(v.string()),
    date: v.string(),
    ownerTokenIdentifier: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerTokenIdentifier"])
    .index("by_owner_date", ["ownerTokenIdentifier", "date"])
    .index("by_owner_client_id", ["ownerTokenIdentifier", "clientId"])
    .index("by_owner_udhaar", ["ownerTokenIdentifier", "udhaarPerson"]),

  // User-defined expense categories. Built-in categories live only on the client;
  // this table holds the extras the user adds. `clientId` is a slug derived from
  // the label and is what gets stored on each expense's `category` field.
  categories: defineTable({
    clientId: v.string(),
    label: v.string(),
    emoji: v.string(),
    color: v.string(),
    ownerTokenIdentifier: v.string(),
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerTokenIdentifier"])
    .index("by_owner_client_id", ["ownerTokenIdentifier", "clientId"]),

  // One row per user: the monthly spend limit plus alert-dedup state so the
  // overspend pushes fire at most once per day / once per threshold per month.
  budgets: defineTable({
    ownerTokenIdentifier: v.string(),
    monthlyLimit: v.number(), // paise
    lastDailyAlertDate: v.optional(v.string()), // yyyy-mm-dd (IST)
    lastMonthlyAlert80: v.optional(v.string()), // yyyy-mm (IST)
    lastMonthlyAlert100: v.optional(v.string()), // yyyy-mm (IST)
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_owner", ["ownerTokenIdentifier"]),

  trips: defineTable({
    clientId: v.string(),
    name: v.string(),
    members: v.array(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("settled")),
    ownerTokenIdentifier: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerTokenIdentifier"])
    .index("by_owner_status", ["ownerTokenIdentifier", "status"])
    .index("by_owner_client_id", ["ownerTokenIdentifier", "clientId"]),

  tripExpenses: defineTable({
    clientId: v.string(),
    tripId: v.id("trips"),
    paidBy: v.string(),
    amount: v.number(),
    note: v.string(),
    // Members sharing this expense. For equal splits this is the full list; for
    // custom splits it's the members with a non-zero share.
    splitAmong: v.array(v.string()),
    // Absent/"equal" = even division among splitAmong. "custom" = use `shares`
    // (explicit paise per member). Optional so existing rows read as equal.
    splitMode: v.optional(v.union(v.literal("equal"), v.literal("custom"))),
    shares: v.optional(
      v.array(v.object({ member: v.string(), amount: v.number() }))
    ),
    emoji: v.optional(v.string()),
    date: v.string(),
    ownerTokenIdentifier: v.string(),
    createdAt: v.number(),
  })
    .index("by_owner", ["ownerTokenIdentifier"])
    .index("by_trip", ["tripId"])
    .index("by_owner_trip", ["ownerTokenIdentifier", "tripId"]),

  settlements: defineTable({
    tripId: v.id("trips"),
    fromMember: v.string(),
    toMember: v.string(),
    amount: v.number(),
    settledAt: v.optional(v.number()),
    ownerTokenIdentifier: v.string(),
    createdAt: v.number(),
  })
    .index("by_trip", ["tripId"])
    .index("by_owner_trip", ["ownerTokenIdentifier", "tripId"]),

  // A time-limited invite to view a trip read-only. The token travels in the
  // QR / link; one active share per trip (regenerating replaces it).
  tripShares: defineTable({
    tripId: v.id("trips"),
    token: v.string(),
    ownerTokenIdentifier: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_token", ["token"])
    .index("by_owner_trip", ["ownerTokenIdentifier", "tripId"]),

  // Maps a free-text member slot in a trip to the Khata account that claimed it
  // via an invite. The linked viewer reads the trip (owner's rows) read-only.
  tripMemberLinks: defineTable({
    tripId: v.id("trips"),
    member: v.string(),
    viewerTokenIdentifier: v.string(),
    ownerTokenIdentifier: v.string(),
    createdAt: v.number(),
  })
    .index("by_trip", ["tripId"])
    .index("by_viewer", ["viewerTokenIdentifier"])
    .index("by_trip_viewer", ["tripId", "viewerTokenIdentifier"])
    .index("by_trip_member", ["tripId", "member"]),

  pushTokens: defineTable({
    ownerTokenIdentifier: v.string(),
    fcmToken: v.string(),
    platform: v.string(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerTokenIdentifier"])
    .index("by_fcm_token", ["fcmToken"]),

  // Maps a device (identified by an opaque, randomly-generated secret) to the
  // signed-in user. Lets the native SMS BroadcastReceiver post incoming UPI SMS
  // to the HTTP ingest endpoint while the app is closed — the secret resolves to
  // the owner server-side (no auth token available in a background receiver).
  smsDevices: defineTable({
    ownerTokenIdentifier: v.string(),
    deviceSecret: v.string(),
    platform: v.string(),
    updatedAt: v.number(),
  })
    .index("by_secret", ["deviceSecret"])
    .index("by_owner", ["ownerTokenIdentifier"]),

  smsReviewQueue: defineTable({
    rawSms: v.string(),
    parsedAmount: v.optional(v.number()),
    parsedParty: v.optional(v.string()),
    parsedDirection: v.optional(v.union(v.literal("debit"), v.literal("credit"))),
    parsedDate: v.optional(v.string()),
    parsedUpiRef: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected")),
    ownerTokenIdentifier: v.string(),
    createdAt: v.number(),
    reviewedAt: v.optional(v.number()),
  })
    .index("by_owner", ["ownerTokenIdentifier"])
    .index("by_owner_status", ["ownerTokenIdentifier", "status"]),
});
