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

const contactSchema = z.object({
  type: z.enum(['COMPANY', 'INDIVIDUAL']),
  name: z.string().min(1, 'Name is required'),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  taxId: z.string().optional(),
  vatId: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
  paymentTerms: z.coerce.number().int().min(0).max(365),
});

type ContactFormData = z.infer<typeof contactSchema>;

type ContactDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId?: string | null;
};

export function ContactDialog({ open, onOpenChange, contactId }: ContactDialogProps) {
  const isEditing = !!contactId;

  const { data: contact, isLoading } = trpc.contact.get.useQuery(
    { id: contactId! },
    { enabled: !!contactId }
  );

  const createMutation = trpc.contact.create.useMutation({
    onSuccess: () => {
      onOpenChange(false);
    },
  });

  const updateMutation = trpc.contact.update.useMutation({
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
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      type: 'COMPANY',
      name: '',
      email: '',
      phone: '',
      taxId: '',
      vatId: '',
      street: '',
      city: '',
      zip: '',
      country: 'CZ',
      paymentTerms: 14,
    },
  });

  const contactType = watch('type');

  useEffect(() => {
    if (contact) {
      const address = contact.address as Record<string, string> | null;
      reset({
        type: contact.type,
        name: contact.name,
        email: contact.email ?? '',
        phone: contact.phone ?? '',
        taxId: contact.taxId ?? '',
        vatId: contact.vatId ?? '',
        street: address?.street ?? '',
        city: address?.city ?? '',
        zip: address?.zip ?? '',
        country: address?.country ?? 'CZ',
        paymentTerms: contact.paymentTerms,
      });
    } else if (!contactId) {
      reset({
        type: 'COMPANY',
        name: '',
        email: '',
        phone: '',
        taxId: '',
        vatId: '',
        street: '',
        city: '',
        zip: '',
        country: 'CZ',
        paymentTerms: 14,
      });
    }
  }, [contact, contactId, reset]);

  const onSubmit = (data: ContactFormData) => {
    const payload = {
      type: data.type,
      name: data.name,
      email: data.email || undefined,
      phone: data.phone || undefined,
      taxId: data.taxId || undefined,
      vatId: data.vatId || undefined,
      address: {
        street: data.street || undefined,
        city: data.city || undefined,
        zip: data.zip || undefined,
        country: data.country || undefined,
      },
      paymentTerms: data.paymentTerms,
    };

    if (isEditing && contactId) {
      updateMutation.mutate({ id: contactId, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update the contact details below.'
              : 'Add a new customer or supplier to your contacts.'}
          </DialogDescription>
        </DialogHeader>

        {isLoading && contactId ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={contactType}
                  onValueChange={(value) => setValue('type', value as 'COMPANY' | 'INDIVIDUAL')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COMPANY">Company</SelectItem>
                    <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Payment Terms (days)</Label>
                <Input
                  id="paymentTerms"
                  type="number"
                  {...register('paymentTerms')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder={contactType === 'COMPANY' ? 'Company Name s.r.o.' : 'John Doe'}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="contact@example.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="+420 123 456 789"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="taxId">{contactType === 'COMPANY' ? 'IČO / NIP' : 'ID'}</Label>
                <Input
                  id="taxId"
                  {...register('taxId')}
                  placeholder="12345678"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="vatId">DIČ / VAT ID</Label>
                <Input
                  id="vatId"
                  {...register('vatId')}
                  placeholder="CZ12345678"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="street">Street</Label>
              <Input
                id="street"
                {...register('street')}
                placeholder="Street address"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" {...register('city')} placeholder="Prague" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="zip">ZIP</Label>
                <Input id="zip" {...register('zip')} placeholder="110 00" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Select
                  value={watch('country')}
                  onValueChange={(value) => setValue('country', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CZ">Czech Republic</SelectItem>
                    <SelectItem value="PL">Poland</SelectItem>
                    <SelectItem value="SK">Slovakia</SelectItem>
                    <SelectItem value="DE">Germany</SelectItem>
                    <SelectItem value="AT">Austria</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Saving...' : isEditing ? 'Update Contact' : 'Add Contact'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
