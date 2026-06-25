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

app.use(authMiddleware);
app.use('/api/transactions', createTransactionsRouter(prisma));
app.use('/api/config', createConfigRouter(prisma));
app.use('/api/analytics', createAnalyticsRouter(prisma));

// Serve Angular static files
app.use(express.static(path.join(__dirname, '../public/browser')));

// Catch-all: let Angular handle routing
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../public/browser/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
