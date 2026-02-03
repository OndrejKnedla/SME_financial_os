'use client';

import { useState } from 'react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Plus,
  Building2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Star,
  CreditCard,
  RefreshCw,
  Link2,
  Unlink,
  ArrowRightLeft,
} from 'lucide-react';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { BankAccountDialog } from '@/components/banking/bank-account-dialog';
import { ConnectFioDialog } from '@/components/banking/connect-fio-dialog';

export default function BankingPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFioDialogOpen, setIsFioDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  const [syncingAccountId, setSyncingAccountId] = useState<string | null>(null);

  const { data: accounts, isLoading, refetch } = trpc.bankAccount.list.useQuery();

  const deleteMutation = trpc.bankAccount.delete.useMutation({
    onSuccess: () => refetch(),
  });

  const setDefaultMutation = trpc.bankAccount.setDefault.useMutation({
    onSuccess: () => refetch(),
  });

  const syncFioMutation = trpc.bankAccount.syncFio.useMutation({
    onSuccess: (result) => {
      setSyncingAccountId(null);
      refetch();
      alert(`Synchronizace dokončena! Naimportováno ${result.newTransactions} nových transakcí.`);
    },
    onError: (error) => {
      setSyncingAccountId(null);
      alert(`Synchronizace selhala: ${error.message}`);
    },
  });

  const disconnectFioMutation = trpc.bankAccount.disconnectFio.useMutation({
    onSuccess: () => refetch(),
  });

  const handleEdit = (accountId: string) => {
    setEditingAccount(accountId);
    setIsDialogOpen(true);
  };

  const handleDelete = (accountId: string) => {
    if (confirm('Opravdu chcete smazat tento bankovní účet?')) {
      deleteMutation.mutate({ id: accountId });
    }
  };

  const handleSync = (accountId: string) => {
    setSyncingAccountId(accountId);
    syncFioMutation.mutate({ id: accountId });
  };

  const handleDisconnect = (accountId: string) => {
    if (confirm('Opravdu chcete odpojit tento Fio účet? Transakce budou zachovány.')) {
      disconnectFioMutation.mutate({ id: accountId });
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingAccount(null);
    refetch();
  };

  const handleFioDialogClose = () => {
    setIsFioDialogOpen(false);
    refetch();
  };

  return (
    <div className="flex flex-col">
      <Header title="Bankovnictví">
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/banking/transactions">
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Transakce
            </Link>
          </Button>
          <Button variant="outline" onClick={() => setIsFioDialogOpen(true)}>
            <Link2 className="mr-2 h-4 w-4" />
            Připojit Fio
          </Button>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Přidat ručně
          </Button>
        </div>
      </Header>

      <div className="flex-1 p-4 md:p-6">
        {/* Empty State */}
        {!isLoading && (!accounts || accounts.length === 0) && (
          <Card className="border-dashed">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
              <CardTitle>Zatím žádné bankovní účty</CardTitle>
              <CardDescription>
                Přidejte bankovní účet pro sledování plateb a zahrnutí detailů na fakturách
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Přidat účet
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Bank Accounts Grid */}
        {accounts && accounts.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map((account: typeof accounts[number]) => (
              <Card key={account.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <CreditCard className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {account.name}
                          {account.isDefault && (
                            <Badge variant="secondary" className="text-xs">
                              Výchozí
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>{account.bankName}</CardDescription>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(account.id)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Upravit
                        </DropdownMenuItem>
                        {!account.isDefault && (
                          <DropdownMenuItem
                            onClick={() => setDefaultMutation.mutate({ id: account.id })}
                          >
                            <Star className="mr-2 h-4 w-4" />
                            Nastavit jako výchozí
                          </DropdownMenuItem>
                        )}
                        {account.provider === 'FIO' && account.isActive && (
                          <>
                            <DropdownMenuItem
                              onClick={() => handleSync(account.id)}
                              disabled={syncingAccountId === account.id}
                            >
                              <RefreshCw className={`mr-2 h-4 w-4 ${syncingAccountId === account.id ? 'animate-spin' : ''}`} />
                              {syncingAccountId === account.id ? 'Synchronizuji...' : 'Synchronizovat transakce'}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDisconnect(account.id)}>
                              <Unlink className="mr-2 h-4 w-4" />
                              Odpojit
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDelete(account.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Smazat
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Číslo účtu</span>
                      <span className="font-mono">{account.accountNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Měna</span>
                      <span>{account.currency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Poskytovatel</span>
                      <Badge variant={account.provider === 'FIO' ? 'default' : 'secondary'} className="text-xs">
                        {account.provider === 'FIO' ? 'Fio Banka' : 'Ruční'}
                      </Badge>
                    </div>
                    {account.provider === 'FIO' && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Stav</span>
                        <Badge variant={account.isActive ? 'success' : 'outline'} className="text-xs">
                          {account.isActive ? 'Připojeno' : 'Odpojeno'}
                        </Badge>
                      </div>
                    )}
                    {account.lastSyncAt && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Poslední synchronizace</span>
                        <span className="text-xs">
                          {new Date(account.lastSyncAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      <BankAccountDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        accountId={editingAccount}
      />

      <ConnectFioDialog
        open={isFioDialogOpen}
        onOpenChange={handleFioDialogClose}
      />
    </div>
  );
}
