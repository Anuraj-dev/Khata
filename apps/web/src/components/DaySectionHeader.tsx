type Props = {
  label: string;
};

// Just the day label (e.g. "Today"). Per-day totals were removed — the top
// summary bar already carries today's numbers, and the month divider carries
// the running net, so repeating spend/received here only cluttered the list.
export function DaySectionHeader({ label }: Props) {
  return (
    <div
      className="sticky top-0 z-10 flex items-center px-4 pt-5 pb-2"
      style={{ background: "var(--color-bg)" }}
    >
      <span
        className="text-xs font-semibold tracking-wide uppercase"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {label}
      </span>
    </div>
  );
}
