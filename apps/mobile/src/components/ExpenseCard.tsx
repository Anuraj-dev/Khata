import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radii, spacing, typography } from "../theme/tokens";
import { formatRupees } from "../lib/dates";
import type { LocalExpense, ExpenseCategory } from "../lib/expenseStorage";

const CATEGORY_ICON: Record<ExpenseCategory, string> = {
  food: "🍜",
  travel: "✈️",
  shopping: "🛍️",
  bills: "🧾",
  health: "💊",
  other: "•",
};

const CATEGORY_COLOR: Record<ExpenseCategory, string> = {
  food: colors.food,
  travel: colors.travel,
  shopping: colors.shopping,
  bills: colors.bills,
  health: colors.health,
  other: colors.other,
};

type Props = {
  expense: LocalExpense;
  onPress?: () => void;
  onLongPress?: () => void;
};

export function ExpenseCard({ expense, onPress, onLongPress }: Props) {
  const isDebit = expense.direction === "debit";
  const amountColor = isDebit ? colors.debit : colors.credit;
  const amountPrefix = isDebit ? "−" : "+";
  const catColor = CATEGORY_COLOR[expense.category];
  const icon = CATEGORY_ICON[expense.category];

  const timeStr = new Date(expense.createdAt).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {/* Category dot */}
      <View style={[styles.iconDot, { backgroundColor: catColor + "22" }]}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>

      {/* Note + meta */}
      <View style={styles.middle}>
        <Text style={styles.note} numberOfLines={1}>
          {expense.note || expense.category}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {expense.party ? `${expense.party} · ` : ""}
          {timeStr}
          {expense.upiRef ? ` · ${expense.upiRef}` : ""}
        </Text>
      </View>

      {/* Amount */}
      <Text style={[styles.amount, { color: amountColor }]}>
        {amountPrefix}
        {formatRupees(expense.amount)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.rowY,
    gap: spacing.md,
  },
  pressed: { opacity: 0.7 },
  iconDot: {
    width: 40,
    height: 40,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  iconText: { fontSize: 18 },
  middle: { flex: 1, gap: 2 },
  note: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.textPrimary,
  },
  meta: {
    ...typography.micro,
    color: colors.textMuted,
    textTransform: "none",
    letterSpacing: 0,
    fontSize: 11,
  },
  amount: {
    fontFamily: fonts.monoMedium,
    fontSize: 15,
    letterSpacing: -0.3,
  },
});
