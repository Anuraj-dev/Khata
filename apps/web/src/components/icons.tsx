// Shared inline SVG icons (stroke = currentColor) used across screens. Keeping
// UI chrome as SVG rather than emoji per the design guidelines. Data emojis
// (category / trip-expense emoji the user picks) are intentionally left alone.

type IconProps = { size?: number; className?: string; strokeWidth?: number };

function base(size = 22, strokeWidth = 1.8) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
}

export function LuggageIcon({ size, className, strokeWidth }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <rect x="5" y="7" width="14" height="14" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M9 11v6M15 11v6" />
    </svg>
  );
}

export function ChevronRight({ size, className, strokeWidth }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function ChevronLeft({ size, className, strokeWidth }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

export function PlusIcon({ size, className, strokeWidth }: IconProps) {
  return (
    <svg {...base(size, strokeWidth ?? 2.2)} className={className}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export function MailIcon({ size, className, strokeWidth }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}

export function EyeIcon({ size, className, strokeWidth }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function LinkOffIcon({ size, className, strokeWidth }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <path d="M9 17H7A5 5 0 0 1 7 7h2M15 7h2a5 5 0 0 1 3.5 8.5M3 3l18 18" />
    </svg>
  );
}

export function CheckCircleIcon({ size, className, strokeWidth }: IconProps) {
  return (
    <svg {...base(size, strokeWidth)} className={className}>
      <path d="M12 3a9 9 0 1 0 9 9" />
      <path d="M9 11l3 3L22 4" />
    </svg>
  );
}
