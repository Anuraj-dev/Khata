// The Khata logo mark: a rounded tile with the amber-gradient ₹, mirroring the
// app/install icon (public/favicon.svg) so the brand is consistent everywhere
// it appears in-app. Crisp at small sizes (no heavy blur) unlike the favicon.
export function BrandMark({ size = 28 }: { size?: number }) {
  const id = "khata-rupee";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Khata logo"
      style={{ display: "block", flexShrink: 0 }}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="46" height="46" rx="13" fill="#141206" stroke="var(--color-accent-border)" />
      <text
        x="50%"
        y="50%"
        dy="0.34em"
        textAnchor="middle"
        fontFamily="'Geist','Noto Sans',system-ui,sans-serif"
        fontWeight="700"
        fontSize="30"
        fill={`url(#${id})`}
      >
        ₹
      </text>
    </svg>
  );
}
