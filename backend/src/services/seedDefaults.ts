import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';
import { Category } from '../types';

const EXPENSE_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Food & Dining', color: '#ef4444', type: 'EXPENSE' },
  { name: 'Transport', color: '#f97316', type: 'EXPENSE' },
  { name: 'Shopping', color: '#8b5cf6', type: 'EXPENSE' },
  { name: 'Entertainment', color: '#ec4899', type: 'EXPENSE' },
  { name: 'Bills & Utilities', color: '#3b82f6', type: 'EXPENSE' },
  { name: 'Health', color: '#14b8a6', type: 'EXPENSE' },
  { name: 'Other', color: '#6b7280', type: 'EXPENSE' },
];

const INCOME_CATEGORIES: Omit<Category, 'id'>[] = [
  { name: 'Salary', color: '#16a34a', type: 'INCOME' },
  { name: 'Freelance', color: '#22c55e', type: 'INCOME' },
  { name: 'Investment', color: '#4ade80', type: 'INCOME' },
  { name: 'Other', color: '#86efac', type: 'INCOME' },
];

export function getDefaultCategories(): Category[] {
  return [
    ...EXPENSE_CATEGORIES.map((c) => ({ ...c, id: randomUUID() })),
    ...INCOME_CATEGORIES.map((c) => ({ ...c, id: randomUUID() })),
  ];
}

export async function seedUserDefaults(prisma: PrismaClient, userId: string): Promise<void> {
  const categories = getDefaultCategories();
  await prisma.value.create({
    data: {
      userId,
      key: 'categories',
      value: JSON.stringify(categories),
    },
  });
}
