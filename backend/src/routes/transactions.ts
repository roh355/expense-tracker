import { Router, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { getCategories, validateCategoryForType } from '../services/config';
import { queryTransactions } from '../services/transactionQuery';
import { TransactionType } from '../types';

const listSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  cursor: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  q: z.string().optional(),
  type: z.enum(['EXPENSE', 'INCOME']).optional(),
  categoryId: z.string().uuid().optional(),
  sort: z
    .enum(['date', 'amount', 'type', 'category', 'description', 'createdAt'])
    .default('date'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

const createSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(['EXPENSE', 'INCOME']),
  categoryId: z.string().uuid(),
  description: z.string().optional().default(''),
  date: z.string(),
});

const updateSchema = createSchema.partial();

export function createTransactionsRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get('/', async (req: AuthRequest, res: Response) => {
    const parsed = listSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const result = await queryTransactions(prisma, req.userId!, parsed.data);
    res.json(result);
  });

  router.post('/', async (req: AuthRequest, res: Response) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const { amount, type, categoryId, description, date } = parsed.data;
    const categories = await getCategories(prisma, req.userId!);
    const cat = validateCategoryForType(categories, categoryId, type as TransactionType);
    if (!cat) {
      res.status(400).json({ error: 'Invalid category for transaction type' });
      return;
    }

    const expense = await prisma.expense.create({
      data: {
        userId: req.userId!,
        amount,
        type,
        categoryId,
        description: description ?? '',
        date: new Date(date),
      },
    });

    res.status(201).json({
      id: expense.id,
      amount: Number(expense.amount),
      type: expense.type,
      categoryId: expense.categoryId,
      categoryName: cat.name,
      categoryColor: cat.color,
      description: expense.description,
      date: expense.date.toISOString(),
      createdAt: expense.createdAt.toISOString(),
    });
  });

  router.put('/:id', async (req: AuthRequest, res: Response) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const id = String(req.params.id);
    const existing = await prisma.expense.findFirst({
      where: { id, userId: req.userId! },
    });
    if (!existing) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    const data = parsed.data;
    const type = (data.type ?? existing.type) as TransactionType;
    const categoryId = data.categoryId ?? existing.categoryId;
    const categories = await getCategories(prisma, req.userId!);
    const cat = validateCategoryForType(categories, categoryId, type);
    if (!cat) {
      res.status(400).json({ error: 'Invalid category for transaction type' });
      return;
    }

    const updated = await prisma.expense.update({
      where: { id: existing.id },
      data: {
        ...(data.amount !== undefined && { amount: data.amount }),
        ...(data.type !== undefined && { type: data.type }),
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.date !== undefined && { date: new Date(data.date) }),
      },
    });

    res.json({
      id: updated.id,
      amount: Number(updated.amount),
      type: updated.type,
      categoryId: updated.categoryId,
      categoryName: cat.name,
      categoryColor: cat.color,
      description: updated.description,
      date: updated.date.toISOString(),
      createdAt: updated.createdAt.toISOString(),
    });
  });

  router.delete('/:id', async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id);
    const existing = await prisma.expense.findFirst({
      where: { id, userId: req.userId! },
    });
    if (!existing) {
      res.status(404).json({ error: 'Transaction not found' });
      return;
    }

    await prisma.expense.delete({ where: { id: existing.id } });
    res.status(204).send();
  });

  return router;
}
