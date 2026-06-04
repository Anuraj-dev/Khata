type Props = { onClick: () => void };

export function FAB({ onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 right-5 w-14 h-14 rounded-full flex items-center justify-center z-40 active:scale-95 hover:scale-[1.04] transition-transform duration-150"
      style={{
        background: "var(--gradient-accent)",
        color: "var(--color-bg)",
        boxShadow: "var(--shadow-accent)",
        marginBottom: "env(safe-area-inset-bottom, 0px)",
        cursor: "pointer",
      }}
      aria-label="Add expense"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>
  );
}
