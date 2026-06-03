import { Component, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, typography } from "../theme/tokens";

type Props = { children: ReactNode; screenName: string };
type State = { error: Error | null };

export class ScreenErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.container}>
          <Text style={styles.label}>{this.props.screenName} failed to load</Text>
          <Text style={styles.message}>{this.state.error.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 8,
  },
  label: { ...typography.micro, color: colors.textMuted },
  message: { ...typography.bodyMd, color: colors.textSecondary, textAlign: "center" },
});
