import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts, radii, spacing, typography } from "../theme/tokens";
import { todayIso } from "../lib/dates";
import { expenseStore, type ExpenseCategory, type ExpenseDirection } from "../lib/expenseStorage";
import { AmountInput } from "./AmountInput";
import { CategoryPicker } from "./CategoryPicker";

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (draft: {
    amount: number;
    note: string;
    category: ExpenseCategory;
    direction: ExpenseDirection;
    date: string;
  }) => Promise<boolean>;
};

const SCREEN_HEIGHT = Dimensions.get("window").height;

export function AddExpenseSheet({ visible, onClose, onSave }: Props) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const [paise, setPaise] = useState(0);
  const [note, setNote] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("other");
  const [direction, setDirection] = useState<ExpenseDirection>("debit");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 22,
        stiffness: 280,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  function reset() {
    setPaise(0);
    setNote("");
    setCategory("other");
    setDirection("debit");
    setIsSaving(false);
  }

  async function handleSave() {
    if (paise === 0) return;
    setIsSaving(true);
    const saved = await onSave({ amount: paise, note, category, direction, date: todayIso() });
    if (saved) {
      void expenseStore.add({ amount: paise, note, category, direction, date: todayIso() });
      reset();
      onClose();
    } else {
      setIsSaving(false);
    }
  }

  const canSave = paise > 0 && !isSaving;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      <Animated.View
        style={[
          styles.sheet,
          { paddingBottom: insets.bottom + spacing.xl },
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Handle */}
        <View style={styles.handle} />

        {/* Direction toggle */}
        <View style={styles.dirRow}>
          <Pressable
            style={[styles.dirBtn, direction === "debit" && styles.dirBtnDebit]}
            onPress={() => setDirection("debit")}
          >
            <Text style={[styles.dirText, direction === "debit" && { color: colors.debit }]}>
              Spent
            </Text>
          </Pressable>
          <Pressable
            style={[styles.dirBtn, direction === "credit" && styles.dirBtnCredit]}
            onPress={() => setDirection("credit")}
          >
            <Text style={[styles.dirText, direction === "credit" && { color: colors.credit }]}>
              Received
            </Text>
          </Pressable>
        </View>

        {/* Amount keypad */}
        <AmountInput paise={paise} onChange={setPaise} />

        {/* Note input */}
        <TextInput
          style={styles.noteInput}
          placeholder="What was this for?"
          placeholderTextColor={colors.textMuted}
          value={note}
          onChangeText={setNote}
          returnKeyType="done"
          maxLength={80}
        />

        {/* Category picker */}
        <CategoryPicker value={category} onChange={setCategory} />

        {/* Save button */}
        <Pressable
          onPress={() => void handleSave()}
          disabled={!canSave}
          style={({ pressed }) => [
            styles.saveBtn,
            !canSave && styles.saveBtnDisabled,
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.saveBtnText, !canSave && styles.saveBtnTextDisabled]}>
            {isSaving ? "Saving…" : direction === "debit" ? "Log Expense" : "Log Income"}
          </Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surfaceElevated,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingTop: spacing.sm,
    gap: spacing.lg,
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: radii.full,
    backgroundColor: colors.borderDefault,
    marginBottom: spacing.sm,
  },
  dirRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  dirBtn: {
    flex: 1,
    height: 40,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  dirBtnDebit: {
    borderColor: colors.debit + "66",
    backgroundColor: colors.debit + "11",
  },
  dirBtnCredit: {
    borderColor: colors.credit + "66",
    backgroundColor: colors.credit + "11",
  },
  dirText: {
    fontFamily: fonts.sansSemibold,
    fontSize: 14,
    color: colors.textSecondary,
  },
  noteInput: {
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    fontFamily: fonts.sansRegular,
    fontSize: 15,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
  },
  saveBtn: {
    marginHorizontal: spacing.lg,
    height: 52,
    backgroundColor: colors.accent,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnDisabled: {
    backgroundColor: colors.surface,
  },
  saveBtnText: {
    fontFamily: fonts.sansBold,
    fontSize: 16,
    color: colors.textInverse,
  },
  saveBtnTextDisabled: {
    color: colors.textMuted,
  },
  pressed: { opacity: 0.85 },
});
