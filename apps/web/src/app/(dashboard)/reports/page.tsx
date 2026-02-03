'use client';

import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, TrendingUp, Receipt, PiggyBank } from 'lucide-react';
import Link from 'next/link';

const reports = [
  {
    title: 'Report příjmů',
    description: 'Zobrazit vaše příjmy podle období, zákazníka nebo kategorie',
    icon: TrendingUp,
    href: '/reports/income',
  },
  {
    title: 'Report nákladů',
    description: 'Analyzovat vaše výdaje podle kategorie a časového období',
    icon: Receipt,
    href: '/reports/expenses',
  },
  {
    title: 'Cash flow',
    description: 'Sledovat peníze přicházející a odcházející',
    icon: PiggyBank,
    href: '/reports/cash-flow',
  },
  {
    title: 'Souhrn DPH',
    description: 'Připravit vaše daňová přiznání DPH s vypočtenými částkami',
    icon: BarChart3,
    href: '/reports/vat',
  },
];

export default function ReportsPage() {
  return (
    <div className="flex flex-col">
      <Header title="Reporty" />

      <div className="flex-1 p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-2">
          {reports.map((report) => (
            <Link key={report.title} href={report.href}>
              <Card className="cursor-pointer transition-colors hover:bg-muted/50">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <report.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{report.title}</CardTitle>
                      <CardDescription>{report.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
