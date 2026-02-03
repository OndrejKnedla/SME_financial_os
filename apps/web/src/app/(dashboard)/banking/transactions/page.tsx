'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Link2,
  Unlink,
  MoreHorizontal,
  Sparkles,
  RefreshCw,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { TransactionMatchingDialog } from '@/components/banking/transaction-matching-dialog';

type Transaction = {
  id: string;
  date: Date;
  amount: number;
  currency: string;
  counterpartyName?: string | null;
  counterpartyAccount?: string | null;
  description?: string | null;
  variableSymbol?: string | null;
  matchedPaymentId?: string | null;
  bankAccount: {
    name: string;
    bankName: string;
  };
};

export default function TransactionsPage() {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isMatchDialogOpen, setIsMatchDialogOpen] = useState(false);

  const { data: transactions, isLoading, refetch } = trpc.bankAccount.getUnmatchedTransactions.useQuery({
    limit: 100,
  });

  const autoMatchMutation = trpc.bankAccount.autoMatchTransactions.useMutation({
    onSuccess: (result) => {
      refetch();
      alert(`Auto-matched ${result.matchedCount} transactions.`);
    },
    onError: (error) => {
      alert(`Auto-match failed: ${error.message}`);
    },
  });

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency,
    }).format(amount / 100);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('cs-CZ');
  };

  const handleMatchClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsMatchDialogOpen(true);
  };

  const handleMatchComplete = () => {
    refetch();
  };

  return (
    <div className="flex flex-col">
      <Header title="Transactions">
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => autoMatchMutation.mutate({})}
            disabled={autoMatchMutation.isPending}
          >
            <Sparkles className={`mr-2 h-4 w-4 ${autoMatchMutation.isPending ? 'animate-pulse' : ''}`} />
            {autoMatchMutation.isPending ? 'Matching...' : 'Auto-Match All'}
          </Button>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </Header>

      <div className="flex-1 p-4 md:p-6">
        {/* Empty State */}
        {!isLoading && (!transactions || transactions.length === 0) && (
          <Card className="border-dashed">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Link2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle>No unmatched transactions</CardTitle>
              <CardDescription>
                All incoming transactions have been matched to invoices, or no transactions have been synced yet.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Transactions Table */}
        {transactions && transactions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Unmatched Transactions</CardTitle>
              <CardDescription>
                {transactions.length} incoming transactions waiting to be matched to invoices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Counterparty</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Variable Symbol</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="font-medium">
                        {formatDate(tx.date)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{tx.bankAccount.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {tx.bankAccount.bankName}
                        </div>
                      </TableCell>
                      <TableCell>
                        {tx.counterpartyName || (
                          <span className="text-muted-foreground">Unknown</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {tx.description || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {tx.variableSymbol ? (
                          <Badge variant="outline" className="font-mono">
                            {tx.variableSymbol}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={tx.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                          {tx.amount > 0 ? '+' : ''}
                          {formatAmount(tx.amount, tx.currency)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleMatchClick(tx)}>
                              <Link2 className="mr-2 h-4 w-4" />
                              Match to Invoice
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      <TransactionMatchingDialog
        open={isMatchDialogOpen}
        onOpenChange={setIsMatchDialogOpen}
        transaction={selectedTransaction}
        onMatch={handleMatchComplete}
      />
    </div>
  );
}
