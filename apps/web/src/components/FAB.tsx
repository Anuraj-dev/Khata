type Props = { onClick: () => void };

export function FAB({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 right-5 w-14 h-14 rounded-full flex items-center justify-center shadow-lg z-40 text-2xl font-light active:scale-95 transition-transform"
      style={{
        background: "var(--color-accent)",
        color: "var(--color-bg)",
        boxShadow: "0 4px 24px rgba(245,158,11,0.35)",
        marginBottom: "env(safe-area-inset-bottom, 0px)",
      }}
      aria-label="Add expense"
    >
      +
    </button>
  );
}
