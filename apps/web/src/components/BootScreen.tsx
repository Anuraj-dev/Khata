export function BootScreen() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4"
      style={{ background: "var(--color-bg)" }}>
      <div className="flex flex-col items-center gap-3">
        <span
          className="text-4xl font-bold tracking-tight"
          style={{ color: "var(--color-accent)", fontFamily: "var(--font-mono)" }}
        >
          ₹
        </span>
        <span
          className="text-2xl font-semibold tracking-tight"
          style={{ color: "var(--color-text-primary)" }}
        >
          Khata
        </span>
      </div>
      <div
        className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
      />
    </div>
  );
}
