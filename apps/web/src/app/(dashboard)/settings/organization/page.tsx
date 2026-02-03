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
  name: z.string().min(1, 'Název společnosti je povinný'),
  taxId: z.string().optional(),
  vatId: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  zip: z.string().optional(),
  country: z.enum(['CZ', 'PL', 'SK', 'DE', 'AT']),
  currency: z.enum(['CZK', 'PLN', 'EUR']),
  invoicePrefix: z.string().min(1, 'Prefix faktury je povinný').max(10),
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
      <Header title="Nastavení organizace">
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/settings">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Zpět
            </Link>
          </Button>
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={updateMutation.isPending || !isDirty}
          >
            <Save className="mr-2 h-4 w-4" />
            {updateMutation.isPending ? 'Ukládání...' : 'Uložit změny'}
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
                  <CardTitle>Detaily společnosti</CardTitle>
                  <CardDescription>Základní informace o vaší společnosti</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Název společnosti *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Vaše společnost s.r.o."
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="taxId">
                    {country === 'PL' ? 'NIP' : 'IČO'}
                  </Label>
                  <Input
                    id="taxId"
                    {...register('taxId')}
                    placeholder={country === 'PL' ? '1234567890' : '12345678'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vatId">DIČ</Label>
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
                  <Label>Země</Label>
                  <Select
                    value={country}
                    onValueChange={(value) => setValue('country', value as 'CZ' | 'PL' | 'SK' | 'DE' | 'AT')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CZ">Česká republika</SelectItem>
                      <SelectItem value="PL">Polsko</SelectItem>
                      <SelectItem value="SK">Slovensko</SelectItem>
                      <SelectItem value="DE">Německo</SelectItem>
                      <SelectItem value="AT">Rakousko</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Měna</Label>
                  <Select
                    value={watch('currency')}
                    onValueChange={(value) => setValue('currency', value as 'CZK' | 'PLN' | 'EUR')}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CZK">CZK - Česká koruna</SelectItem>
                      <SelectItem value="PLN">PLN - Polský zlotý</SelectItem>
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
              <CardTitle>Adresa</CardTitle>
              <CardDescription>Sídlo vaší společnosti</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="street">Ulice a číslo popisné</Label>
                <Input
                  id="street"
                  {...register('street')}
                  placeholder="Hlavní 123"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="city">Město</Label>
                  <Input
                    id="city"
                    {...register('city')}
                    placeholder={country === 'PL' ? 'Varšava' : 'Praha'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zip">PSČ</Label>
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
              <CardTitle>Nastavení faktur</CardTitle>
              <CardDescription>Konfigurace výchozího nastavení faktur</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="invoicePrefix">Prefix faktury *</Label>
                <Input
                  id="invoicePrefix"
                  {...register('invoicePrefix')}
                  placeholder="INV"
                />
                {errors.invoicePrefix && (
                  <p className="text-sm text-destructive">{errors.invoicePrefix.message}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Příklad: {watch('invoicePrefix') || 'INV'}-2026-0001
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Success message */}
          {updateMutation.isSuccess && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
              Nastavení organizace bylo úspěšně uloženo.
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
