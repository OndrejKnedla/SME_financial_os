'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  CheckCircle2,
  FileCode2,
  Info,
  Loader2,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

const ksefSettingsSchema = z.object({
  enabled: z.boolean(),
  token: z.string().optional(),
});

type KSeFSettingsFormData = z.infer<typeof ksefSettingsSchema>;

export default function KSeFSettingsPage() {
  const [testEnvironment, setTestEnvironment] = useState<'test' | 'demo' | 'production'>('test');
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const { data: settings, isLoading, refetch } = trpc.ksef.getSettings.useQuery();

  const updateMutation = trpc.ksef.updateSettings.useMutation({
    onSuccess: () => {
      refetch();
    },
  });

  const testConnectionMutation = trpc.ksef.testConnection.useQuery(
    { environment: testEnvironment },
    { enabled: false }
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<KSeFSettingsFormData>({
    resolver: zodResolver(ksefSettingsSchema),
    values: settings ? {
      enabled: settings.enabled,
      token: '',
    } : undefined,
  });

  const isEnabled = watch('enabled');

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus('idle');

    try {
      const result = await testConnectionMutation.refetch();
      if (result.data?.connected) {
        setConnectionStatus('success');
      } else {
        setConnectionStatus('error');
      }
    } catch {
      setConnectionStatus('error');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const onSubmit = (data: KSeFSettingsFormData) => {
    updateMutation.mutate({
      enabled: data.enabled,
      token: data.token || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col">
        <Header title="KSeF Settings" />
        <div className="flex-1 p-4 md:p-6">
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <Header title="KSeF Settings" />

      <div className="flex-1 p-4 md:p-6 space-y-6">
        {/* Info Card */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-blue-800">
              <Info className="h-4 w-4" />
              About KSeF
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800">
            <p>
              <strong>KSeF (Krajowy System e-Faktur)</strong> is Poland's National e-Invoice System.
              Starting from July 2024, all B2B invoices in Poland must be submitted through KSeF.
            </p>
            <div className="mt-3 flex gap-2">
              <a
                href="https://www.podatki.gov.pl/ksef/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                Learn more about KSeF
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Country Check */}
        {settings && !settings.isPolish && (
          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-yellow-800">
                <AlertCircle className="h-4 w-4" />
                Not Available
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-yellow-800">
              <p>
                KSeF is only available for Polish organizations. Your organization is set to{' '}
                <strong>{settings.country}</strong>. To enable KSeF, update your organization
                country to Poland (PL) in Organization Settings.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Settings Form */}
        {settings?.isPolish && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Enable/Disable Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileCode2 className="h-5 w-5" />
                      KSeF Integration
                    </CardTitle>
                    <CardDescription>
                      Enable automatic invoice submission to KSeF
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={(e) => setValue('enabled', e.target.checked, { shouldDirty: true })}
                      className="h-5 w-5 rounded border-gray-300"
                    />
                    <Badge variant={isEnabled ? 'default' : 'secondary'}>
                      {isEnabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Configuration Card */}
            <Card>
              <CardHeader>
                <CardTitle>Configuration</CardTitle>
                <CardDescription>
                  Configure your KSeF authorization token
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tax ID Status */}
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="font-medium">NIP (Tax ID)</div>
                    <div className="text-sm text-muted-foreground">
                      Required for KSeF authentication
                    </div>
                  </div>
                  {settings.hasTaxId ? (
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Configured
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      Missing
                    </Badge>
                  )}
                </div>

                {/* Token Status */}
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="font-medium">Authorization Token</div>
                    <div className="text-sm text-muted-foreground">
                      Token from KSeF portal
                    </div>
                  </div>
                  {settings.hasToken ? (
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Configured
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      Not Set
                    </Badge>
                  )}
                </div>

                {/* Token Input */}
                <div className="space-y-2">
                  <Label htmlFor="token">
                    {settings.hasToken ? 'Update Authorization Token' : 'Authorization Token'}
                  </Label>
                  <Input
                    id="token"
                    type="password"
                    placeholder={settings.hasToken ? '••••••••••••••••' : 'Enter your KSeF authorization token'}
                    {...register('token')}
                  />
                  <p className="text-xs text-muted-foreground">
                    Generate a token in the{' '}
                    <a
                      href="https://ksef.mf.gov.pl/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      KSeF Portal
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    {' '}(or test portal for testing).
                  </p>
                </div>

                {/* Save Button */}
                <Button
                  type="submit"
                  disabled={!isDirty || updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
                </Button>

                {updateMutation.error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    {updateMutation.error.message}
                  </div>
                )}

                {updateMutation.isSuccess && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                    Settings saved successfully.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Test Connection Card */}
            <Card>
              <CardHeader>
                <CardTitle>Test Connection</CardTitle>
                <CardDescription>
                  Verify that your KSeF configuration is working
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <Select
                    value={testEnvironment}
                    onValueChange={(value) => setTestEnvironment(value as any)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="test">Test Environment</SelectItem>
                      <SelectItem value="demo">Demo Environment</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={isTestingConnection}
                  >
                    {isTestingConnection ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Test Connection
                      </>
                    )}
                  </Button>

                  {connectionStatus === 'success' && (
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Connected
                    </Badge>
                  )}

                  {connectionStatus === 'error' && (
                    <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      Failed
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  Use the test or demo environment for development and testing.
                  Only use production when you're ready to submit real invoices.
                </p>
              </CardContent>
            </Card>
          </form>
        )}
      </div>
    </div>
  );
}
