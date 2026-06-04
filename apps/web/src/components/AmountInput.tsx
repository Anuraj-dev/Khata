import { formatRupees } from "../lib/dates";

const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [".", "0", "⌫"],
] as const;

type Props = {
  paise: number;
  onChange: (paise: number) => void;
};

export function AmountInput({ paise, onChange }: Props) {
  function handleKey(key: string) {
    if (key === "⌫") {
      const str = paise.toString().padStart(3, "0");
      const next = str.slice(0, -1).padStart(1, "0");
      onChange(parseInt(next, 10));
      return;
    }
    if (key === ".") return;
    const current = paise.toString();
    const next = current + key;
    if (next.length > 8) return;
    onChange(parseInt(next, 10));
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
