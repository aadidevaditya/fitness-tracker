import { format, startOfWeek } from "date-fns";

export function utcTodayString(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function toDateKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

export function startOfUtcWeekMonday(date = new Date()): Date {
  return startOfWeek(date, { weekStartsOn: 1 });
}
