function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export function formatDayNumber(n: number): string {
  const rounded = round(n);
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ",");
}

export function formatDays(n: number): string {
  return `${formatDayNumber(n)} jour${Math.abs(round(n)) >= 2 ? "s" : ""}`;
}
