import React, { useState } from "react";
import { useNavigate } from "react-router";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { authClient } from "../lib/auth-client";
import { expenseStore } from "../lib/expenseStorage";
import { clearSmsBackground, peekDeviceSecret } from "../lib/smsBackground";
import { requireDeviceAuth } from "../lib/deviceAuth";
import { useCategories } from "../hooks/useCategories";
import { useBudget } from "../hooks/useBudget";
import { formatRupees } from "../lib/dates";
import { AddCategoryForm } from "../components/AddCategoryForm";
import { SetBudgetSheet } from "../components/SetBudgetSheet";
import { BUILTIN_CATEGORIES } from "../lib/categories";
import { Button } from "../components/Button";
import { PlusIcon } from "../components/icons";

type Props = {
  showToast: (t: { kind: "error" | "info"; message: string }) => void;
};

export function SettingsScreen({ showToast }: Props) {
  const navigate = useNavigate();
  const clearAllExpenses = useMutation(api.expenses.clearAll);
  const clearAllTrips = useMutation(api.trips.clearAll);
  const unregisterDevice = useMutation(api.smsIngest.unregisterDevice);
  const sendTestPush = useMutation(api.pushTokens.sendTest);
  const [pushBusy, setPushBusy] = useState(false);
  const [expenseBusy, setExpenseBusy] = useState(false);
  const [tripBusy, setTripBusy] = useState(false);
  const [typedExpenseConfirm, setTypedExpenseConfirm] = useState<string | null>(null);
  const [typedTripConfirm, setTypedTripConfirm] = useState<string | null>(null);

  async function doClearExpenses() {
    setExpenseBusy(true);
    try {
      const { deleted } = await clearAllExpenses({});
      expenseStore.clearAllLocal();
      setTypedExpenseConfirm(null);
      showToast({ kind: "info", message: `Cleared ${deleted} expense${deleted === 1 ? "" : "s"}.` });
      navigate("/");
    } catch {
      showToast({ kind: "error", message: "Couldn't clear data. Try again." });
    } finally {
      setExpenseBusy(false);
    }
  }

  async function doClearTrips() {
    setTripBusy(true);
    try {
      const { deleted } = await clearAllTrips({});
      setTypedTripConfirm(null);
      showToast({ kind: "info", message: `Cleared ${deleted} trip${deleted === 1 ? "" : "s"}.` });
      navigate("/");
    } catch {
      showToast({ kind: "error", message: "Couldn't clear trips. Try again." });
    } finally {
      setTripBusy(false);
    }
  }

  async function handleClearExpensesPress() {
    const result = await requireDeviceAuth({
      title: "Confirm to erase all expenses",
      subtitle: "This permanently deletes every logged expense.",
    });
    if (result === "ok") {
      await doClearExpenses();
    } else if (result === "failed") {
      showToast({ kind: "error", message: "Authentication cancelled." });
    } else {
      setTypedExpenseConfirm("");
    }
  }

  async function handleClearTripsPress() {
    const result = await requireDeviceAuth({
      title: "Confirm to erase all trips",
      subtitle: "This permanently deletes every trip and its expenses.",
    });
    if (result === "ok") {
      await doClearTrips();
    } else if (result === "failed") {
      showToast({ kind: "error", message: "Authentication cancelled." });
    } else {
      setTypedTripConfirm("");
    }
  }

  async function handleTestPush() {
    setPushBusy(true);
    try {
      const { deviceCount } = await sendTestPush({});
      showToast(
        deviceCount === 0
          ? { kind: "error", message: "No device registered for push. Open the Android app and allow notifications first." }
          : { kind: "info", message: "Test sent — check your notification tray." }
      );
    } catch {
      showToast({ kind: "error", message: "Couldn't send the test. Try again." });
    } finally {
      setPushBusy(false);
    }
  }

  async function handleSignOut() {
    try {
      // Unbind background SMS ingest first, while we still have a session: drop the
      // server-side device→owner mapping, then clear the native config + local
      // secret. Otherwise an SMS arriving after logout would auto-log to this
      // (now signed-out) account. Best-effort — never block sign-out on it.
      const deviceSecret = peekDeviceSecret();
      if (deviceSecret) {
        try {
          await unregisterDevice({ deviceSecret });
        } catch {
          // Offline / already unbound — the receiver's 401 fallback still covers it.
        }
      }
      await clearSmsBackground();
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

      <BudgetSection showToast={showToast} />

      <CategoriesSection />

      <Section title="Notifications">
        <Row
          title="Send test notification"
          subtitle="Verifies push delivery to this account's devices."
          disabled={pushBusy}
          onClick={handleTestPush}
        />
      </Section>

      {/* Danger zone */}
      <Section title="Data">
        <Row
          title="Clear all expenses"
          subtitle="Erase every expense on this account. Requires device unlock."
          danger
          disabled={expenseBusy}
          onClick={handleClearExpensesPress}
        />
        <Row
          title="Clear all trips"
          subtitle="Erase every trip, shared expense, and settlement. Requires device unlock."
          danger
          disabled={tripBusy}
          onClick={handleClearTripsPress}
        />
      </Section>

      <Section title="Account">
        <Row title="Sign out" subtitle="You'll need to sign in again." onClick={handleSignOut} />
      </Section>

      {typedExpenseConfirm !== null && (
        <TypedConfirm
          title="Erase all expenses?"
          description={<>This can't be undone. Type <span className="font-bold">DELETE</span> to confirm.</>}
          value={typedExpenseConfirm}
          onChange={setTypedExpenseConfirm}
          busy={expenseBusy}
          onCancel={() => setTypedExpenseConfirm(null)}
          onConfirm={doClearExpenses}
        />
      )}

      {typedTripConfirm !== null && (
        <TypedConfirm
          title="Erase all trips?"
          description={<>This can't be undone. Type <span className="font-bold">DELETE</span> to confirm.</>}
          value={typedTripConfirm}
          onChange={setTypedTripConfirm}
          busy={tripBusy}
          onCancel={() => setTypedTripConfirm(null)}
          onConfirm={doClearTrips}
        />
      )}
    </div>
  );
}

function BudgetSection({ showToast }: Props) {
  // Settings is only reachable from the signed-in shell.
  const { status, setBudget, clearBudget } = useBudget(true);
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <Section title="Budget">
        <Row
          title="Monthly budget"
          subtitle={
            status
              ? `${formatRupees(status.monthlyLimit)}/month · plan ${formatRupees(status.dailyPlan)}/day`
              : "Not set — pick a monthly target and Khata keeps a daily plan."
          }
          onClick={() => setSheetOpen(true)}
        />
      </Section>
      <SetBudgetSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        current={status?.monthlyLimit ?? null}
        spentThisMonth={status?.monthSpent}
        onSave={async (paise) => {
          await setBudget({ monthlyLimit: paise });
          showToast({ kind: "info", message: "Budget saved." });
        }}
        onRemove={async () => {
          await clearBudget({});
          showToast({ kind: "info", message: "Budget removed." });
        }}
      />
    </>
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
          <Button
            variant="secondary"
            size="sm"
            className="self-start"
            leftIcon={<PlusIcon size={15} />}
            onClick={() => setAdding(true)}
          >
            Add category
          </Button>
        )}
      </div>
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <p
        className="px-4 pb-1.5 text-xs font-semibold uppercase tracking-wider"
        style={{ color: "var(--color-text-muted)" }}
      >
        {title}
      </p>
      <div
        className="mx-4 overflow-hidden [&>*:last-child]:border-b-0"
        style={{
          border: "1px solid var(--color-border-subtle)",
          borderRadius: "var(--radius-lg)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {children}
      </div>
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
      className="flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left transition-colors active:[background:var(--color-surface-elevated)] disabled:opacity-50"
      style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border-subtle)", transitionDuration: "var(--dur-fast)", cursor: "pointer" }}
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
  title,
  description,
  value,
  onChange,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: React.ReactNode;
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
        className="w-full p-5 flex flex-col gap-3"
        style={{
          background: "var(--color-surface-elevated)",
          borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
          boxShadow: "var(--shadow-elevated)",
          paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px) + 1rem)",
        }}
      >
        <h3 className="text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
          {title}
        </h3>
        <p className="text-sm" style={{ color: "var(--color-text-secondary)" }}>
          {description}
        </p>
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="DELETE"
          className="w-full px-3 py-2.5 text-sm outline-none"
          style={{
            background: "var(--color-surface)",
            color: "var(--color-text-primary)",
            border: "1px solid var(--color-border-default)",
            borderRadius: "var(--radius-md)",
          }}
        />
        <div className="flex gap-2 mt-1">
          <Button variant="secondary" fullWidth onClick={onCancel}>
            Cancel
          </Button>
          <Button
            fullWidth
            loading={busy}
            disabled={!armed || busy}
            onClick={onConfirm}
            style={{ background: "var(--color-error)", color: "#fff", boxShadow: "none" }}
          >
            {busy ? "Erasing…" : "Erase all"}
          </Button>
        </div>
      </div>
    </div>
  );
}
