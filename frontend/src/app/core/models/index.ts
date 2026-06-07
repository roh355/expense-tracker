export type TransactionType = 'EXPENSE' | 'INCOME';

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  type: TransactionType;
}

export interface UserConfig {
  categories: Category[];
  monthlyBudget: number | null;
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  description: string;
  date: string;
  createdAt: string;
}

export interface TransactionListResponse {
  items: Transaction[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type AnalyticsRange = 'this_month' | '7d' | '1m' | '3m' | 'all';
export type MonthlyPeriod = 'current_year' | '1y' | '3y' | '5y' | 'all';

export interface AnalyticsSummary {
  range: AnalyticsRange;
  from: string;
  to: string;
  totalExpenditure: number;
  totalIncome: number;
  categoryBreakdown: { categoryId: string; name: string; color: string; total: number }[];
  monthlyBudget?: number;
  currentMonthSpend?: number;
  budgetUsedPercent?: number;
}

export interface DailyAnalytics {
  range: AnalyticsRange;
  from: string;
  to: string;
  granularity: 'day' | 'week' | 'month';
  points: { date: string; total: number }[];
}

export interface MonthlyAnalytics {
  period: MonthlyPeriod;
  monthlyBudget: number | null;
  months: { month: string; spend: number; budget: number | null; overBudget: boolean }[];
}
