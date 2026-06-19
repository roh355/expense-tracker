import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { seedUserDefaults } from '../src/services/seedDefaults';
import { getCategories } from '../src/services/config';

const prisma = new PrismaClient();

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface SeedUser {
  email: string;
  password: string;
  name: string;
  budget: number;
  salaryBase: number;
  rngSeed: number;
}

const USERS: SeedUser[] = [
  { email: 'john@example.com', password: 'password', name: 'John', budget: 45000, salaryBase: 65000, rngSeed: 12345 },
  { email: 'jane@example.com', password: 'password', name: 'Jane', budget: 55000, salaryBase: 90000, rngSeed: 67890 },
];

async function seedUser(user: SeedUser) {
  await prisma.user.deleteMany({ where: { email: user.email } });

  const passwordHash = await bcrypt.hash(user.password, 10);
  const created = await prisma.user.create({
    data: { email: user.email, passwordHash, name: user.name },
  });

  await seedUserDefaults(prisma, created.id);

  await prisma.value.create({
    data: {
      userId: created.id,
      key: 'monthly_budget',
      value: JSON.stringify(user.budget),
    },
  });

  const categories = await getCategories(prisma, created.id);
  const expenseCats = categories.filter((c) => c.type === 'EXPENSE');
  const incomeCats = categories.filter((c) => c.type === 'INCOME');
  const salaryCat = incomeCats.find((c) => c.name === 'Salary')!;
  const freelanceCat = incomeCats.find((c) => c.name === 'Freelance')!;
  const investmentCat = incomeCats.find((c) => c.name === 'Investment')!;

  const rng = mulberry32(user.rngSeed);
  const now = new Date();
  const sixYearsAgo = new Date(now);
  sixYearsAgo.setFullYear(sixYearsAgo.getFullYear() - 6);

  const transactions: {
    userId: string;
    amount: number;
    type: string;
    categoryId: string;
    description: string;
    date: Date;
  }[] = [];

  for (let i = 0; i < 3500; i++) {
    const daysRange = Math.floor((now.getTime() - sixYearsAgo.getTime()) / (1000 * 60 * 60 * 24));
    const dayOffset = Math.floor(rng() * daysRange);
    const date = new Date(sixYearsAgo);
    date.setDate(date.getDate() + dayOffset);
    const cat = expenseCats[Math.floor(rng() * expenseCats.length)];
    const amount = Math.round(15 + rng() * (900 - 15));
    transactions.push({
      userId: created.id,
      amount,
      type: 'EXPENSE',
      categoryId: cat.id,
      description: '',
      date,
    });
  }

  const startYear = sixYearsAgo.getFullYear();
  const endYear = now.getFullYear();
  for (let year = startYear; year <= endYear; year++) {
    for (let month = 0; month < 12; month++) {
      if (year === endYear && month > now.getMonth()) break;
      const salaryDay = 1 + Math.floor(rng() * 5);
      const salaryDate = new Date(year, month, salaryDay);
      if (salaryDate > now) continue;
      const variance = 0.95 + rng() * 0.1;
      transactions.push({
        userId: created.id,
        amount: Math.round(user.salaryBase * variance),
        type: 'INCOME',
        categoryId: salaryCat.id,
        description: 'Monthly salary',
        date: salaryDate,
      });

      if (month % 3 === 0) {
        const freelanceDay = 10 + Math.floor(rng() * 15);
        const freelanceDate = new Date(year, month, freelanceDay);
        if (freelanceDate <= now) {
          transactions.push({
            userId: created.id,
            amount: Math.round(5000 + rng() * 15000),
            type: 'INCOME',
            categoryId: freelanceCat.id,
            description: 'Freelance income',
            date: freelanceDate,
          });
        }
      }

      if (month === 5 || month === 11) {
        const invDay = 15 + Math.floor(rng() * 10);
        const invDate = new Date(year, month, invDay);
        if (invDate <= now) {
          transactions.push({
            userId: created.id,
            amount: Math.round(3000 + rng() * 12000),
            type: 'INCOME',
            categoryId: investmentCat.id,
            description: 'Investment returns',
            date: invDate,
          });
        }
      }
    }
  }

  const CHUNK = 400;
  for (let i = 0; i < transactions.length; i += CHUNK) {
    await prisma.expense.createMany({ data: transactions.slice(i, i + CHUNK) });
  }

  console.log(`Seeded ${user.email}: ${transactions.length} transactions`);
}

async function main() {
  for (const user of USERS) {
    await seedUser(user);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
