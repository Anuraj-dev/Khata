import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radii, spacing } from "../theme/tokens";
import type { ExpenseCategory } from "../lib/expenseStorage";

const CATEGORIES: { value: ExpenseCategory; label: string; icon: string }[] = [
  { value: "food", label: "Food", icon: "🍜" },
  { value: "travel", label: "Travel", icon: "✈️" },
  { value: "shopping", label: "Shopping", icon: "🛍️" },
  { value: "bills", label: "Bills", icon: "🧾" },
  { value: "health", label: "Health", icon: "💊" },
  { value: "other", label: "Other", icon: "•" },
];

const CAT_COLOR: Record<ExpenseCategory, string> = {
  food: colors.food,
  travel: colors.travel,
  shopping: colors.shopping,
  bills: colors.bills,
  health: colors.health,
  other: colors.other,
};

type Props = {
  value: ExpenseCategory;
  onChange: (cat: ExpenseCategory) => void;
};

export function CategoryPicker({ value, onChange }: Props) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.track}
    >
      {CATEGORIES.map((cat) => {
        const active = cat.value === value;
        const catColor = CAT_COLOR[cat.value];
        return (
          <Pressable
            key={cat.value}
            onPress={() => onChange(cat.value)}
            style={[
              styles.chip,
              active
                ? { backgroundColor: catColor + "33", borderColor: catColor }
                : { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
            ]}
          >
            <Text style={styles.chipIcon}>{cat.icon}</Text>
            <Text
              style={[
                styles.chipLabel,
                { color: active ? catColor : colors.textSecondary },
              ]}
            >
              {cat.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  chipIcon: { fontSize: 14 },
  chipLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 13,
  },
});
