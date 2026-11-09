// lib/utils/date.ts
// Date formatting helpers for Indonesian locale

import {
  format,
  formatDistanceToNow,
  isToday,
  isYesterday,
  startOfMonth,
  endOfMonth,
  subMonths,
} from "date-fns";
import { id as localeId } from "date-fns/locale";

/** "Sabtu, 7 November 2026" */
export function formatFullDate(date: string | Date): string {
  return format(new Date(date), "EEEE, d MMMM yyyy", { locale: localeId });
}

/** "06 Nov 2026" */
export function formatShortDate(date: string | Date): string {
  return format(new Date(date), "dd MMM yyyy", { locale: localeId });
}

/** "14:30 WIB" */
export function formatTime(date: string | Date): string {
  return format(new Date(date), "HH:mm") + " WIB";
}

/** "November 2026 (Bulan Ini)" or "Oktober 2026" */
export function formatMonthLabel(date: string | Date, markCurrent = true): string {
  const label = format(new Date(date), "MMMM yyyy", { locale: localeId });
  if (markCurrent && isCurrentMonth(date)) return `${label} (Bulan Ini)`;
  return label;
}

/** Relative: "Hari ini", "Kemarin", "3 hari lalu" */
export function formatRelativeDay(date: string | Date): string {
  const d = new Date(date);
  if (isToday(d)) return "Hari Ini";
  if (isYesterday(d)) return "Kemarin";
  return formatDistanceToNow(d, { addSuffix: true, locale: localeId });
}

/** Group header for transaction list: "Hari Ini, 06 November 2026" */
export function formatDayHeader(date: string | Date): string {
  const d = new Date(date);
  if (isToday(d)) return `Hari Ini, ${format(d, "dd MMMM yyyy", { locale: localeId })}`;
  if (isYesterday(d)) return `Kemarin, ${format(d, "dd MMMM yyyy", { locale: localeId })}`;
  return format(d, "dd MMMM yyyy", { locale: localeId });
}

export function isCurrentMonth(date: string | Date): boolean {
  const now = new Date();
  const d = new Date(date);
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export function getCurrentMonthRange() {
  const now = new Date();
  return {
    start: startOfMonth(now).toISOString(),
    end: endOfMonth(now).toISOString(),
  };
}

export function getPreviousMonthRange() {
  const prev = subMonths(new Date(), 1);
  return {
    start: startOfMonth(prev).toISOString(),
    end: endOfMonth(prev).toISOString(),
  };
}

