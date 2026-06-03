import { RefreshControl, SectionList, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { colors, fonts, spacing } from "../theme/tokens";
import { formatRupees } from "../lib/dates";
import { useExpenseList } from "../hooks/useExpenseList";
import { ExpenseCard } from "../components/ExpenseCard";
import { DaySectionHeader } from "../components/DaySectionHeader";
import { EmptyExpenses } from "../components/EmptyExpenses";
import type { LocalExpense } from "../lib/expenseStorage";

type Props = {
  onAddPress?: () => void;
};

export function ExpensesScreen({ onAddPress }: Props) {
  const { sections, isEmpty, todayDebit, todayCredit } = useExpenseList();
  const [refreshing, setRefreshing] = useState(false);

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }

  if (isEmpty) {
    return <EmptyExpenses onAdd={onAddPress ?? (() => {})} />;
  }

  return (
    <View style={styles.container}>
      {/* Today summary bar */}
      {(todayDebit > 0 || todayCredit > 0) && (
        <View style={styles.summaryBar}>
          {todayDebit > 0 ? (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Today's spend</Text>
              <Text style={[styles.summaryAmount, { color: colors.debit }]}>
                {formatRupees(todayDebit)}
              </Text>
            </View>
          ) : null}
          {todayCredit > 0 ? (
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Received</Text>
              <Text style={[styles.summaryAmount, { color: colors.credit }]}>
                {formatRupees(todayCredit)}
              </Text>
            </View>
          ) : null}
        </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(item: LocalExpense) => item.id}
        renderItem={({ item }) => <ExpenseCard expense={item} />}
        renderSectionHeader={({ section }) => (
          <DaySectionHeader
            label={section.label}
            totalDebit={section.totalDebit}
            totalCredit={section.totalCredit}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.accent}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryBar: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.xxl,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSubtle,
  },
  summaryItem: { gap: 2 },
  summaryLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  summaryAmount: {
    fontFamily: fonts.monoMedium,
    fontSize: 20,
    letterSpacing: -0.5,
  },
  list: {
    paddingBottom: 120,
  },
});
