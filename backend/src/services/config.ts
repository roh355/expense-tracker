import { PrismaClient } from '@prisma/client';
import { Category, TransactionType, UserConfig } from '../types';

const CATEGORIES_KEY = 'categories';
const BUDGET_KEY = 'monthly_budget';

export async function getUserConfig(prisma: PrismaClient, userId: string): Promise<UserConfig> {
  const values = await prisma.value.findMany({
    where: { userId, key: { in: [CATEGORIES_KEY, BUDGET_KEY] } },
  });

  let categories: Category[] = [];
  let monthlyBudget: number | null = null;

  for (const v of values) {
    if (v.key === CATEGORIES_KEY) {
      categories = JSON.parse(v.value) as Category[];
    } else if (v.key === BUDGET_KEY) {
      const parsed = JSON.parse(v.value);
      monthlyBudget = parsed === null ? null : Number(parsed);
    }
  }

  return { categories, monthlyBudget };
}

export async function getCategories(prisma: PrismaClient, userId: string): Promise<Category[]> {
  const config = await getUserConfig(prisma, userId);
  return config.categories;
}

export function findCategory(categories: Category[], categoryId: string): Category | undefined {
  return categories.find((c) => c.id === categoryId);
}

export function validateCategoryForType(
  categories: Category[],
  categoryId: string,
  type: TransactionType
): Category | null {
  const cat = findCategory(categories, categoryId);
  if (!cat || cat.type !== type) return null;
  return cat;
}

export async function updateCategories(
  prisma: PrismaClient,
  userId: string,
  categories: Category[]
): Promise<UserConfig> {
  if (categories.length < 1) {
    throw new Error('At least one category is required');
  }

  const seen = new Set<string>();
  for (const cat of categories) {
    const key = `${cat.type}:${cat.name.toLowerCase()}`;
    if (seen.has(key)) {
      throw new Error(`Duplicate category name: ${cat.name}`);
    }
    seen.add(key);
  }

  await prisma.value.upsert({
    where: { userId_key: { userId, key: CATEGORIES_KEY } },
    create: { userId, key: CATEGORIES_KEY, value: JSON.stringify(categories) },
    update: { value: JSON.stringify(categories) },
  });

  return getUserConfig(prisma, userId);
}

export async function updateBudget(
  prisma: PrismaClient,
  userId: string,
  monthlyBudget: number | null
): Promise<UserConfig> {
  if (monthlyBudget !== null) {
    await prisma.value.upsert({
      where: { userId_key: { userId, key: BUDGET_KEY } },
      create: { userId, key: BUDGET_KEY, value: JSON.stringify(monthlyBudget) },
      update: { value: JSON.stringify(monthlyBudget) },
    });
  } else {
    await prisma.value.deleteMany({ where: { userId, key: BUDGET_KEY } });
  }

  return getUserConfig(prisma, userId);
}
