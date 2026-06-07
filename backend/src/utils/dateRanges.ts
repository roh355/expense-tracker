export type AnalyticsRange = 'this_month' | '7d' | '1m' | '3m' | 'all';
export type MonthlyPeriod = 'current_year' | '1y' | '3y' | '5y' | 'all';

export function formatDateLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function getAnalyticsRange(range: AnalyticsRange): { from: Date; to: Date } {
  const now = new Date();
  const to = endOfDay(now);

  switch (range) {
    case 'this_month':
      return { from: startOfDay(startOfMonth(now)), to };
    case '7d': {
      const from = startOfDay(new Date(now));
      from.setDate(from.getDate() - 6);
      return { from, to };
    }
    case '1m': {
      const from = startOfDay(new Date(now));
      from.setDate(from.getDate() - 29);
      return { from, to };
    }
    case '3m': {
      const from = startOfDay(new Date(now));
      from.setMonth(from.getMonth() - 3);
      return { from, to };
    }
    case 'all': {
      const from = startOfDay(new Date(now));
      from.setFullYear(from.getFullYear() - 6);
      return { from, to };
    }
  }
}

export function getMonthlyPeriod(period: MonthlyPeriod): { from: Date; to: Date } {
  const now = new Date();
  const to = endOfMonth(now);

  switch (period) {
    case 'current_year':
      return { from: startOfDay(new Date(now.getFullYear(), 0, 1)), to };
    case '1y': {
      const from = startOfDay(new Date(now));
      from.setFullYear(from.getFullYear() - 1);
      from.setDate(1);
      return { from, to };
    }
    case '3y': {
      const from = startOfDay(new Date(now));
      from.setFullYear(from.getFullYear() - 3);
      from.setDate(1);
      return { from, to };
    }
    case '5y': {
      const from = startOfDay(new Date(now));
      from.setFullYear(from.getFullYear() - 5);
      from.setDate(1);
      return { from, to };
    }
    case 'all': {
      const from = startOfDay(new Date(now));
      from.setFullYear(from.getFullYear() - 6);
      from.setDate(1);
      return { from, to };
    }
  }
}

export function getCurrentMonthRange(): { from: Date; to: Date } {
  const now = new Date();
  return { from: startOfDay(startOfMonth(now)), to: endOfDay(endOfMonth(now)) };
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function daysBetween(from: Date, to: Date): number {
  const ms = endOfDay(to).getTime() - startOfDay(from).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
}

export function getMonday(d: Date): Date {
  const r = startOfDay(new Date(d));
  const day = r.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  r.setDate(r.getDate() + diff);
  return r;
}

export type Granularity = 'day' | 'week' | 'month';

export function getGranularity(from: Date, to: Date): Granularity {
  const days = daysBetween(from, to);
  if (days <= 62) return 'day';
  if (days <= 400) return 'week';
  return 'month';
}
