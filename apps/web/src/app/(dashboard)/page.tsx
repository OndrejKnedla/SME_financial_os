'use client';

import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { trpc } from '@/lib/trpc';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  FileText,
  Receipt,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, currentOrganization } = useAuth();
  const currency = (currentOrganization?.currency as 'CZK' | 'PLN' | 'EUR') ?? 'CZK';

  const { data: stats, isLoading: statsLoading } = trpc.dashboard.stats.useQuery(undefined, {
    enabled: !!currentOrganization,
  });

  const { data: recentInvoices } = trpc.dashboard.recentInvoices.useQuery(undefined, {
    enabled: !!currentOrganization,
  });

  const { data: overdueInvoices } = trpc.dashboard.overdueInvoices.useQuery(undefined, {
    enabled: !!currentOrganization,
  });

  const { data: recentExpenses } = trpc.dashboard.recentExpenses.useQuery(undefined, {
    enabled: !!currentOrganization,
  });

  return (
    <div className="flex flex-col">
      <Header title="Dashboard">
        <Button asChild>
          <Link href="/invoices/new">
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Link>
        </Button>
      </Header>

      <div className="flex-1 space-y-6 p-4 md:p-6">
        {/* Welcome message */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight">
            Welcome back, {user?.name ?? 'there'}!
          </h2>
          <p className="text-muted-foreground">
            {currentOrganization
              ? `Here's what's happening with ${currentOrganization.name} today.`
              : 'Get started by creating your organization.'}
          </p>
        </div>

        {/* No organization setup */}
        {!currentOrganization && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                Complete Your Setup
              </CardTitle>
              <CardDescription>
                Create your organization to start using SME Financial OS
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild>
                <Link href="/onboarding">Create Organization</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        {currentOrganization && (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsLoading ? '...' : formatCurrency(stats?.revenue.current ?? 0, currency)}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center">
                    This month
                    {stats && stats.revenue.change !== 0 && (
                      <span className={`ml-1 flex items-center ${stats.revenue.change > 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {stats.revenue.change > 0 ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        {Math.abs(stats.revenue.change).toFixed(0)}%
                      </span>
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Unpaid Invoices</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsLoading ? '...' : stats?.unpaid.count ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(stats?.unpaid.total ?? 0, currency)} outstanding
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Expenses</CardTitle>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statsLoading ? '...' : formatCurrency(stats?.expenses.current ?? 0, currency)}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center">
                    This month
                    {stats && stats.expenses.change !== 0 && (
                      <span className={`ml-1 flex items-center ${stats.expenses.change > 0 ? 'text-red-500' : 'text-green-500'}`}>
                        {stats.expenses.change > 0 ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        {Math.abs(stats.expenses.change).toFixed(0)}%
                      </span>
                    )}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Cash Flow</CardTitle>
                  {(stats?.cashFlow ?? 0) >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${(stats?.cashFlow ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {statsLoading ? '...' : formatCurrency(stats?.cashFlow ?? 0, currency)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Revenue minus expenses
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Overdue Alert */}
            {overdueInvoices && overdueInvoices.length > 0 && (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    Overdue Invoices ({overdueInvoices.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {overdueInvoices.slice(0, 3).map((invoice) => (
                      <Link
                        key={invoice.id}
                        href={`/invoices/${invoice.id}`}
                        className="flex items-center justify-between rounded-md p-2 hover:bg-destructive/10"
                      >
                        <div>
                          <span className="font-medium">{invoice.number}</span>
                          <span className="text-sm text-muted-foreground ml-2">
                            {invoice.contact?.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-medium">
                            {formatCurrency(invoice.total, currency)}
                          </span>
                          <span className="text-xs text-destructive ml-2">
                            Due {formatDate(invoice.dueDate)}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                  {overdueInvoices.length > 3 && (
                    <Button asChild variant="link" className="mt-2 p-0 h-auto text-destructive">
                      <Link href="/invoices?status=OVERDUE">
                        View all overdue invoices
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Invoices</CardTitle>
                  <CardDescription>Your latest invoices</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentInvoices && recentInvoices.length > 0 ? (
                    <div className="space-y-3">
                      {recentInvoices.slice(0, 3).map((invoice) => (
                        <Link
                          key={invoice.id}
                          href={`/invoices/${invoice.id}`}
                          className="flex items-center justify-between hover:bg-muted/50 rounded-md p-2 -mx-2"
                        >
                          <div>
                            <span className="font-medium">{invoice.number}</span>
                            <p className="text-xs text-muted-foreground">
                              {invoice.contact?.name ?? 'No customer'}
                            </p>
                          </div>
                          <Badge
                            variant={
                              invoice.status === 'PAID'
                                ? 'success'
                                : invoice.status === 'DRAFT'
                                ? 'secondary'
                                : 'default'
                            }
                          >
                            {invoice.status}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No invoices yet</p>
                  )}
                  <Button asChild variant="outline" className="mt-4 w-full">
                    <Link href="/invoices/new">Create Invoice</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Expenses</CardTitle>
                  <CardDescription>Your latest expenses</CardDescription>
                </CardHeader>
                <CardContent>
                  {recentExpenses && recentExpenses.length > 0 ? (
                    <div className="space-y-3">
                      {recentExpenses.slice(0, 3).map((expense) => (
                        <div
                          key={expense.id}
                          className="flex items-center justify-between"
                        >
                          <div>
                            <span className="font-medium">
                              {expense.vendorName ?? 'Unknown vendor'}
                            </span>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(expense.date)}
                            </p>
                          </div>
                          <span className="font-medium">
                            {formatCurrency(expense.amount, currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No expenses yet</p>
                  )}
                  <Button asChild variant="outline" className="mt-4 w-full">
                    <Link href="/expenses">View Expenses</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                  <CardDescription>Common tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link href="/invoices/new">
                      <FileText className="mr-2 h-4 w-4" />
                      Create Invoice
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link href="/expenses">
                      <Receipt className="mr-2 h-4 w-4" />
                      Add Expense
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full justify-start">
                    <Link href="/contacts">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Contact
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
