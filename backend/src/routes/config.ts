import { Router, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { getUserConfig, updateBudget, updateCategories } from '../services/config';

const categorySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  color: z.string(),
  type: z.enum(['EXPENSE', 'INCOME']),
});

const categoriesSchema = z.object({
  categories: z.array(categorySchema).min(1),
});

const budgetSchema = z.object({
  monthlyBudget: z.number().positive().nullable(),
});

export function createConfigRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get('/', async (req: AuthRequest, res: Response) => {
    const config = await getUserConfig(prisma, req.userId!);
    res.json(config);
  });

  router.put('/categories', async (req: AuthRequest, res: Response) => {
    const parsed = categoriesSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    try {
      const config = await updateCategories(prisma, req.userId!, parsed.data.categories);
      res.json(config);
    } catch (err) {
      res.status(400).json({ error: (err as Error).message });
    }
  });

  router.put('/budget', async (req: AuthRequest, res: Response) => {
    const parsed = budgetSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    const config = await updateBudget(prisma, req.userId!, parsed.data.monthlyBudget);
    res.json(config);
  });

  return router;
}
