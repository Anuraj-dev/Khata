// Lightweight in-content loader shown while a lazily code-split route chunk
// downloads. Unlike BootScreen it only fills the <main> area, so the header and
// bottom nav stay put during navigation.
export function ScreenFallback() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-0">
      <div
        className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "var(--color-accent)", borderTopColor: "transparent" }}
      />
    </div>
  );
}
