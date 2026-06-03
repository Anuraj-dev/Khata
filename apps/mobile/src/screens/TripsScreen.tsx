import { StyleSheet, Text, View } from "react-native";
import { colors, typography } from "../theme/tokens";

export function TripsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Trips — coming in M4</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center" },
  placeholder: { ...typography.bodyMd, color: colors.textMuted },
});
