import { useEffect, type ReactNode } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
};

// Reusable slide-up bottom sheet (backdrop + handle + optional title).
export function Sheet({ open, onClose, title, children }: Props) {
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 z-40 transition-opacity duration-200"
        style={{ background: "rgba(0,0,0,0.55)", opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none" }}
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 flex flex-col gap-4 pt-3 transition-transform duration-300"
        style={{
          background: "var(--color-surface-elevated)",
          transform: open ? "translateY(0)" : "translateY(110%)",
          transitionTimingFunction: "var(--ease-out)",
          borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
          borderTop: "1px solid var(--color-border-subtle)",
          boxShadow: "var(--shadow-elevated)",
          paddingBottom: "max(2rem, env(safe-area-inset-bottom, 0px) + 1rem)",
          maxHeight: "92dvh",
          overflowY: "auto",
        }}
      >
        <div
          className="self-center w-10 h-1"
          style={{ background: "var(--color-border-default)", borderRadius: "var(--radius-pill)" }}
        />
        {title && (
          <h2 className="px-4 text-base font-semibold" style={{ color: "var(--color-text-primary)" }}>
            {title}
          </h2>
        )}
        {children}
      </div>
    </>
  );
}
