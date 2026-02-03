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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/lib/auth-context';

const bankAccountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  bankName: z.string().min(1, 'Bank name is required'),
  accountNumber: z.string().min(1, 'Account number is required'),
  currency: z.enum(['CZK', 'PLN', 'EUR']),
  isDefault: z.boolean(),
});

type BankAccountFormData = z.infer<typeof bankAccountSchema>;

type BankAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId?: string | null;
};

export function BankAccountDialog({ open, onOpenChange, accountId }: BankAccountDialogProps) {
  const isEditing = !!accountId;
  const { currentOrganization } = useAuth();
  const defaultCurrency = (currentOrganization?.currency as 'CZK' | 'PLN' | 'EUR') ?? 'CZK';

  const { data: account, isLoading } = trpc.bankAccount.get.useQuery(
    { id: accountId! },
    { enabled: !!accountId }
  );

  const createMutation = trpc.bankAccount.create.useMutation({
    onSuccess: () => {
      onOpenChange(false);
    },
  });

  const updateMutation = trpc.bankAccount.update.useMutation({
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
  } = useForm<BankAccountFormData>({
    resolver: zodResolver(bankAccountSchema),
    defaultValues: {
      name: '',
      bankName: '',
      accountNumber: '',
      currency: defaultCurrency,
      isDefault: false,
    },
  });

  const currency = watch('currency');

  useEffect(() => {
    if (account) {
      reset({
        name: account.name,
        bankName: account.bankName,
        accountNumber: account.accountNumber,
        currency: account.currency as 'CZK' | 'PLN' | 'EUR',
        isDefault: account.isDefault,
      });
    } else if (!accountId) {
      reset({
        name: '',
        bankName: '',
        accountNumber: '',
        currency: defaultCurrency,
        isDefault: false,
      });
    }
  }, [account, accountId, reset, defaultCurrency]);

  const onSubmit = (data: BankAccountFormData) => {
    if (isEditing && accountId) {
      updateMutation.mutate({
        id: accountId,
        name: data.name,
        isDefault: data.isDefault,
      });
    } else {
      createMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Bank Account' : 'Add Bank Account'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update your bank account details.'
              : 'Add a bank account to receive payments and track transactions.'}
          </DialogDescription>
        </DialogHeader>

        {isLoading && accountId ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Account Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Main Business Account"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name *</Label>
              <Input
                id="bankName"
                {...register('bankName')}
                placeholder="Fio banka"
                disabled={isEditing}
              />
              {errors.bankName && (
                <p className="text-sm text-destructive">{errors.bankName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number *</Label>
              <Input
                id="accountNumber"
                {...register('accountNumber')}
                placeholder="123456789/0100"
                disabled={isEditing}
              />
              {errors.accountNumber && (
                <p className="text-sm text-destructive">{errors.accountNumber.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={currency}
                onValueChange={(value) =>
                  setValue('currency', value as 'CZK' | 'PLN' | 'EUR')
                }
                disabled={isEditing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CZK">CZK - Czech Koruna</SelectItem>
                  <SelectItem value="PLN">PLN - Polish Zloty</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDefault"
                {...register('isDefault')}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isDefault" className="text-sm font-normal">
                Set as default account for invoices
              </Label>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending
                  ? 'Saving...'
                  : isEditing
                  ? 'Update Account'
                  : 'Add Account'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
