import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, spacing, typography } from "../theme/tokens";

type Props = {
  canGoogleSignIn: boolean;
  isSigningIn: boolean;
  onGoogleSignIn: () => void;
};

export function MobileAuthScreen({ canGoogleSignIn, isSigningIn, onGoogleSignIn }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.wordmark}>Khata</Text>
        <Text style={styles.tagline}>Your money, tracked.</Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={onGoogleSignIn}
          disabled={!canGoogleSignIn || isSigningIn}
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          accessibilityRole="button"
          accessibilityLabel="Sign in with Google"
        >
          {isSigningIn ? (
            <ActivityIndicator color={colors.textInverse} size="small" />
          ) : (
            <Text style={styles.buttonText}>Continue with Google</Text>
          )}
        </Pressable>

        <Text style={styles.hint}>
          UPI transactions are read on-device only.{"\n"}Nothing is shared without your approval.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.xxl,
    justifyContent: "space-between",
    paddingTop: 120,
    paddingBottom: 60,
  },
  hero: { gap: spacing.md },
  wordmark: {
    fontFamily: fonts.sansBold,
    fontSize: 48,
    letterSpacing: -1.5,
    color: colors.textPrimary,
  },
  tagline: {
    ...typography.bodyLg,
    color: colors.textSecondary,
  },
  actions: { gap: spacing.lg },
  button: {
    backgroundColor: colors.accent,
    height: 52,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: { opacity: 0.85 },
  buttonText: {
    fontFamily: fonts.sansSemibold,
    fontSize: 16,
    color: colors.textInverse,
  },
  hint: {
    ...typography.micro,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 18,
  },
});
