'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { ArrowRight, Check, AlertCircle, Loader2 } from 'lucide-react';

interface TransactionMatchingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: {
    id: string;
    date: Date;
    amount: number;
    currency: string;
    counterpartyName?: string | null;
    description?: string | null;
    variableSymbol?: string | null;
  } | null;
  onMatch: () => void;
}

export function TransactionMatchingDialog({
  open,
  onOpenChange,
  transaction,
  onMatch,
}: TransactionMatchingDialogProps) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);

  const { data: suggestions, isLoading } = trpc.bankAccount.suggestMatches.useQuery(
    { transactionId: transaction?.id || '' },
    { enabled: !!transaction?.id && open }
  );

  const matchMutation = trpc.bankAccount.matchTransaction.useMutation({
    onSuccess: () => {
      onMatch();
      onOpenChange(false);
      setSelectedInvoiceId(null);
    },
  });

  const handleMatch = () => {
    if (!transaction || !selectedInvoiceId) return;
    matchMutation.mutate({
      transactionId: transaction.id,
      invoiceId: selectedInvoiceId,
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('cs-CZ', {
      style: 'currency',
      currency,
    }).format(amount / 100);
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('cs-CZ');
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Match Transaction to Invoice</DialogTitle>
          <DialogDescription>
            Select an invoice to match with this bank transaction.
          </DialogDescription>
        </DialogHeader>

        {/* Transaction Info */}
        <Card className="bg-muted/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Transaction
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold text-green-600">
                {formatAmount(transaction.amount, transaction.currency)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span>{formatDate(transaction.date)}</span>
            </div>
            {transaction.counterpartyName && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">From</span>
                <span>{transaction.counterpartyName}</span>
              </div>
            )}
            {transaction.variableSymbol && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Variable Symbol</span>
                <Badge variant="outline" className="font-mono">
                  {transaction.variableSymbol}
                </Badge>
              </div>
            )}
            {transaction.description && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Description</span>
                <span className="text-sm truncate max-w-[200px]">{transaction.description}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Suggestions */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Suggested Matches</h4>

          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && suggestions && suggestions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                No matching invoices found.
              </p>
            </div>
          )}

          {suggestions && suggestions.length > 0 && (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {suggestions.map((invoice) => (
                <Card
                  key={invoice.id}
                  className={`cursor-pointer transition-colors ${
                    selectedInvoiceId === invoice.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                  onClick={() => setSelectedInvoiceId(invoice.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full ${
                            selectedInvoiceId === invoice.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          {selectedInvoiceId === invoice.id ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <ArrowRight className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium">{invoice.number}</div>
                          <div className="text-sm text-muted-foreground">
                            {(invoice as any).contact?.name || 'No contact'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {formatAmount(invoice.total, invoice.currency)}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={invoice.matchScore >= 80 ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {invoice.matchScore}% match
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      {invoice.matchReason}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {matchMutation.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {matchMutation.error.message}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleMatch}
            disabled={!selectedInvoiceId || matchMutation.isPending}
          >
            {matchMutation.isPending ? 'Matching...' : 'Match Transaction'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
