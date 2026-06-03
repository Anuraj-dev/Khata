const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function isIsoDate(value: string): boolean {
  return ISO_DATE_RE.test(value);
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

export function formatRupees(paise: number): string {
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function dateLabel(isoDate: string, today: string, tomorrow: string): string {
  if (isoDate === today) return "Today";
  if (isoDate === tomorrow) return "Tomorrow";
  if (isoDate < today) return "Overdue";
  return isoDate;
}

export function monthLabel(isoDate: string): string {
  const [year, month] = isoDate.split("-");
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleString("en-IN", { month: "long", year: "numeric" });
}
