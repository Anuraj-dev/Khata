import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Sheet } from "./Sheet";
import { Button } from "./Button";

type Props = {
  open: boolean;
  onClose: () => void;
  showToast: (t: { kind: "error" | "info"; message: string }) => void;
};

// Combine a duplicate person into another — their balances and history move to
// the one you keep. For when the same friend was tagged under two names before a
// handle linked them.
export function MergeContactsSheet({ open, onClose, showToast }: Props) {
  const contacts = useQuery(api.contacts.listContacts, open ? {} : "skip");
  const mergeContacts = useMutation(api.contacts.mergeContacts);

  const [dropId, setDropId] = useState<string>("");
  const [keepId, setKeepId] = useState<string>("");
  const [busy, setBusy] = useState(false);

  const list = contacts ?? [];
  const valid = dropId && keepId && dropId !== keepId;

  const selectStyle = {
    background: "var(--color-surface)",
    border: "1px solid var(--color-border-subtle)",
    color: "var(--color-text-primary)",
    fontFamily: "var(--font-sans)",
  } as const;

  async function handleMerge() {
    if (!valid || busy) return;
    setBusy(true);
    try {
      await mergeContacts({
        sourceId: dropId as Id<"contacts">,
        targetId: keepId as Id<"contacts">,
      });
      showToast({ kind: "info", message: "People merged." });
      setDropId("");
      setKeepId("");
      onClose();
    } catch {
      showToast({ kind: "error", message: "Couldn't merge. Try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Merge people">
      {open && (
        <div className="flex flex-col gap-4">
          {list.length < 2 ? (
            <p className="px-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>
              You need at least two people before you can merge.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-1.5 px-4">
                <label className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  Merge this person…
                </label>
                <select
                  value={dropId}
                  onChange={(e) => setDropId(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl text-sm outline-none"
                  style={selectStyle}
                >
                  <option value="">Select…</option>
                  {list.map((c) => (
                    <option key={c.contactId} value={c.contactId}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5 px-4">
                <label className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  …into this one (the one you keep)
                </label>
                <select
                  value={keepId}
                  onChange={(e) => setKeepId(e.target.value)}
                  className="w-full px-3 py-3 rounded-xl text-sm outline-none"
                  style={selectStyle}
                >
                  <option value="">Select…</option>
                  {list
                    .filter((c) => c.contactId !== dropId)
                    .map((c) => (
                      <option key={c.contactId} value={c.contactId}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className="px-4">
                <Button fullWidth loading={busy} disabled={!valid || busy} onClick={() => void handleMerge()}>
                  Merge
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </Sheet>
  );
}
