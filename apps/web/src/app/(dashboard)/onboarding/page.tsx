'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Building2, ArrowRight, CheckCircle2 } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/lib/auth-context';

const onboardingSchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  taxId: z.string().optional(),
  vatId: z.string().optional(),
  country: z.enum(['CZ', 'PL', 'SK', 'DE', 'AT']),
  currency: z.enum(['CZK', 'PLN', 'EUR']),
});

type OnboardingFormData = z.infer<typeof onboardingSchema>;

const steps = [
  { id: 1, title: 'Company Details', description: 'Basic information about your business' },
  { id: 2, title: 'Location', description: 'Where is your company based?' },
  { id: 3, title: 'Review', description: 'Confirm your setup' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { refetchUser } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);

  const createMutation = trpc.organization.create.useMutation({
    onSuccess: () => {
      refetchUser();
      router.push('/');
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OnboardingFormData>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      name: '',
      taxId: '',
      vatId: '',
      country: 'CZ',
      currency: 'CZK',
    },
  });

  const country = watch('country');
  const currency = watch('currency');
  const name = watch('name');
  const taxId = watch('taxId');

  const onSubmit = (data: OnboardingFormData) => {
    createMutation.mutate({
      name: data.name,
      taxId: data.taxId || undefined,
      vatId: data.vatId || undefined,
      country: data.country as 'CZ' | 'PL' | 'SK',
      currency: data.currency,
    });
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Welcome to SME Financial OS</h1>
          <p className="mt-2 text-muted-foreground">
            Let's set up your company in a few simple steps
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                      currentStep > step.id
                        ? 'border-primary bg-primary text-primary-foreground'
                        : currentStep === step.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-muted-foreground/30 text-muted-foreground'
                    }`}
                  >
                    {currentStep > step.id ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p className={`text-sm font-medium ${
                      currentStep >= step.id ? 'text-foreground' : 'text-muted-foreground'
                    }`}>
                      {step.title}
                    </p>
                  </div>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`mx-4 h-0.5 w-16 ${
                      currentStep > step.id ? 'bg-primary' : 'bg-muted-foreground/30'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>{steps[currentStep - 1]?.title}</CardTitle>
            <CardDescription>{steps[currentStep - 1]?.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)}>
              {/* Step 1: Company Details */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Company Name *</Label>
                    <Input
                      id="name"
                      {...register('name')}
                      placeholder="Your Company s.r.o."
                      autoFocus
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
                </div>
              )}

              {/* Step 2: Location */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Country</Label>
                    <Select
                      value={country}
                      onValueChange={(value) => {
                        setValue('country', value as 'CZ' | 'PL' | 'SK' | 'DE' | 'AT');
                        // Auto-set currency based on country
                        if (value === 'PL') {
                          setValue('currency', 'PLN');
                        } else if (value === 'DE' || value === 'AT' || value === 'SK') {
                          setValue('currency', 'EUR');
                        } else {
                          setValue('currency', 'CZK');
                        }
                      }}
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
                    <Label>Primary Currency</Label>
                    <Select
                      value={currency}
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
                    <p className="text-xs text-muted-foreground">
                      This will be used as the default currency for invoices and expenses
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Review */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="rounded-lg border p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Company Name</span>
                      <span className="font-medium">{name || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax ID</span>
                      <span className="font-medium">{taxId || '-'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Country</span>
                      <span className="font-medium">
                        {country === 'CZ' && 'Czech Republic'}
                        {country === 'PL' && 'Poland'}
                        {country === 'SK' && 'Slovakia'}
                        {country === 'DE' && 'Germany'}
                        {country === 'AT' && 'Austria'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Currency</span>
                      <span className="font-medium">{currency}</span>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">
                    You can update these details later in Settings.
                  </p>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="mt-6 flex justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                >
                  Back
                </Button>

                {currentStep < 3 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    disabled={currentStep === 1 && !name}
                  >
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending ? 'Creating...' : 'Create Company'}
                    <CheckCircle2 className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>

              {createMutation.error && (
                <p className="mt-4 text-sm text-destructive">
                  {createMutation.error.message}
                </p>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
