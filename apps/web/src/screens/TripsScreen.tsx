export function TripsScreen() {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-3 px-6"
      style={{ color: "var(--color-text-secondary)" }}>
      <span style={{ fontSize: 40, opacity: 0.4 }}>🧳</span>
      <p className="text-sm">No trips yet. Group splitting coming soon.</p>
    </div>
  );
}
