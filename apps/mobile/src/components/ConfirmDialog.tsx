import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { colors, fonts, radii, spacing, typography } from "../theme/tokens";

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = "Confirm",
  destructive = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [styles.btn, styles.cancel, pressed && styles.pressed]}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.btn,
                destructive ? styles.destructive : styles.confirm,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.confirmText, destructive && styles.destructiveText]}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xxl,
  },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.xl,
    padding: spacing.xxl,
    width: "100%",
    gap: spacing.md,
  },
  title: { ...typography.title, color: colors.textPrimary },
  message: { ...typography.bodyMd, color: colors.textSecondary },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  cancel: { backgroundColor: colors.surface },
  confirm: { backgroundColor: colors.accent },
  destructive: { backgroundColor: colors.errorDim },
  cancelText: { fontFamily: fonts.sansMedium, fontSize: 15, color: colors.textSecondary },
  confirmText: { fontFamily: fonts.sansSemibold, fontSize: 15, color: colors.textInverse },
  destructiveText: { color: colors.error },
  pressed: { opacity: 0.8 },
});
