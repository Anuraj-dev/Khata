import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, spacing, typography } from "../theme/tokens";
import { formatRupees } from "../lib/dates";

type Props = {
  label: string;
  totalDebit: number;
  totalCredit: number;
};

export function DaySectionHeader({ label, totalDebit, totalCredit }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.totals}>
        {totalCredit > 0 ? (
          <Text style={styles.credit}>+{formatRupees(totalCredit)}</Text>
        ) : null}
        {totalDebit > 0 ? (
          <Text style={styles.debit}>−{formatRupees(totalDebit)}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
  },
  label: {
    fontFamily: fonts.sansSemibold,
    fontSize: 13,
    color: colors.textSecondary,
    letterSpacing: 0.2,
  },
  totals: {
    flexDirection: "row",
    gap: spacing.md,
  },
  debit: {
    fontFamily: fonts.monoMedium,
    fontSize: 12,
    color: colors.debit + "cc",
  },
  credit: {
    fontFamily: fonts.monoMedium,
    fontSize: 12,
    color: colors.credit + "cc",
  },
});
