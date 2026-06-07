import { PrismaClient } from '@prisma/client';
import { Category, KeysetCursor, OffsetCursor, TransactionItem, TransactionType } from '../types';
import { decodeCursor, encodeCursor } from '../utils/cursor';
import { getCurrentMonthRange, parseISODate } from '../utils/dateRanges';
import { getCategories } from './config';

export interface TransactionQueryParams {
  limit: number;
  cursor?: string;
  from?: string;
  to?: string;
  q?: string;
  type?: TransactionType;
  categoryId?: string;
  sort: string;
  order: 'asc' | 'desc';
}

export interface TransactionListResult {
  items: TransactionItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

function toNumber(amount: unknown): number {
  return Number(amount);
}

function toItem(expense: {
  id: string;
  amount: unknown;
  type: string;
  categoryId: string;
  description: string;
  date: Date;
  createdAt: Date;
}, category: Category | undefined): TransactionItem {
  return {
    id: expense.id,
    amount: toNumber(expense.amount),
    type: expense.type as TransactionType,
    categoryId: expense.categoryId,
    categoryName: category?.name ?? 'Unknown',
    categoryColor: category?.color ?? '#6b7280',
    description: expense.description,
    date: expense.date.toISOString(),
    createdAt: expense.createdAt.toISOString(),
  };
}

function matchesSearch(
  expense: { description: string; type: string; amount: unknown },
  category: Category | undefined,
  q: string
): boolean {
  const lower = q.toLowerCase();
  if (expense.description.toLowerCase().includes(lower)) return true;
  if (category?.name.toLowerCase().includes(lower)) return true;
  if (expense.type.toLowerCase() === lower) return true;
  if (lower === 'expense' && expense.type === 'EXPENSE') return true;
  if (lower === 'income' && expense.type === 'INCOME') return true;
  const amountStr = String(toNumber(expense.amount));
  if (amountStr.includes(lower)) return true;
  return false;
}

export async function queryTransactions(
  prisma: PrismaClient,
  userId: string,
  params: TransactionQueryParams
): Promise<TransactionListResult> {
  const categories = await getCategories(prisma, userId);
  const categoryMap = new Map(categories.map((c) => [c.id, c]));

  let from: Date;
  let to: Date;
  if (params.from && params.to) {
    from = parseISODate(params.from);
    to = parseISODate(params.to);
    to.setHours(23, 59, 59, 999);
  } else {
    const range = getCurrentMonthRange();
    from = range.from;
    to = range.to;
  }

  const where: Record<string, unknown> = {
    userId,
    date: { gte: from, lte: to },
  };
  if (params.type) where.type = params.type;
  if (params.categoryId) where.categoryId = params.categoryId;

  const expenses = await prisma.expense.findMany({ where, orderBy: { date: 'desc' } });

  let filtered = expenses;
  if (params.q) {
    filtered = expenses.filter((e) =>
      matchesSearch(e, categoryMap.get(e.categoryId), params.q!)
    );
  }

  const sort = params.sort;
  const order = params.order;
  const desc = order === 'desc';

  if (sort === 'category') {
    return paginateOffset(filtered, categories, categoryMap, params);
  }

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sort) {
      case 'amount':
        cmp = toNumber(a.amount) - toNumber(b.amount);
        break;
      case 'type':
        cmp = a.type.localeCompare(b.type);
        break;
      case 'description':
        cmp = a.description.localeCompare(b.description);
        break;
      case 'createdAt':
        cmp = a.createdAt.getTime() - b.createdAt.getTime();
        break;
      case 'date':
      default:
        cmp = a.date.getTime() - b.date.getTime();
        if (cmp === 0) cmp = a.createdAt.getTime() - b.createdAt.getTime();
        if (cmp === 0) cmp = a.id.localeCompare(b.id);
        break;
    }
    return desc ? -cmp : cmp;
  });

  let startIdx = 0;
  if (params.cursor) {
    const cursor = decodeCursor(params.cursor);
    if (cursor?.kind === 'keyset') {
      const c = cursor as KeysetCursor;
      const cDate = new Date(c.date).getTime();
      const cCreated = new Date(c.createdAt).getTime();
      startIdx = sorted.findIndex((e) => {
        const eDate = e.date.getTime();
        const eCreated = e.createdAt.getTime();
        if (desc) {
          return eDate < cDate || (eDate === cDate && eCreated < cCreated) ||
            (eDate === cDate && eCreated === cCreated && e.id < c.id);
        }
        return eDate > cDate || (eDate === cDate && eCreated > cCreated) ||
          (eDate === cDate && eCreated === cCreated && e.id > c.id);
      });
      if (startIdx === -1) startIdx = sorted.length;
    }
  }

  const page = sorted.slice(startIdx, startIdx + params.limit);
  const hasMore = startIdx + params.limit < sorted.length;

  let nextCursor: string | null = null;
  if (hasMore && page.length > 0) {
    const last = page[page.length - 1];
    nextCursor = encodeCursor({
      kind: 'keyset',
      date: last.date.toISOString(),
      createdAt: last.createdAt.toISOString(),
      id: last.id,
    });
  }

  return {
    items: page.map((e) => toItem(e, categoryMap.get(e.categoryId))),
    nextCursor,
    hasMore,
  };
}

function paginateOffset(
  filtered: Array<{
    id: string;
    amount: unknown;
    type: string;
    categoryId: string;
    description: string;
    date: Date;
    createdAt: Date;
  }>,
  categories: Category[],
  categoryMap: Map<string, Category>,
  params: TransactionQueryParams
): TransactionListResult {
  const desc = params.order === 'desc';
  const sorted = [...filtered].sort((a, b) => {
    const catA = categoryMap.get(a.categoryId)?.name ?? '';
    const catB = categoryMap.get(b.categoryId)?.name ?? '';
    const cmp = catA.localeCompare(catB);
    return desc ? -cmp : cmp;
  });

  let offset = 0;
  if (params.cursor) {
    const cursor = decodeCursor(params.cursor);
    if (cursor?.kind === 'offset') {
      offset = (cursor as OffsetCursor).offset;
    }
  }

  const page = sorted.slice(offset, offset + params.limit);
  const hasMore = offset + params.limit < sorted.length;
  const nextCursor = hasMore
    ? encodeCursor({ kind: 'offset', offset: offset + params.limit })
    : null;

  return {
    items: page.map((e) => toItem(e, categoryMap.get(e.categoryId))),
    nextCursor,
    hasMore,
  };
}
