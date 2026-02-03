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
        <Header title="Nastavení KSeF" />
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
      <Header title="Nastavení KSeF" />

      <div className="flex-1 p-4 md:p-6 space-y-6">
        {/* Info Card */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-blue-800">
              <Info className="h-4 w-4" />
              O systému KSeF
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800">
            <p>
              <strong>KSeF (Krajowy System e-Faktur)</strong> je polský národní systém elektronických faktur.
              Od července 2024 musí být všechny B2B faktury v Polsku odeslány prostřednictvím KSeF.
            </p>
            <div className="mt-3 flex gap-2">
              <a
                href="https://www.podatki.gov.pl/ksef/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline inline-flex items-center gap-1"
              >
                Více informací o KSeF
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
                Není k dispozici
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-yellow-800">
              <p>
                KSeF je k dispozici pouze pro polské organizace. Vaše organizace je nastavena na{' '}
                <strong>{settings.country}</strong>. Pro aktivaci KSeF změňte zemi organizace
                na Polsko (PL) v nastavení organizace.
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
                      Integrace KSeF
                    </CardTitle>
                    <CardDescription>
                      Povolit automatické odesílání faktur do KSeF
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
                      {isEnabled ? 'Povoleno' : 'Zakázáno'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
            </Card>

            {/* Configuration Card */}
            <Card>
              <CardHeader>
                <CardTitle>Konfigurace</CardTitle>
                <CardDescription>
                  Nastavte váš autorizační token KSeF
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tax ID Status */}
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="font-medium">NIP (IČO)</div>
                    <div className="text-sm text-muted-foreground">
                      Vyžadováno pro autentizaci KSeF
                    </div>
                  </div>
                  {settings.hasTaxId ? (
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Nastaveno
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      Chybí
                    </Badge>
                  )}
                </div>

                {/* Token Status */}
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <div className="font-medium">Autorizační token</div>
                    <div className="text-sm text-muted-foreground">
                      Token z portálu KSeF
                    </div>
                  </div>
                  {settings.hasToken ? (
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Nastaveno
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      Nenastaveno
                    </Badge>
                  )}
                </div>

                {/* Token Input */}
                <div className="space-y-2">
                  <Label htmlFor="token">
                    {settings.hasToken ? 'Aktualizovat autorizační token' : 'Autorizační token'}
                  </Label>
                  <Input
                    id="token"
                    type="password"
                    placeholder={settings.hasToken ? '••••••••••••••••' : 'Zadejte váš autorizační token KSeF'}
                    {...register('token')}
                  />
                  <p className="text-xs text-muted-foreground">
                    Vygenerujte token na{' '}
                    <a
                      href="https://ksef.mf.gov.pl/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      portálu KSeF
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    {' '}(nebo testovacím portálu pro testování).
                  </p>
                </div>

                {/* Save Button */}
                <Button
                  type="submit"
                  disabled={!isDirty || updateMutation.isPending}
                >
                  {updateMutation.isPending ? 'Ukládání...' : 'Uložit nastavení'}
                </Button>

                {updateMutation.error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    {updateMutation.error.message}
                  </div>
                )}

                {updateMutation.isSuccess && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                    Nastavení bylo úspěšně uloženo.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Test Connection Card */}
            <Card>
              <CardHeader>
                <CardTitle>Test připojení</CardTitle>
                <CardDescription>
                  Ověřte, že vaše konfigurace KSeF funguje
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
                      <SelectItem value="test">Testovací prostředí</SelectItem>
                      <SelectItem value="demo">Demo prostředí</SelectItem>
                      <SelectItem value="production">Produkce</SelectItem>
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
                        Testování...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Test připojení
                      </>
                    )}
                  </Button>

                  {connectionStatus === 'success' && (
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Připojeno
                    </Badge>
                  )}

                  {connectionStatus === 'error' && (
                    <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      Selhalo
                    </Badge>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  Použijte testovací nebo demo prostředí pro vývoj a testování.
                  Produkční prostředí používejte pouze když jste připraveni odesílat skutečné faktury.
                </p>
              </CardContent>
            </Card>
          </form>
        )}
      </div>
    </div>
  );
}
