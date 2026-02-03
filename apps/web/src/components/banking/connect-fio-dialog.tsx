'use client';

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
import { trpc } from '@/lib/trpc';
import { Link2, ExternalLink } from 'lucide-react';

const fioConnectSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  fioToken: z.string().min(1, 'API token is required'),
  isDefault: z.boolean().default(false),
});

type FioConnectFormData = z.infer<typeof fioConnectSchema>;

interface ConnectFioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectFioDialog({ open, onOpenChange }: ConnectFioDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FioConnectFormData>({
    resolver: zodResolver(fioConnectSchema),
    defaultValues: {
      name: 'Fio Account',
      fioToken: '',
      isDefault: false,
    },
  });

  const connectMutation = trpc.bankAccount.connectFio.useMutation({
    onSuccess: () => {
      reset();
      onOpenChange(false);
    },
  });

  const onSubmit = (data: FioConnectFormData) => {
    connectMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Connect Fio Banka
          </DialogTitle>
          <DialogDescription>
            Connect your Fio Banka account to automatically sync transactions.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Account Name</Label>
            <Input
              id="name"
              placeholder="My Fio Account"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fioToken">API Token</Label>
            <Input
              id="fioToken"
              type="password"
              placeholder="Enter your Fio API token"
              {...register('fioToken')}
            />
            {errors.fioToken && (
              <p className="text-sm text-destructive">{errors.fioToken.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              You can generate an API token in your{' '}
              <a
                href="https://ib.fio.cz/ib/login"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Fio Internet Banking
                <ExternalLink className="h-3 w-3" />
              </a>
              {' '}under Settings → API.
            </p>
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

          {connectMutation.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {connectMutation.error.message}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={connectMutation.isPending}>
              {connectMutation.isPending ? 'Connecting...' : 'Connect'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
