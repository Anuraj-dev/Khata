import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, spacing, typography } from "../theme/tokens";

type Props = { onAdd: () => void };

export function EmptyExpenses({ onAdd }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>₹</Text>
      <Text style={styles.title}>No expenses yet</Text>
      <Text style={styles.sub}>Tap + to log your first expense</Text>
      <Text onPress={onAdd} style={styles.cta}>
        Add expense
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingBottom: 80,
  },
  icon: {
    fontSize: 48,
    color: colors.accentDim,
    fontFamily: fonts.sansBold,
    marginBottom: spacing.sm,
  },
  title: {
    fontFamily: fonts.sansSemibold,
    fontSize: 18,
    color: colors.textSecondary,
  },
  sub: {
    ...typography.bodyMd,
    color: colors.textMuted,
  },
  cta: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.accent,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
});
