import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireTokenIdentifier } from "./authHelpers";
import { findOrCreateContactByName, upsertAlias } from "./contactsHelpers";
import { normalizeName } from "./contactMatch";

// Lightweight list for autocomplete (name + id). The client merges these with
// trip-member names to seed the udhaar tag field.
export const listContacts = query({
  args: {},
  handler: async (ctx) => {
    const owner = await requireTokenIdentifier(ctx);
    const rows = await ctx.db
      .query("contacts")
      .withIndex("by_owner", (q) => q.eq("ownerTokenIdentifier", owner))
      .collect();
    return rows
      .map((c) => ({ contactId: c._id, name: c.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const createContact = mutation({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const owner = await requireTokenIdentifier(ctx);
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Name required");
    const { contactId } = await findOrCreateContactByName(ctx, owner, trimmed);
    return contactId;
  },
});

export const renameContact = mutation({
  args: { contactId: v.id("contacts"), name: v.string() },
  handler: async (ctx, { contactId, name }) => {
    const owner = await requireTokenIdentifier(ctx);
    const contact = await ctx.db.get(contactId);
    if (!contact || contact.ownerTokenIdentifier !== owner) throw new Error("Not found");
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Name required");

    await ctx.db.patch(contactId, { name: trimmed, updatedAt: Date.now() });
    await upsertAlias(ctx, owner, contactId, normalizeName(trimmed), "name");

    // Rewrite the denormalized name on every tagged expense so the name-keyed
    // udhaar queries reflect the new name.
    const tagged = await ctx.db
      .query("expenses")
      .withIndex("by_owner_contact", (q) =>
        q.eq("ownerTokenIdentifier", owner).eq("contactId", contactId)
      )
      .collect();
    for (const e of tagged) await ctx.db.patch(e._id, { udhaarPerson: trimmed });
  },
});

// Combine two contacts into one (e.g. duplicates created before a handle was
// named). Source's aliases + tagged expenses move to the target; the source is
// deleted. Balances then roll up under the target automatically.
export const mergeContacts = mutation({
  args: { sourceId: v.id("contacts"), targetId: v.id("contacts") },
  handler: async (ctx, { sourceId, targetId }) => {
    const owner = await requireTokenIdentifier(ctx);
    if (sourceId === targetId) return;
    const source = await ctx.db.get(sourceId);
    const target = await ctx.db.get(targetId);
    if (!source || source.ownerTokenIdentifier !== owner) throw new Error("Source not found");
    if (!target || target.ownerTokenIdentifier !== owner) throw new Error("Target not found");

    // Move aliases — keep the target's mapping when a value already exists there.
    const sourceAliases = await ctx.db
      .query("contactAliases")
      .withIndex("by_contact", (q) => q.eq("contactId", sourceId))
      .collect();
    for (const a of sourceAliases) {
      const clash = await ctx.db
        .query("contactAliases")
        .withIndex("by_owner_value", (q) =>
          q.eq("ownerTokenIdentifier", owner).eq("value", a.value)
        )
        .filter((q) => q.eq(q.field("contactId"), targetId))
        .first();
      if (clash) await ctx.db.delete(a._id);
      else await ctx.db.patch(a._id, { contactId: targetId });
    }

    // Re-point tagged expenses and rewrite the canonical name.
    const taggedExpenses = await ctx.db
      .query("expenses")
      .withIndex("by_owner_contact", (q) =>
        q.eq("ownerTokenIdentifier", owner).eq("contactId", sourceId)
      )
      .collect();
    for (const e of taggedExpenses) {
      await ctx.db.patch(e._id, { contactId: targetId, udhaarPerson: target.name });
    }

    await ctx.db.delete(sourceId);
    if (!target.isUdhaarTracked) {
      await ctx.db.patch(targetId, { isUdhaarTracked: true, updatedAt: Date.now() });
    }
    return targetId as Id<"contacts">;
  },
});

// One-off migration: turn every legacy `udhaarPerson` string (tagged before the
// contacts table existed) into a real contact, linking its expenses and seeding
// a name alias. Idempotent — rows that already have a contactId are skipped.
export const backfillContacts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("expenses").collect();
    const legacy = all.filter((e) => e.udhaarPerson && !e.contactId);
    let linked = 0;
    for (const e of legacy) {
      const { contactId, name } = await findOrCreateContactByName(
        ctx,
        e.ownerTokenIdentifier,
        e.udhaarPerson!
      );
      await ctx.db.patch(e._id, { contactId, udhaarPerson: name });
      linked += 1;
    }
    return { linked };
  },
});
