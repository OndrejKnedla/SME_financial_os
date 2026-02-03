'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/lib/auth-context';

const expenseSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  amount: z.coerce.number().positive('Amount must be positive'),
  taxRate: z.coerce.number().min(0).max(100),
  vendorName: z.string().optional(),
  vendorTaxId: z.string().optional(),
  description: z.string().optional(),
  categoryId: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

type ExpenseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseId?: string | null;
};

export function ExpenseDialog({ open, onOpenChange, expenseId }: ExpenseDialogProps) {
  const isEditing = !!expenseId;
  const { currentOrganization } = useAuth();
  const currency = (currentOrganization?.currency as 'CZK' | 'PLN' | 'EUR') ?? 'CZK';

  // Default VAT rate based on country
  const defaultTaxRate = currentOrganization?.country === 'PL' ? 23 : 21;

  const { data: expense, isLoading } = trpc.expense.get.useQuery(
    { id: expenseId! },
    { enabled: !!expenseId }
  );

  const createMutation = trpc.expense.create.useMutation({
    onSuccess: () => {
      onOpenChange(false);
    },
  });

  const updateMutation = trpc.expense.update.useMutation({
    onSuccess: () => {
      onOpenChange(false);
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      taxRate: defaultTaxRate,
      vendorName: '',
      vendorTaxId: '',
      description: '',
      categoryId: '',
    },
  });

  const amount = watch('amount');
  const taxRate = watch('taxRate');

  useEffect(() => {
    if (expense) {
      reset({
        date: new Date(expense.date).toISOString().split('T')[0],
        amount: expense.amount / 100, // Convert from cents
        taxRate: expense.taxRate ? Number(expense.taxRate) : defaultTaxRate,
        vendorName: expense.vendorName ?? '',
        vendorTaxId: expense.vendorTaxId ?? '',
        description: expense.description ?? '',
        categoryId: expense.categoryId ?? '',
      });
    } else if (!expenseId) {
      reset({
        date: new Date().toISOString().split('T')[0],
        amount: 0,
        taxRate: defaultTaxRate,
        vendorName: '',
        vendorTaxId: '',
        description: '',
        categoryId: '',
      });
    }
  }, [expense, expenseId, reset, defaultTaxRate]);

  const onSubmit = (data: ExpenseFormData) => {
    const payload = {
      date: new Date(data.date),
      amount: Math.round(data.amount * 100), // Convert to cents
      currency,
      taxRate: data.taxRate,
      vendorName: data.vendorName || undefined,
      vendorTaxId: data.vendorTaxId || undefined,
      description: data.description || undefined,
      categoryId: data.categoryId || undefined,
    };

    if (isEditing && expenseId) {
      updateMutation.mutate({ id: expenseId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Calculate totals
  const netAmount = amount || 0;
  const taxAmount = netAmount * (taxRate / 100);
  const grossAmount = netAmount + taxAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the expense details below.'
              : 'Add a new expense to track your business costs.'}
          </DialogDescription>
        </DialogHeader>

        {isLoading && expenseId ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <Input id="date" type="date" {...register('date')} />
                {errors.date && (
                  <p className="text-sm text-destructive">{errors.date.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount ({currency}) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('amount')}
                  placeholder="0.00"
                />
                {errors.amount && (
                  <p className="text-sm text-destructive">{errors.amount.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendorName">Vendor Name</Label>
              <Input
                id="vendorName"
                {...register('vendorName')}
                placeholder="Supplier s.r.o."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vendorTaxId">Vendor Tax ID</Label>
                <Input
                  id="vendorTaxId"
                  {...register('vendorTaxId')}
                  placeholder="12345678"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="taxRate">VAT Rate</Label>
                <Select
                  value={taxRate.toString()}
                  onValueChange={(value) => setValue('taxRate', parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">0%</SelectItem>
                    <SelectItem value="10">10%</SelectItem>
                    <SelectItem value="15">15%</SelectItem>
                    <SelectItem value="21">21%</SelectItem>
                    <SelectItem value="23">23%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="What was this expense for?"
                rows={2}
              />
            </div>

            {/* Amount Summary */}
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Net Amount</span>
                <span>
                  {new Intl.NumberFormat('cs-CZ', {
                    style: 'currency',
                    currency,
                  }).format(netAmount)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">VAT ({taxRate}%)</span>
                <span>
                  {new Intl.NumberFormat('cs-CZ', {
                    style: 'currency',
                    currency,
                  }).format(taxAmount)}
                </span>
              </div>
              <div className="flex justify-between font-medium border-t pt-2">
                <span>Gross Amount</span>
                <span>
                  {new Intl.NumberFormat('cs-CZ', {
                    style: 'currency',
                    currency,
                  }).format(grossAmount)}
                </span>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : isEditing ? 'Update Expense' : 'Add Expense'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
