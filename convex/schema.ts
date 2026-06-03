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
    category: v.union(
      v.literal("food"),
      v.literal("travel"),
      v.literal("shopping"),
      v.literal("bills"),
      v.literal("health"),
      v.literal("other")
    ),
    source: v.union(v.literal("manual"), v.literal("sms")),
    direction: v.union(v.literal("debit"), v.literal("credit")),
    upiRef: v.optional(v.string()),
    party: v.optional(v.string()),
    date: v.string(),
    ownerTokenIdentifier: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["ownerTokenIdentifier"])
    .index("by_owner_date", ["ownerTokenIdentifier", "date"])
    .index("by_owner_client_id", ["ownerTokenIdentifier", "clientId"]),

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
    splitAmong: v.array(v.string()),
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
