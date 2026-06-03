import { Pressable, StyleSheet, Text } from "react-native";
import { colors, fonts } from "../theme/tokens";
import { haptic } from "../lib/haptic";

type Props = {
  onPress: () => void;
  bottom: number;
  label?: string;
};

export function FAB({ onPress, bottom, label = "Add" }: Props) {
  return (
    <Pressable
      onPress={() => {
        haptic.medium();
        onPress();
      }}
      style={({ pressed }) => [styles.fab, { bottom }, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.label}>+ {label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 20,
    backgroundColor: colors.accent,
    paddingHorizontal: 20,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  label: {
    fontFamily: fonts.sansSemibold,
    fontSize: 15,
    color: colors.textInverse,
    letterSpacing: -0.2,
  },
});
