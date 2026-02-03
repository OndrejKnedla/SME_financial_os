'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Receipt,
  CheckCircle,
  DollarSign,
  Camera,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ExpenseDialog } from '@/components/expenses/expense-dialog';
import { ReceiptUploadDialog } from '@/components/expenses/receipt-upload-dialog';
import type { ExpenseStatus } from '@sme-financial-os/shared';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }> = {
  PENDING: { label: 'Čeká na schválení', variant: 'secondary' },
  APPROVED: { label: 'Schváleno', variant: 'default' },
  REJECTED: { label: 'Zamítnuto', variant: 'destructive' },
  PAID: { label: 'Zaplaceno', variant: 'success' },
};

export default function ExpensesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<string | null>(null);
  const { currentOrganization } = useAuth();
  const currency = (currentOrganization?.currency as 'CZK' | 'PLN' | 'EUR') ?? 'CZK';

  const { data, isLoading, refetch } = trpc.expense.list.useQuery({
    search: search || undefined,
    status: statusFilter !== 'all' ? (statusFilter as ExpenseStatus) : undefined,
    limit: 50,
  });

  const deleteMutation = trpc.expense.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const approveMutation = trpc.expense.approve.useMutation({
    onSuccess: () => refetch(),
  });

  const markPaidMutation = trpc.expense.markPaid.useMutation({
    onSuccess: () => refetch(),
  });

  const expenses = data?.items ?? [];

  const handleEdit = (expenseId: string) => {
    setEditingExpense(expenseId);
    setIsDialogOpen(true);
  };

  const handleDelete = (expenseId: string) => {
    if (confirm('Opravdu chcete smazat tento náklad?')) {
      deleteMutation.mutate({ id: expenseId });
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingExpense(null);
    refetch();
  };

  return (
    <div className="flex flex-col">
      <Header title="Náklady">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsUploadDialogOpen(true)}>
            <Camera className="mr-2 h-4 w-4" />
            Naskenovat účtenku
          </Button>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Přidat náklad
          </Button>
        </div>
      </Header>

      <div className="flex-1 p-4 md:p-6">
        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Hledat náklady..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtr podle stavu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Všechny stavy</SelectItem>
              <SelectItem value="PENDING">Čeká na schválení</SelectItem>
              <SelectItem value="APPROVED">Schváleno</SelectItem>
              <SelectItem value="PAID">Zaplaceno</SelectItem>
              <SelectItem value="REJECTED">Zamítnuto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Empty State */}
        {!isLoading && expenses.length === 0 && !search && statusFilter === 'all' && (
          <Card className="border-dashed">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Receipt className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle>Zatím žádné náklady</CardTitle>
              <CardDescription>
                Sledujte své podnikatelské náklady přidáním účtenek
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Přidat náklad
              </Button>
            </CardContent>
          </Card>
        )}

        {/* No results */}
        {!isLoading && expenses.length === 0 && (search || statusFilter !== 'all') && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nebyly nalezeny žádné náklady odpovídající vašim filtrům</p>
          </div>
        )}

        {/* Expenses Table */}
        {expenses.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Datum</TableHead>
                  <TableHead>Dodavatel</TableHead>
                  <TableHead>Popis</TableHead>
                  <TableHead>Kategorie</TableHead>
                  <TableHead>Stav</TableHead>
                  <TableHead className="text-right">Částka</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense: typeof expenses[number]) => {
                  const status = statusConfig[expense.status] || { label: 'Čeká na schválení', variant: 'secondary' as const };

                  return (
                    <TableRow key={expense.id}>
                      <TableCell>{formatDate(expense.date)}</TableCell>
                      <TableCell className="font-medium">
                        {expense.vendorName || '-'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {expense.description || '-'}
                      </TableCell>
                      <TableCell>{(expense as { category?: { name: string } | null }).category?.name ?? '-'}</TableCell>
                      <TableCell>
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(expense.amount, currency)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(expense.id)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              Upravit
                            </DropdownMenuItem>
                            {expense.status === 'PENDING' && (
                              <DropdownMenuItem
                                onClick={() => approveMutation.mutate({ id: expense.id })}
                              >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Schválit
                              </DropdownMenuItem>
                            )}
                            {expense.status === 'APPROVED' && (
                              <DropdownMenuItem
                                onClick={() => markPaidMutation.mutate({ id: expense.id })}
                              >
                                <DollarSign className="mr-2 h-4 w-4" />
                                Označit jako zaplaceno
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(expense.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Smazat
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      <ExpenseDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        expenseId={editingExpense}
      />

      <ReceiptUploadDialog
        open={isUploadDialogOpen}
        onOpenChange={setIsUploadDialogOpen}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
