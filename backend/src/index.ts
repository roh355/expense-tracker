import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { authMiddleware } from './middleware/auth';
import { createAuthRouter } from './routes/auth';
import { createTransactionsRouter } from './routes/transactions';
import { createConfigRouter } from './routes/config';
import { createAnalyticsRouter } from './routes/analytics';

const prisma = new PrismaClient();
const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', createAuthRouter(prisma));

// Protected API routes (must be registered BEFORE the SPA fallback)
app.use('/api/transactions', authMiddleware, createTransactionsRouter(prisma));
app.use('/api/config', authMiddleware, createConfigRouter(prisma));
app.use('/api/analytics', authMiddleware, createAnalyticsRouter(prisma));

// Serve Angular static assets, then fall back to index.html for SPA routes.
// This MUST come last so it doesn't swallow /api GET requests.
app.use(express.static(path.join(__dirname, '../public/browser')));
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/browser/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
