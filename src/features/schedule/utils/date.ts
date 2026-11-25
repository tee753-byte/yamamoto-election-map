const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function todayInTokyo(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function parseDateOnly(value: string): Date {
  const match = DATE_PATTERN.exec(value);
  if (!match) throw new Error(`日付形式が不正です: ${value}`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(value: string, days: number): string {
  const date = parseDateOnly(value);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateOnly(date);
}

export function addMonths(value: string, months: number): string {
  const date = parseDateOnly(`${value.slice(0, 7)}-01`);
  date.setUTCMonth(date.getUTCMonth() + months);
  return formatDateOnly(date).slice(0, 7);
}

export function monthDays(month: string): string[] {
  const first = parseDateOnly(`${month}-01`);
  const firstVisible = new Date(first);
  firstVisible.setUTCDate(firstVisible.getUTCDate() - firstVisible.getUTCDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstVisible);
    date.setUTCDate(date.getUTCDate() + index);
    return formatDateOnly(date);
  });
}

export function isDateWithin(date: string, start: string, end: string | null) {
  return date >= start && date <= (end ?? start);
}

export function formatJapaneseDate(value: string, withYear = false): string {
  const date = parseDateOnly(value);
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "UTC",
    ...(withYear ? { year: "numeric" as const } : {}),
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(date);
}

export function formatMonthTitle(month: string): string {
  const date = parseDateOnly(`${month}-01`);
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
  }).format(date);
}

export function compactTime(value: string | null) {
  return value?.slice(0, 5) ?? null;
}
