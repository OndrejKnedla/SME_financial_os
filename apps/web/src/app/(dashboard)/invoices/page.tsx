'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  Eye,
  Pencil,
  Copy,
  CheckCircle,
  Trash2,
  FileText,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { InvoiceStatus } from '@sme-financial-os/shared';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }> = {
  DRAFT: { label: 'Koncept', variant: 'secondary' },
  SENT: { label: 'Odesláno', variant: 'default' },
  VIEWED: { label: 'Zobrazeno', variant: 'default' },
  PAID: { label: 'Zaplaceno', variant: 'success' },
  PARTIALLY_PAID: { label: 'Částečně', variant: 'warning' },
  OVERDUE: { label: 'Po splatnosti', variant: 'destructive' },
  CANCELLED: { label: 'Zrušeno', variant: 'outline' },
};

export default function InvoicesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const { currentOrganization } = useAuth();
  const currency = (currentOrganization?.currency as 'CZK' | 'PLN' | 'EUR') ?? 'CZK';

  const { data, isLoading, refetch } = trpc.invoice.list.useQuery({
    search: search || undefined,
    status: statusFilter !== 'all' ? (statusFilter as InvoiceStatus) : undefined,
    limit: 50,
  });

  const deleteMutation = trpc.invoice.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const markPaidMutation = trpc.invoice.markPaid.useMutation({
    onSuccess: () => refetch(),
  });

  const duplicateMutation = trpc.invoice.duplicate.useMutation({
    onSuccess: () => refetch(),
  });

  const invoices = data?.items ?? [];

  const handleDelete = (invoiceId: string) => {
    if (confirm('Opravdu chcete smazat tuto fakturu?')) {
      deleteMutation.mutate({ id: invoiceId });
    }
  };

  const handleMarkPaid = (invoiceId: string) => {
    markPaidMutation.mutate({ id: invoiceId });
  };

  const handleDuplicate = (invoiceId: string) => {
    duplicateMutation.mutate({ id: invoiceId });
  };

  return (
    <div className="flex flex-col">
      <Header title="Faktury">
        <Button asChild>
          <Link href="/invoices/new">
            <Plus className="mr-2 h-4 w-4" />
            Nová faktura
          </Link>
        </Button>
      </Header>

      <div className="flex-1 p-4 md:p-6">
        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Hledat faktury..."
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
              <SelectItem value="DRAFT">Koncept</SelectItem>
              <SelectItem value="SENT">Odesláno</SelectItem>
              <SelectItem value="PAID">Zaplaceno</SelectItem>
              <SelectItem value="OVERDUE">Po splatnosti</SelectItem>
              <SelectItem value="CANCELLED">Zrušeno</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Empty State */}
        {!isLoading && invoices.length === 0 && !search && statusFilter === 'all' && (
          <Card className="border-dashed">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle>Zatím žádné faktury</CardTitle>
              <CardDescription>Vytvořte svou první fakturu</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button asChild>
                <Link href="/invoices/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Vytvořit fakturu
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {/* No results */}
        {!isLoading && invoices.length === 0 && (search || statusFilter !== 'all') && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nebyly nalezeny žádné faktury odpovídající filtrům</p>
          </div>
        )}

        {/* Invoices Table */}
        {invoices.length > 0 && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Číslo</TableHead>
                  <TableHead>Zákazník</TableHead>
                  <TableHead>Datum vystavení</TableHead>
                  <TableHead>Datum splatnosti</TableHead>
                  <TableHead>Stav</TableHead>
                  <TableHead className="text-right">Částka</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice: typeof invoices[number]) => {
                  const status = statusConfig[invoice.status] || { label: 'Draft', variant: 'secondary' as const };
                  const isOverdue =
                    invoice.status !== 'PAID' &&
                    invoice.status !== 'CANCELLED' &&
                    new Date(invoice.dueDate) < new Date();

                  return (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="font-medium hover:underline"
                        >
                          {invoice.number}
                        </Link>
                      </TableCell>
                      <TableCell>{invoice.contact?.name ?? '-'}</TableCell>
                      <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                      <TableCell>
                        <span className={isOverdue ? 'text-destructive' : ''}>
                          {formatDate(invoice.dueDate)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={isOverdue && invoice.status !== 'PAID' ? 'destructive' : status.variant}>
                          {isOverdue && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED'
                            ? 'Po splatnosti'
                            : status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(invoice.total, currency)}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/invoices/${invoice.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                Zobrazit
                              </Link>
                            </DropdownMenuItem>
                            {invoice.status === 'DRAFT' && (
                              <DropdownMenuItem asChild>
                                <Link href={`/invoices/${invoice.id}/edit`}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Upravit
                                </Link>
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleDuplicate(invoice.id)}>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplikovat
                            </DropdownMenuItem>
                            {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                              <DropdownMenuItem onClick={() => handleMarkPaid(invoice.id)}>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Označit jako zaplaceno
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {invoice.status !== 'PAID' && (
                              <DropdownMenuItem
                                onClick={() => handleDelete(invoice.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Smazat
                              </DropdownMenuItem>
                            )}
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
    </div>
  );
}
