import { RefreshControl, SectionList, StyleSheet, Text, View } from "react-native";
import { useEffect, useState } from "react";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { colors, fonts, spacing } from "../theme/tokens";
import { formatRupees } from "../lib/dates";
import { useExpenseList } from "../hooks/useExpenseList";
import { useExpenseQueries } from "../hooks/useExpenseQueries";
import { ExpenseCard } from "../components/ExpenseCard";
import { DaySectionHeader } from "../components/DaySectionHeader";
import { EmptyExpenses } from "../components/EmptyExpenses";
import { expenseStore, type LocalExpense } from "../lib/expenseStorage";

type Props = {
  isAuthenticated: boolean;
  onAddPress?: () => void;
};

export function ExpensesScreen({ isAuthenticated, onAddPress }: Props) {
  const { sections, isEmpty, isHydrated, todayDebit, todayCredit } = useExpenseList();
  const { recentExpenses, isRecentLoading } = useExpenseQueries({ isAuthenticated });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || isRecentLoading) return;
    const serverExpenses: LocalExpense[] = recentExpenses.map((expense: Doc<"expenses">) => ({
      id: expense.clientId,
      amount: expense.amount,
      note: expense.note,
      category: expense.category as LocalExpense["category"],
      source: expense.source,
      direction: expense.direction,
      upiRef: expense.upiRef,
      party: expense.party,
      date: expense.date,
      createdAt: expense._creationTime,
      syncedId: expense._id,
    }));
    expenseStore._syncFromServer(serverExpenses);
  }, [isAuthenticated, isRecentLoading, recentExpenses]);

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }

  if (isEmpty && (!isHydrated || (isAuthenticated && isRecentLoading))) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading expenses...</Text>
      </View>
    );
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
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.textMuted },
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
