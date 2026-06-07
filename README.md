# Expense Tracker

Full-stack personal expense tracker with Angular 19 frontend and Express/Prisma backend.

## Features

- JWT authentication (signup/login)
- Transaction CRUD with search, filters, sorting, and infinite scroll
- Analytics: category breakdown, spending over time, monthly budget histogram
- Settings: monthly budget and custom expense/income categories
- Dark/light theme toggle
- IndexedDB HTTP caching (10s TTL)
- INR currency formatting (en-IN)

## Quick Start

### Backend

```bash
cd backend
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Server runs at http://localhost:3000

### Frontend

```bash
cd frontend
npm install
npm start
```

App runs at http://localhost:4200 (proxies `/api` to backend)

## Test Accounts

| Email | Password |
|-------|----------|
| john@example.com | password |
| jane@example.com | password |

## Tech Stack

- **Backend:** Express 5, Prisma 6, SQLite, Zod, JWT, bcrypt
- **Frontend:** Angular 19, Angular Material, Chart.js, Lucide icons, IndexedDB cache
