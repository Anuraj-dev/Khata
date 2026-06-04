import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="flex flex-col items-center justify-center h-full gap-4 px-6 text-center"
          style={{ background: "var(--color-bg)" }}
        >
          <span style={{ color: "var(--color-error)", fontSize: 32 }}>⚠</span>
          <p style={{ color: "var(--color-text-primary)" }} className="font-medium">
            Something went wrong
          </p>
          <p style={{ color: "var(--color-text-secondary)" }} className="text-sm">
            {this.state.error.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm px-4 py-2 rounded-lg"
            style={{
              background: "var(--color-surface-elevated)",
              color: "var(--color-text-primary)",
              border: "1px solid var(--color-border-default)",
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
