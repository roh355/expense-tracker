import { PrismaClient } from '@prisma/client';
import {
  AnalyticsRange,
  MonthlyPeriod,
  daysBetween,
  endOfDay,
  formatDateLocal,
  getAnalyticsRange,
  getCurrentMonthRange,
  getGranularity,
  getMonday,
  getMonthlyPeriod,
  startOfDay,
} from '../utils/dateRanges';
import { getUserConfig } from './config';

function toNumber(amount: unknown): number {
  return Number(amount);
}

export async function getSummary(
  prisma: PrismaClient,
  userId: string,
  range: AnalyticsRange
) {
  const { from, to } = getAnalyticsRange(range);
  const config = await getUserConfig(prisma, userId);
  const categoryMap = new Map(config.categories.map((c) => [c.id, c]));

  const expenses = await prisma.expense.findMany({
    where: { userId, date: { gte: from, lte: to } },
  });

  let totalExpenditure = 0;
  let totalIncome = 0;
  const breakdownMap = new Map<string, number>();

  for (const e of expenses) {
    const amt = toNumber(e.amount);
    if (e.type === 'EXPENSE') {
      totalExpenditure += amt;
      breakdownMap.set(e.categoryId, (breakdownMap.get(e.categoryId) ?? 0) + amt);
    } else {
      totalIncome += amt;
    }
  }

  const categoryBreakdown = Array.from(breakdownMap.entries())
    .map(([categoryId, total]) => {
      const cat = categoryMap.get(categoryId);
      return {
        categoryId,
        name: cat?.name ?? 'Unknown',
        color: cat?.color ?? '#6b7280',
        total,
      };
    })
    .sort((a, b) => b.total - a.total);

  const result: Record<string, unknown> = {
    range,
    from: formatDateLocal(from),
    to: formatDateLocal(to),
    totalExpenditure,
    totalIncome,
    categoryBreakdown,
  };

  if (config.monthlyBudget !== null) {
    const monthRange = getCurrentMonthRange();
    const monthExpenses = await prisma.expense.findMany({
      where: {
        userId,
        type: 'EXPENSE',
        date: { gte: monthRange.from, lte: monthRange.to },
      },
    });
    const currentMonthSpend = monthExpenses.reduce((s, e) => s + toNumber(e.amount), 0);
    const budgetUsedPercent =
      config.monthlyBudget > 0
        ? Math.round((currentMonthSpend / config.monthlyBudget) * 10000) / 100
        : 0;

    result.monthlyBudget = config.monthlyBudget;
    result.currentMonthSpend = currentMonthSpend;
    result.budgetUsedPercent = budgetUsedPercent;
  }

  return result;
}

export async function getDaily(
  prisma: PrismaClient,
  userId: string,
  range: AnalyticsRange
) {
  const { from, to } = getAnalyticsRange(range);
  const granularity = getGranularity(from, to);

  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      type: 'EXPENSE',
      date: { gte: from, lte: to },
    },
  });

  const bucketTotals = new Map<string, number>();

  for (const e of expenses) {
    const local = formatDateLocal(e.date);
    let key: string;
    if (granularity === 'day') {
      key = local;
    } else if (granularity === 'week') {
      key = formatDateLocal(getMonday(e.date));
    } else {
      key = local.slice(0, 7);
    }
    bucketTotals.set(key, (bucketTotals.get(key) ?? 0) + toNumber(e.amount));
  }

  const points: { date: string; total: number }[] = [];
  const cur = startOfDay(new Date(from));

  if (granularity === 'day') {
    const end = startOfDay(new Date(to));
    while (cur <= end) {
      const key = formatDateLocal(cur);
      points.push({ date: key, total: bucketTotals.get(key) ?? 0 });
      cur.setDate(cur.getDate() + 1);
    }
  } else if (granularity === 'week') {
    let weekStart = getMonday(from);
    const end = endOfDay(to);
    while (weekStart <= end) {
      const key = formatDateLocal(weekStart);
      points.push({ date: key, total: bucketTotals.get(key) ?? 0 });
      weekStart = new Date(weekStart);
      weekStart.setDate(weekStart.getDate() + 7);
    }
  } else {
    cur.setDate(1);
    const end = new Date(to.getFullYear(), to.getMonth(), 1);
    while (cur <= end) {
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
      points.push({ date: key, total: bucketTotals.get(key) ?? 0 });
      cur.setMonth(cur.getMonth() + 1);
    }
  }

  return {
    range,
    from: formatDateLocal(from),
    to: formatDateLocal(to),
    granularity,
    points,
  };
}

export async function getMonthly(
  prisma: PrismaClient,
  userId: string,
  period: MonthlyPeriod
) {
  const { from, to } = getMonthlyPeriod(period);
  const config = await getUserConfig(prisma, userId);

  const expenses = await prisma.expense.findMany({
    where: {
      userId,
      type: 'EXPENSE',
      date: { gte: from, lte: to },
    },
  });

  const monthMap = new Map<string, number>();
  for (const e of expenses) {
    const key = formatDateLocal(e.date).slice(0, 7);
    monthMap.set(key, (monthMap.get(key) ?? 0) + toNumber(e.amount));
  }

  const months: {
    month: string;
    spend: number;
    budget: number | null;
    overBudget: boolean;
  }[] = [];

  const cur = new Date(from.getFullYear(), from.getMonth(), 1);
  const endMonth = new Date(to.getFullYear(), to.getMonth(), 1);

  while (cur <= endMonth) {
    const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`;
    const spend = monthMap.get(key) ?? 0;
    const budget = config.monthlyBudget;
    months.push({
      month: key,
      spend,
      budget,
      overBudget: budget !== null && spend > budget,
    });
    cur.setMonth(cur.getMonth() + 1);
  }

  return {
    period,
    monthlyBudget: config.monthlyBudget,
    months,
  };
}
