'use client';

import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  MoreHorizontal,
  Pencil,
  Send,
  Copy,
  CheckCircle,
  Trash2,
  Download,
  Building2,
  FileCode2,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/lib/auth-context';
import { formatCurrency, formatDate } from '@/lib/utils';

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }> = {
  DRAFT: { label: 'Draft', variant: 'secondary' },
  SENT: { label: 'Sent', variant: 'default' },
  VIEWED: { label: 'Viewed', variant: 'default' },
  PAID: { label: 'Paid', variant: 'success' },
  PARTIALLY_PAID: { label: 'Partial', variant: 'warning' },
  OVERDUE: { label: 'Overdue', variant: 'destructive' },
  CANCELLED: { label: 'Cancelled', variant: 'outline' },
};

const ksefStatusConfig: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
  PENDING: { label: 'Pending', icon: Clock, color: 'text-yellow-600' },
  SUBMITTED: { label: 'Submitted', icon: Loader2, color: 'text-blue-600' },
  ACCEPTED: { label: 'Accepted', icon: CheckCircle2, color: 'text-green-600' },
  REJECTED: { label: 'Rejected', icon: XCircle, color: 'text-red-600' },
  ERROR: { label: 'Error', icon: AlertCircle, color: 'text-red-600' },
};

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentOrganization } = useAuth();
  const invoiceId = params.id as string;
  const currency = (currentOrganization?.currency as 'CZK' | 'PLN' | 'EUR') ?? 'CZK';

  const { data: invoice, isLoading, refetch } = trpc.invoice.get.useQuery({ id: invoiceId });

  const deleteMutation = trpc.invoice.delete.useMutation({
    onSuccess: () => router.push('/invoices'),
  });

  const markPaidMutation = trpc.invoice.markPaid.useMutation({
    onSuccess: () => refetch(),
  });

  const markSentMutation = trpc.invoice.markSent.useMutation({
    onSuccess: () => refetch(),
  });

  const duplicateMutation = trpc.invoice.duplicate.useMutation({
    onSuccess: (newInvoice) => router.push(`/invoices/${newInvoice.id}`),
  });

  // KSeF
  const { data: ksefSettings } = trpc.ksef.getSettings.useQuery();
  const { data: ksefStatus, refetch: refetchKsefStatus } = trpc.ksef.getStatus.useQuery(
    { invoiceId },
    { enabled: !!ksefSettings?.enabled }
  );

  const submitToKsefMutation = trpc.ksef.submitInvoice.useMutation({
    onSuccess: () => {
      refetch();
      refetchKsefStatus();
      alert('Invoice submitted to KSeF successfully!');
    },
    onError: (error) => {
      alert(`KSeF submission failed: ${error.message}`);
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Invoice not found</p>
        <Button asChild variant="outline">
          <Link href="/invoices">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Invoices
          </Link>
        </Button>
      </div>
    );
  }

  const status = statusConfig[invoice.status] || { label: 'Draft', variant: 'secondary' as const };
  const isOverdue =
    invoice.status !== 'PAID' &&
    invoice.status !== 'CANCELLED' &&
    new Date(invoice.dueDate) < new Date();

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      deleteMutation.mutate({ id: invoiceId });
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const sessionToken = localStorage.getItem('sessionToken');
      const organizationId = localStorage.getItem('organizationId');

      const response = await fetch(`/api/invoices/${invoiceId}/pdf`, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'X-Organization-Id': organizationId ?? '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoice?.number ?? 'invoice'}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('PDF download error:', error);
      alert('Failed to download PDF');
    }
  };

  return (
    <div className="flex flex-col">
      <Header title={`Invoice ${invoice.number}`}>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/invoices">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreHorizontal className="mr-2 h-4 w-4" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {invoice.status === 'DRAFT' && (
                <>
                  <DropdownMenuItem asChild>
                    <Link href={`/invoices/${invoice.id}/edit`}>
                      <Pencil className="mr-2 h-4 w-4" />
                      Edit
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => markSentMutation.mutate({ id: invoiceId })}>
                    <Send className="mr-2 h-4 w-4" />
                    Mark as Sent
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem onClick={() => duplicateMutation.mutate({ id: invoiceId })}>
                <Copy className="mr-2 h-4 w-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownloadPdf()}>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </DropdownMenuItem>
              {/* KSeF Submit - Only for Polish orgs with KSeF enabled */}
              {ksefSettings?.enabled &&
               ksefSettings?.isPolish &&
               invoice.status !== 'DRAFT' &&
               (!ksefStatus?.status || ksefStatus.status === 'ERROR' || ksefStatus.status === 'REJECTED') && (
                <DropdownMenuItem
                  onClick={() => submitToKsefMutation.mutate({ invoiceId, environment: 'test' })}
                  disabled={submitToKsefMutation.isPending}
                >
                  <FileCode2 className="mr-2 h-4 w-4" />
                  {submitToKsefMutation.isPending ? 'Submitting...' : 'Submit to KSeF'}
                </DropdownMenuItem>
              )}
              {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                <DropdownMenuItem onClick={() => markPaidMutation.mutate({ id: invoiceId })}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark as Paid
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {invoice.status !== 'PAID' && (
                <DropdownMenuItem onClick={handleDelete} className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </Header>

      <div className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Status Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge
                variant={isOverdue && invoice.status !== 'PAID' ? 'destructive' : status.variant}
                className="text-sm px-3 py-1"
              >
                {isOverdue && invoice.status !== 'PAID' && invoice.status !== 'CANCELLED'
                  ? 'Overdue'
                  : status.label}
              </Badge>
              {invoice.variableSymbol && (
                <span className="text-sm text-muted-foreground">
                  VS: {invoice.variableSymbol}
                </span>
              )}
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{formatCurrency(invoice.total, currency)}</div>
              <div className="text-sm text-muted-foreground">Total Amount</div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* From/To */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">From</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{currentOrganization?.name ?? 'Your Company'}</p>
                    <p className="text-sm text-muted-foreground">
                      {currentOrganization?.country}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">To</CardTitle>
              </CardHeader>
              <CardContent>
                {invoice.contact ? (
                  <div>
                    <p className="font-medium">{invoice.contact.name}</p>
                    {invoice.contact.email && (
                      <p className="text-sm text-muted-foreground">{invoice.contact.email}</p>
                    )}
                    {invoice.contact.taxId && (
                      <p className="text-sm text-muted-foreground">
                        IČO: {invoice.contact.taxId}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No customer selected</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Dates */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-sm text-muted-foreground">Issue Date</p>
                  <p className="font-medium">{formatDate(invoice.issueDate)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Due Date</p>
                  <p className={`font-medium ${isOverdue ? 'text-destructive' : ''}`}>
                    {formatDate(invoice.dueDate)}
                  </p>
                </div>
                {invoice.paidAt && (
                  <div>
                    <p className="text-sm text-muted-foreground">Paid Date</p>
                    <p className="font-medium">{formatDate(invoice.paidAt)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">VAT</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">{Number(item.quantity)}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.unitPrice, currency)}
                        </TableCell>
                        <TableCell className="text-right">{Number(item.taxRate)}%</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(item.totalGross, currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="mt-4 flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(invoice.subtotal, currency)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">VAT</span>
                    <span>{formatCurrency(invoice.taxAmount, currency)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{formatCurrency(invoice.total, currency)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {invoice.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Payment History */}
          {invoice.payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invoice.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">{formatCurrency(payment.amount, currency)}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(payment.paidAt)} · {payment.method.replace('_', ' ')}
                        </p>
                      </div>
                      <Badge variant="success">Paid</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* KSeF Status (Poland only) */}
          {ksefSettings?.enabled && ksefSettings?.isPolish && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileCode2 className="h-5 w-5" />
                  KSeF Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ksefStatus?.status ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex items-center gap-3">
                        {(() => {
                          const config = ksefStatusConfig[ksefStatus.status];
                          const IconComponent = config?.icon || AlertCircle;
                          return (
                            <>
                              <IconComponent
                                className={`h-5 w-5 ${config?.color || 'text-muted-foreground'} ${
                                  ksefStatus.status === 'SUBMITTED' ? 'animate-spin' : ''
                                }`}
                              />
                              <div>
                                <p className="font-medium">{config?.label || ksefStatus.status}</p>
                                {ksefStatus.ksefId && (
                                  <p className="text-sm text-muted-foreground font-mono">
                                    {ksefStatus.ksefId}
                                  </p>
                                )}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      {ksefStatus.status === 'ACCEPTED' && (
                        <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                          Registered
                        </Badge>
                      )}
                    </div>
                    {(ksefStatus.status === 'ERROR' || ksefStatus.status === 'REJECTED') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => submitToKsefMutation.mutate({ invoiceId, environment: 'test' })}
                        disabled={submitToKsefMutation.isPending}
                      >
                        {submitToKsefMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Resubmitting...
                          </>
                        ) : (
                          <>
                            <FileCode2 className="mr-2 h-4 w-4" />
                            Retry Submission
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground text-sm mb-3">
                      This invoice has not been submitted to KSeF yet.
                    </p>
                    {invoice.status !== 'DRAFT' && (
                      <Button
                        variant="outline"
                        onClick={() => submitToKsefMutation.mutate({ invoiceId, environment: 'test' })}
                        disabled={submitToKsefMutation.isPending}
                      >
                        {submitToKsefMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <FileCode2 className="mr-2 h-4 w-4" />
                            Submit to KSeF
                          </>
                        )}
                      </Button>
                    )}
                    {invoice.status === 'DRAFT' && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Invoice must be sent before submitting to KSeF.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
