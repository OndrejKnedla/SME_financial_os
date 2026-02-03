'use client';

import { Header } from '@/components/layout/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, FileText, Users, Link as LinkIcon, Bell, Shield, FileCode2 } from 'lucide-react';
import Link from 'next/link';

const settingsSections = [
  {
    title: 'Organization',
    description: 'Company details, address, and tax information',
    icon: Building2,
    href: '/settings/organization',
  },
  {
    title: 'Invoice Settings',
    description: 'Invoice numbering, templates, and defaults',
    icon: FileText,
    href: '/settings/invoices',
  },
  {
    title: 'KSeF (Poland)',
    description: 'Polish e-invoice system integration',
    icon: FileCode2,
    href: '/settings/ksef',
  },
  {
    title: 'Team',
    description: 'Invite members and manage roles',
    icon: Users,
    href: '/settings/team',
  },
  {
    title: 'Integrations',
    description: 'Connected banks and services',
    icon: LinkIcon,
    href: '/settings/integrations',
  },
  {
    title: 'Notifications',
    description: 'Email and alert preferences',
    icon: Bell,
    href: '/settings/notifications',
  },
  {
    title: 'Security',
    description: 'Password and account security',
    icon: Shield,
    href: '/settings/security',
  },
];

export default function SettingsPage() {
  return (
    <div className="flex flex-col">
      <Header title="Settings" />

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
