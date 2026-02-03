import { router } from '../trpc';
import { authRouter } from './auth';
import { healthRouter } from './health';
import { organizationRouter } from './organization';
import { contactRouter } from './contact';
import { invoiceRouter } from './invoice';
import { expenseRouter } from './expense';
import { bankAccountRouter } from './bankAccount';
import { dashboardRouter } from './dashboard';
import { ksefRouter } from './ksef';

export const appRouter = router({
  auth: authRouter,
  health: healthRouter,
  organization: organizationRouter,
  contact: contactRouter,
  invoice: invoiceRouter,
  expense: expenseRouter,
  bankAccount: bankAccountRouter,
  dashboard: dashboardRouter,
  ksef: ksefRouter,
});

export type AppRouter = typeof appRouter;
