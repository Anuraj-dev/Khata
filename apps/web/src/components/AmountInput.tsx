import { formatRupees } from "../lib/dates";

const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  ["00", "0", "⌫"],
] as const;

type Props = {
  paise: number;
  onChange: (paise: number) => void;
};

export function AmountInput({ paise, onChange }: Props) {
  // Entry is in whole rupees — typing "5" means ₹5, "50" means ₹50. No paise/
  // decimals: nobody logging an expense wants to tap through 0.50. We still store
  // and emit paise (rupees × 100) so the rest of the app is unchanged.
  const rupees = Math.floor(paise / 100);

  function handleKey(key: string) {
    if (key === "⌫") {
      onChange(Math.floor(rupees / 10) * 100);
      return;
    }
    const nextStr = rupees === 0 ? key : `${rupees}${key}`;
    const nextRupees = parseInt(nextStr, 10);
    if (!Number.isFinite(nextRupees) || nextRupees > 9_999_999) return; // cap ~₹1cr
    onChange(nextRupees * 100);
  }

  return (
    <div className="flex flex-col gap-4 px-4">
      {/* Display */}
      <div className="text-center">
        <span
          className="text-5xl font-medium tabular-nums"
          style={{ color: "var(--color-text-primary)", fontFamily: "var(--font-mono)", letterSpacing: -1 }}
        >
          {formatRupees(paise)}
        </span>
      </div>

      {/* Keypad */}
      <div className="flex flex-col gap-2">
        {KEYS.map((row, ri) => (
          <div key={ri} className="flex gap-2">
            {row.map((key) => (
              <button
                key={key}
                onClick={() => handleKey(key)}
                className="flex flex-1 items-center justify-center h-14 rounded-xl text-xl font-semibold active:opacity-60 transition-opacity"
                style={{
                  background: "var(--color-surface)",
                  color: key === "⌫" ? "var(--color-text-secondary)" : "var(--color-text-primary)",
                  fontSize: key === "⌫" ? 18 : 22,
                }}
              >
                {key}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
