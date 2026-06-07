import { Router, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth';
import { getDaily, getMonthly, getSummary } from '../services/analytics';

const rangeSchema = z.object({
  range: z.enum(['this_month', '7d', '1m', '3m', 'all']).default('this_month'),
});

const periodSchema = z.object({
  period: z.enum(['current_year', '1y', '3y', '5y', 'all']).default('current_year'),
});

export function createAnalyticsRouter(prisma: PrismaClient): Router {
  const router = Router();

  router.get('/summary', async (req: AuthRequest, res: Response) => {
    const parsed = rangeSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const result = await getSummary(prisma, req.userId!, parsed.data.range);
    res.json(result);
  });

  router.get('/daily', async (req: AuthRequest, res: Response) => {
    const parsed = rangeSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const result = await getDaily(prisma, req.userId!, parsed.data.range);
    res.json(result);
  });

  router.get('/monthly', async (req: AuthRequest, res: Response) => {
    const parsed = periodSchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }
    const result = await getMonthly(prisma, req.userId!, parsed.data.period);
    res.json(result);
  });

  return router;
}
