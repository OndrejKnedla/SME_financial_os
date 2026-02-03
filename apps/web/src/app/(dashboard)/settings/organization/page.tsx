'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Save, Building2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/lib/auth-context';

const organizationSchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  taxId: z.string().optional(),
  vatId: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  zip: z.string().optional(),
  country: z.enum(['CZ', 'PL', 'SK', 'DE', 'AT']),
  currency: z.enum(['CZK', 'PLN', 'EUR']),
  invoicePrefix: z.string().min(1, 'Invoice prefix is required').max(10),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;

export default function OrganizationSettingsPage() {
  const { currentOrganization, refetchUser } = useAuth();

  const { data: organization, isLoading } = trpc.organization.get.useQuery(undefined, {
    enabled: !!currentOrganization,
  });

  const updateMutation = trpc.organization.update.useMutation({
    onSuccess: () => {
      refetchUser();
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      name: '',
      taxId: '',
      vatId: '',
      street: '',
      city: '',
      zip: '',
      country: 'CZ',
      currency: 'CZK',
      invoicePrefix: 'INV',
    },
  });

  const country = watch('country');

  useEffect(() => {
    if (organization) {
      const address = organization.address as Record<string, string> | null;

      reset({
        name: organization.name,
        taxId: organization.taxId ?? '',
        vatId: organization.vatId ?? '',
        street: address?.street ?? '',
        city: address?.city ?? '',
        zip: address?.zip ?? '',
        country: organization.country as 'CZ' | 'PL' | 'SK' | 'DE' | 'AT',
        currency: organization.currency as 'CZK' | 'PLN' | 'EUR',
        invoicePrefix: organization.invoicePrefix,
      });
    }
  }, [organization, reset]);

  const onSubmit = (data: OrganizationFormData) => {
    updateMutation.mutate({
      name: data.name,
      taxId: data.taxId || undefined,
      vatId: data.vatId || undefined,
      address: {
        street: data.street || undefined,
        city: data.city || undefined,
        zip: data.zip || undefined,
        country: data.country,
      },
      country: data.country as 'CZ' | 'PL' | 'SK',
      currency: data.currency,
      invoicePrefix: data.invoicePrefix,
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title="Organization Settings">
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/settings">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={updateMutation.isPending || !isDirty}
          >
            <Save className="mr-2 h-4 w-4" />
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </Header>

      <div className="flex-1 p-4 md:p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Company Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Company Details</CardTitle>
                  <CardDescription>Basic information about your company</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Company Name *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Your Company s.r.o."
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxId">
                    {country === 'PL' ? 'NIP' : 'IČO'} (Tax ID)
                  </Label>
                  <Input
                    id="taxId"
                    {...register('taxId')}
                    placeholder={country === 'PL' ? '1234567890' : '12345678'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vatId">DIČ / VAT ID</Label>
                  <Input
                    id="vatId"
                    {...register('vatId')}
                    placeholder={country === 'PL' ? 'PL1234567890' : 'CZ12345678'}
                  />
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select
                    value={country}
                    onValueChange={(value) => setValue('country', value as 'CZ' | 'PL' | 'SK' | 'DE' | 'AT')}
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

                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={watch('currency')}
                    onValueChange={(value) => setValue('currency', value as 'CZK' | 'PLN' | 'EUR')}
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
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle>Address</CardTitle>
              <CardDescription>Your company's registered address</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="street">Street Address</Label>
                <Input
                  id="street"
                  {...register('street')}
                  placeholder="Hlavní 123"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    {...register('city')}
                    placeholder={country === 'PL' ? 'Warszawa' : 'Praha'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP Code</Label>
                  <Input
                    id="zip"
                    {...register('zip')}
                    placeholder={country === 'PL' ? '00-001' : '110 00'}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Settings</CardTitle>
              <CardDescription>Configure default invoice settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invoicePrefix">Invoice Prefix *</Label>
                <Input
                  id="invoicePrefix"
                  {...register('invoicePrefix')}
                  placeholder="INV"
                />
                {errors.invoicePrefix && (
                  <p className="text-sm text-destructive">{errors.invoicePrefix.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Example: {watch('invoicePrefix') || 'INV'}-2026-0001
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Success message */}
          {updateMutation.isSuccess && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
              Organization settings saved successfully.
            </div>
          )}

          {/* Error message */}
          {updateMutation.error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
              {updateMutation.error.message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
