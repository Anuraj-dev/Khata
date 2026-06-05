import type { ButtonHTMLAttributes, ReactNode, CSSProperties } from "react";

type Variant = "primary" | "secondary" | "ghost";

type Size = "sm" | "md";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  fullWidth?: boolean;
};

// Token-driven shared button. Variants share a 44px tap target, consistent
// radius, and motion; focus-visible is inherited from the global rule in
// index.css. Used by the marketing Landing CTAs and the AuthScreen Google
// button so both behave identically.
export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  leftIcon,
  fullWidth = false,
  disabled,
  children,
  style,
  className = "",
  ...rest
}: Props) {
  const base: CSSProperties = {
    minHeight: size === "sm" ? 38 : 44,
    borderRadius: "var(--radius-md)",
    fontWeight: 600,
    border: "none",
    cursor: disabled || loading ? "default" : "pointer",
    transition:
      "transform var(--dur-fast) var(--ease-out), background var(--dur-fast), opacity var(--dur-fast)",
  };
  const sizeCls = size === "sm" ? "gap-1.5 px-3.5 py-2 text-sm" : "gap-2.5 px-5 py-3 text-sm";

  const variants: Record<Variant, CSSProperties> = {
    primary: {
      background: "var(--gradient-accent)",
      color: "var(--color-bg)",
      boxShadow: "var(--shadow-accent-soft)",
    },
    secondary: {
      background: "var(--color-surface-elevated)",
      color: "var(--color-text-primary)",
      border: "1px solid var(--color-border-default)",
    },
    ghost: {
      background: "transparent",
      color: "var(--color-accent)",
    },
  };

  return (
    <button
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center ${sizeCls} ${
        fullWidth ? "w-full" : ""
      } ${loading ? "" : "active:scale-[0.97]"} disabled:opacity-60 ${className}`}
      style={{ ...base, ...variants[variant], ...style }}
      {...rest}
    >
      {loading ? (
        <span
          className="w-5 h-5 rounded-full border-2 animate-spin"
          style={{ borderColor: "currentColor", borderTopColor: "transparent" }}
          aria-hidden="true"
        />
      ) : (
        leftIcon
      )}
      {children}
    </button>
  );
}
