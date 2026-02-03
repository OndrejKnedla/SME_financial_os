'use client';

import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, FileText, Users, Link as LinkIcon, Bell, Shield, FileCode2 } from 'lucide-react';
import Link from 'next/link';

const settingsSections = [
  {
    title: 'Organizace',
    description: 'Detaily společnosti, adresa a daňové informace',
    icon: Building2,
    href: '/settings/organization',
  },
  {
    title: 'Nastavení faktur',
    description: 'Číslování faktur, šablony a výchozí hodnoty',
    icon: FileText,
    href: '/settings/invoices',
  },
  {
    title: 'KSeF (Polsko)',
    description: 'Integrace polského systému e-faktur',
    icon: FileCode2,
    href: '/settings/ksef',
  },
  {
    title: 'Tým',
    description: 'Pozvání členů a správa rolí',
    icon: Users,
    href: '/settings/team',
  },
  {
    title: 'Integrace',
    description: 'Připojené banky a služby',
    icon: LinkIcon,
    href: '/settings/integrations',
  },
  {
    title: 'Notifikace',
    description: 'Nastavení e-mailů a upozornění',
    icon: Bell,
    href: '/settings/notifications',
  },
  {
    title: 'Zabezpečení',
    description: 'Heslo a zabezpečení účtu',
    icon: Shield,
    href: '/settings/security',
  },
];

export default function SettingsPage() {
  return (
    <div className="flex flex-col">
      <Header title="Nastavení" />

      <div className="flex-1 p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {settingsSections.map((section) => (
            <Link key={section.title} href={section.href}>
              <Card className="cursor-pointer transition-colors hover:bg-muted/50">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <section.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{section.title}</CardTitle>
                      <CardDescription>{section.description}</CardDescription>
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
