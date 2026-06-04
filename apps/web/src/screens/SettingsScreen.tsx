import { useState } from "react";
import { useNavigate } from "react-router";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { authClient } from "../lib/auth-client";
import { expenseStore } from "../lib/expenseStorage";
import { requireDeviceAuth } from "../lib/deviceAuth";
import { useCategories } from "../hooks/useCategories";
import { AddCategoryForm } from "../components/AddCategoryForm";
import { BUILTIN_CATEGORIES } from "../lib/categories";

type Props = {
  showToast: (t: { kind: "error" | "info"; message: string }) => void;
};

export function SettingsScreen({ showToast }: Props) {
  const navigate = useNavigate();
  const clearAll = useMutation(api.expenses.clearAll);
  const [busy, setBusy] = useState(false);
  const [typedConfirm, setTypedConfirm] = useState<string | null>(null); // fallback modal text

  async function doClear() {
    setBusy(true);
    try {
      const { deleted } = await clearAll({});
      expenseStore.clearAllLocal();
      setTypedConfirm(null);
      showToast({ kind: "info", message: `Cleared ${deleted} expense${deleted === 1 ? "" : "s"}.` });
      navigate("/");
    } catch {
      showToast({ kind: "error", message: "Couldn't clear data. Try again." });
    } finally {
      setBusy(false);
    }
  }

  async function handleClearPress() {
    // Confirm via fingerprint / device PIN on native; fall back to a typed
    // confirmation where biometrics aren't available (web, or unenrolled device).
    const result = await requireDeviceAuth({
      title: "Confirm to erase all expenses",
      subtitle: "This permanently deletes every logged expense.",
    });
    if (result === "ok") {
      await doClear();
    } else if (result === "failed") {
      showToast({ kind: "error", message: "Authentication cancelled." });
    } else {
      setTypedConfirm("");
    }
  }

  async function handleSignOut() {
    try {
      await authClient.signOut();
      expenseStore.clearAllLocal();
      window.location.href = "/";
    } catch {
      showToast({ kind: "error", message: "Couldn't sign out." });
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto pb-24">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Settings
        </h2>
      </div>

      <CategoriesSection />

      {/* Danger zone */}
      <Section title="Data">
        <Row
          title="Clear all expenses"
          subtitle="Erase every expense on this account. Requires device unlock."
          danger
          disabled={busy}
          onClick={handleClearPress}
        />
      </Section>

      <Section title="Account">
        <Row title="Sign out" subtitle="You'll need to sign in again." onClick={handleSignOut} />
      </Section>

      {typedConfirm !== null && (
        <TypedConfirm
          value={typedConfirm}
          onChange={setTypedConfirm}
          busy={busy}
          onCancel={() => setTypedConfirm(null)}
          onConfirm={doClear}
        />
      )}
    </div>
  );
}

function CategoriesSection() {
  const { customDocs, addCategory, deleteCategory } = useCategories();
  const [adding, setAdding] = useState(false);

  async function handleAdd(label: string, emoji: string) {
    await addCategory(label, emoji);
    setAdding(false);
  }

  return (
    <Section title="Categories">
      <div className="flex flex-col gap-3 px-4 py-3" style={{ background: "var(--color-surface)" }}>
        <div className="flex flex-wrap gap-2">
          {BUILTIN_CATEGORIES.map((c) => (
            <span
              key={c.id}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm"
              style={{
                background: "var(--color-surface-elevated)",
                border: "1px solid var(--color-border-subtle)",
                color: "var(--color-text-secondary)",
              }}
            >
              <span>{c.emoji}</span>
              <span>{c.label}</span>
            </span>
          ))}
          {customDocs.map((c) => (
            <span
              key={c._id}
              className="flex items-center gap-1.5 rounded-full pl-3 pr-2 py-1.5 text-sm"
              style={{
                background: c.color + "22",
                border: `1px solid ${c.color}`,
                color: c.color,
              }}
            >
              <span>{c.emoji}</span>
              <span>{c.label}</span>
              <button
                onClick={() => void deleteCategory(c._id)}
                aria-label={`Delete ${c.label}`}
                style={{ background: "none", border: "none", color: "inherit", lineHeight: 1, opacity: 0.7 }}
              >
                ×
              </button>
            </span>
          ))}
        </div>

        {adding ? (
          <AddCategoryForm onAdd={handleAdd} onCancel={() => setAdding(false)} />
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="self-start rounded-xl px-3 py-1.5 text-sm font-semibold"
            style={{ background: "var(--color-surface-elevated)", border: "1px solid var(--color-border-default)", color: "var(--color-text-primary)" }}
          >
            + Add category
          </button>
        )}
      </div>
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <p
        className="px-4 pb-1 text-xs font-semibold uppercase tracking-wider"
        style={{ color: "var(--color-text-muted)" }}
      >
        {title}
      </p>
      <div style={{ borderTop: "1px solid var(--color-border-subtle)" }}>{children}</div>
    </div>
  );
}

function Row({
  title,
  subtitle,
  danger,
  disabled,
  onClick,
}: {
  title: string;
  subtitle: string;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left active:opacity-60 transition-opacity disabled:opacity-50"
      style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border-subtle)" }}
    >
      <span
        className="text-sm font-medium"
        style={{ color: danger ? "var(--color-error)" : "var(--color-text-primary)" }}
      >
        {title}
      </span>
      <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
        {subtitle}
      </span>
    </button>
  );
}

function TypedConfirm({
  value,
  onChange,
  busy,
  onCancel,
  onConfirm,
}: {
  value: string;
  onChange: (v: string) => void;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const armed = value.trim().toUpperCase() === "DELETE";
  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div
        className="w-full rounded-t-2xl p-5 flex flex-col gap-3"
        style={{ background: "var(--color-surface-elevated)" }}
      >
        <h3 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
          Erase all expenses?
        </h3>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          This can't be undone. Type <span className="font-bold">DELETE</span> to confirm.
        </p>
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="DELETE"
          className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
          style={{
            background: "var(--color-surface)",
            color: "var(--color-text-primary)",
            border: "1px solid var(--color-border-default)",
          }}
        />
        <div className="flex gap-2 mt-1">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl py-2.5 text-sm font-medium"
            style={{ background: "var(--color-surface)", color: "var(--color-text-primary)" }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!armed || busy}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold disabled:opacity-40"
            style={{ background: "var(--color-error)", color: "#fff" }}
          >
            {busy ? "Erasing…" : "Erase all"}
          </button>
        </div>
      </div>
    </div>
  );
}
