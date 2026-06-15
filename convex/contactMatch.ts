// Contact identity resolution — single source of truth for both the server
// (auto-tagging incoming SMS) and the web client (suggestion chips). Pure string
// logic, no Convex APIs: safe to run inside a mutation and safe to bundle into
// the web app, and unit-testable in isolation.
//
// The stable identity key is the *handle* (a UPI VPA or phone number), not the
// display name. Handles are deterministic to extract; names are not. Names are
// only ever used to *suggest* a contact, never to assert identity.

export type HandleKind = "vpa" | "phone";
export type Handle = { value: string; kind: HandleKind };

// Normalize a raw handle to its stable alias value:
//   "9706312331@ybl"   -> { value: "9706312331", kind: "phone" }
//   "+91 97063 12331"  -> { value: "9706312331", kind: "phone" }
//   "Nitin.Das@oksbi"  -> { value: "nitin.das@oksbi", kind: "vpa" }
// Returns null when the input isn't a recognizable handle.
export function normalizeHandle(raw: string | undefined | null): Handle | null {
  if (!raw) return null;
  const s = raw.trim().toLowerCase();
  if (!s) return null;

  const at = s.indexOf("@");
  if (at > 0) {
    const local = s.slice(0, at);
    const domain = s.slice(at + 1);
    const digits = local.replace(/\D/g, "");
    // Phone-number VPA: the local part is essentially a phone number.
    if (/^\+?\d[\d ._-]*$/.test(local) && digits.length >= 10) {
      return { value: digits.slice(-10), kind: "phone" };
    }
    if (!domain) return null;
    return { value: `${local}@${domain}`, kind: "vpa" };
  }

  // Bare phone number (no VPA domain).
  const digits = s.replace(/\D/g, "");
  if (digits.length >= 10 && /^\+?[\d ._-]+$/.test(s)) {
    return { value: digits.slice(-10), kind: "phone" };
  }
  return null;
}

// Collapse a display name to a comparable key.
export function normalizeName(name: string | undefined | null): string {
  return (name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

// Resolve an incoming raw handle to a contact via the owner's stored aliases.
// Aliases are persisted already-normalized, so we match on `value` directly.
// Generic over the id type so it's usable with Convex `Id<"contacts">` and with
// plain strings in tests.
export function resolveByHandle<T>(
  rawHandle: string | undefined | null,
  aliases: ReadonlyArray<{ value: string; contactId: T }>
): T | null {
  const h = normalizeHandle(rawHandle);
  if (!h) return null;
  const hit = aliases.find((a) => a.value === h.value);
  return hit ? hit.contactId : null;
}

// Suggest a contact from a parsed display name. An exact (normalized) match is
// `confident` — safe to auto-link. A fuzzy match (shared first name, or one name
// contained in the other) is a suggestion only — surface a one-tap chip.
export function suggestByName<T>(
  parsedName: string | undefined | null,
  contacts: ReadonlyArray<{ name: string; contactId: T }>
): { contactId: T; confident: boolean } | null {
  const target = normalizeName(parsedName);
  if (target.length < 2) return null;

  const exact = contacts.find((c) => normalizeName(c.name) === target);
  if (exact) return { contactId: exact.contactId, confident: true };

  const targetFirst = target.split(" ")[0];
  const fuzzy = contacts.find((c) => {
    const n = normalizeName(c.name);
    if (!n) return false;
    const first = n.split(" ")[0];
    return (
      (first.length >= 3 && first === targetFirst) ||
      (n.length >= 4 && (n.includes(target) || target.includes(n)))
    );
  });
  return fuzzy ? { contactId: fuzzy.contactId, confident: false } : null;
}
