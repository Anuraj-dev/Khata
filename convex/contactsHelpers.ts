// Contact graph operations shared across the insert paths (SMS auto-capture),
// udhaar tagging, and the contacts CRUD. These touch ctx.db, so they live here
// rather than in the pure `contactMatch` module — but all *decisions* (what's a
// handle, what matches) defer to `contactMatch` so the logic stays unit-tested.
//
// Design note: every tagged/resolved expense is written with BOTH `contactId`
// (the robust internal key) and a canonical `udhaarPerson` (the contact's name).
// Writing the canonical name means the existing name-keyed udhaar queries roll
// up correctly across all of a person's handles with no query changes.

import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { normalizeHandle, normalizeName, type HandleKind } from "./contactMatch";

function aliasKindFor(value: string): HandleKind | "name" {
  return value.includes("@") ? "vpa" : /^\d{6,}$/.test(value) ? "phone" : "name";
}

async function aliasLookup(
  ctx: MutationCtx,
  owner: string,
  value: string
): Promise<Id<"contacts"> | null> {
  if (!value) return null;
  const row = await ctx.db
    .query("contactAliases")
    .withIndex("by_owner_value", (q) => q.eq("ownerTokenIdentifier", owner).eq("value", value))
    .unique();
  return row ? row.contactId : null;
}

// Insert an alias unless this owner already has that value mapped (never steal a
// value from another contact — the first mapping wins; merges are explicit).
export async function upsertAlias(
  ctx: MutationCtx,
  owner: string,
  contactId: Id<"contacts">,
  value: string,
  kind: HandleKind | "name"
): Promise<void> {
  if (!value) return;
  const existing = await ctx.db
    .query("contactAliases")
    .withIndex("by_owner_value", (q) => q.eq("ownerTokenIdentifier", owner).eq("value", value))
    .unique();
  if (existing) return;
  await ctx.db.insert("contactAliases", {
    ownerTokenIdentifier: owner,
    contactId,
    value,
    kind,
    createdAt: Date.now(),
  });
}

export async function findOrCreateContactByName(
  ctx: MutationCtx,
  owner: string,
  name: string
): Promise<{ contactId: Id<"contacts">; name: string }> {
  const trimmed = name.trim();
  const key = normalizeName(trimmed);
  const existing = await aliasLookup(ctx, owner, key);
  if (existing) {
    const c = await ctx.db.get(existing);
    return { contactId: existing, name: c?.name ?? trimmed };
  }
  const now = Date.now();
  const contactId = await ctx.db.insert("contacts", {
    ownerTokenIdentifier: owner,
    name: trimmed,
    isUdhaarTracked: true,
    createdAt: now,
    updatedAt: now,
  });
  await upsertAlias(ctx, owner, contactId, key, "name");
  return { contactId, name: trimmed };
}

export type ExpenseContactFields = {
  counterpartyHandle?: string;
  contactId?: Id<"contacts">;
  udhaarPerson?: string;
};

// Auto-capture resolution for a freshly-ingested transaction — NO explicit user
// intent. Captures the normalized handle, and links to a contact only when we're
// confident: an exact handle alias, or (failing that) an exact name match, in
// which case the new handle is learned as an alias too. A fuzzy name match is
// deliberately NOT linked here — that drives a client suggestion chip instead.
export async function resolveForIngest(
  ctx: MutationCtx,
  owner: string,
  input: { handle?: string; party?: string }
): Promise<ExpenseContactFields> {
  const out: ExpenseContactFields = {};
  const h = normalizeHandle(input.handle);
  if (h) out.counterpartyHandle = h.value;

  let contactId = h ? await aliasLookup(ctx, owner, h.value) : null;

  if (!contactId && input.party) {
    const byName = await aliasLookup(ctx, owner, normalizeName(input.party));
    if (byName) {
      contactId = byName;
      if (h) await upsertAlias(ctx, owner, contactId, h.value, h.kind); // learn it
    }
  }

  if (contactId) {
    const c = await ctx.db.get(contactId);
    if (c?.isUdhaarTracked) {
      out.contactId = contactId;
      out.udhaarPerson = c.name;
    }
  }
  return out;
}

// Explicit user intent: tag this expense's counterparty as `name`. Find/create
// the contact, mark it tracked, and LEARN the expense's handle as an alias so
// future transactions from it auto-tag. Returns the canonical name to write.
export async function tagExpenseToPerson(
  ctx: MutationCtx,
  owner: string,
  expense: { counterpartyHandle?: string; party?: string },
  name: string
): Promise<{ contactId: Id<"contacts">; name: string }> {
  const { contactId, name: canonical } = await findOrCreateContactByName(ctx, owner, name);
  const c = await ctx.db.get(contactId);
  if (c && !c.isUdhaarTracked) {
    await ctx.db.patch(contactId, { isUdhaarTracked: true, updatedAt: Date.now() });
  }
  if (expense.counterpartyHandle) {
    await upsertAlias(
      ctx,
      owner,
      contactId,
      expense.counterpartyHandle,
      aliasKindFor(expense.counterpartyHandle)
    );
  }
  return { contactId, name: canonical };
}
