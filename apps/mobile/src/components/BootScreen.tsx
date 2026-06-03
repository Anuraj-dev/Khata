import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, spacing, typography } from "../theme/tokens";

export function BootScreen({ detail }: { detail?: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.wordmark}>Khata</Text>
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  wordmark: {
    color: colors.textPrimary,
    fontFamily: fonts.sansBold,
    fontSize: 32,
    letterSpacing: -0.8,
  },
  detail: {
    ...typography.micro,
    color: colors.textMuted,
  },
});
