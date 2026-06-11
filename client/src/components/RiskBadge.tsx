export type RiskLabel =
  | "Stable"
  | "Warning"
  | "Risky"
  | "Critical"
  | "Safe to Ship"
  | "Fix First"
  | "Do Not Ship";

export function RiskBadge({ label }: { label: RiskLabel }) {
  return <span className={`risk-badge risk-${toClassName(label)}`}>{label}</span>;
}

function toClassName(value: string) {
  return value.toLowerCase().replace(/\s+/g, "-");
}
