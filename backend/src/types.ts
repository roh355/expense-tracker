export type TransactionType = 'EXPENSE' | 'INCOME';

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

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export interface TransactionItem {
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

export interface KeysetCursor {
  kind: 'keyset';
  date: string;
  createdAt: string;
  id: string;
}

export interface OffsetCursor {
  kind: 'offset';
  offset: number;
}

export type PaginationCursor = KeysetCursor | OffsetCursor;
