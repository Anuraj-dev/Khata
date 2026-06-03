import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { colors, fonts, radii, spacing } from "../theme/tokens";
import { formatRupees } from "../lib/dates";

const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [".", "0", "⌫"],
];

type Props = {
  paise: number;
  onChange: (paise: number) => void;
};

export function AmountInput({ paise, onChange }: Props) {
  const displayStr = (paise / 100).toFixed(2);

  function handleKey(key: string) {
    if (key === "⌫") {
      const rupees = paise / 100;
      const str = rupees.toFixed(2).replace(".", "");
      const next = str.slice(0, -1).padStart(1, "0");
      onChange(Math.round(parseFloat(next.slice(0, -2) + "." + next.slice(-2)) * 100));
      return;
    }
    if (key === ".") return; // decimals handled implicitly
    const current = paise.toString().padStart(3, "0");
    const next = current + key;
    // Keep max 8 digits total (₹9,99,999.99)
    if (next.length > 8) return;
    onChange(parseInt(next, 10));
  }

  return (
    <View style={styles.container}>
      <Text style={styles.display}>
        {formatRupees(paise)}
      </Text>

      <View style={styles.keypad}>
        {KEYS.map((row, ri) => (
          <View key={ri} style={styles.row}>
            {row.map((key) => (
              <TouchableOpacity
                key={key}
                style={styles.key}
                onPress={() => handleKey(key)}
                activeOpacity={0.6}
              >
                <Text style={[styles.keyText, key === "⌫" && styles.keyDelete]}>
                  {key}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xl },
  display: {
    fontFamily: fonts.monoMedium,
    fontSize: 42,
    letterSpacing: -1,
    color: colors.textPrimary,
    textAlign: "center",
  },
  keypad: { gap: spacing.sm },
  row: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  key: {
    flex: 1,
    height: 56,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  keyText: {
    fontFamily: fonts.sansSemibold,
    fontSize: 22,
    color: colors.textPrimary,
  },
  keyDelete: {
    color: colors.textSecondary,
    fontSize: 20,
  },
});
