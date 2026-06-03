import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, spacing } from "../theme/tokens";
import { haptic } from "../lib/haptic";
import type { Tab } from "../hooks/useWorkspaceState";

const TABS: { id: Tab; label: string }[] = [
  { id: "expenses", label: "Expenses" },
  { id: "trips", label: "Trips" },
  { id: "insights", label: "Insights" },
];

type Props = {
  active: Tab;
  onChange: (tab: Tab) => void;
  bottomInset: number;
};

export function BottomTabBar({ active, onChange, bottomInset }: Props) {
  return (
    <View style={[styles.container, { paddingBottom: bottomInset }]}>
      {TABS.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Pressable
            key={tab.id}
            onPress={() => {
              if (!isActive) {
                haptic.selection();
                onChange(tab.id);
              }
            }}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.label}
            hitSlop={12}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>{tab.label}</Text>
            {isActive ? <View style={styles.indicator} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderSubtle,
    backgroundColor: colors.bg,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.sm,
    gap: 4,
  },
  label: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  labelActive: {
    color: colors.accent,
    fontFamily: fonts.sansSemibold,
  },
  indicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
});
