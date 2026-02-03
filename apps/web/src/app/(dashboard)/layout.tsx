'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Sidebar } from '@/components/layout/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, currentOrganization, organizations } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isOnboardingPage = pathname === '/onboarding';
  const hasNoOrganization = !isLoading && isAuthenticated && organizations.length === 0;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  useEffect(() => {
    // Redirect to onboarding if user has no organization
    if (hasNoOrganization && !isOnboardingPage) {
      router.push('/onboarding');
    }
    // Redirect away from onboarding if user has organization
    if (isAuthenticated && organizations.length > 0 && isOnboardingPage) {
      router.push('/');
    }
  }, [hasNoOrganization, isOnboardingPage, isAuthenticated, organizations.length, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Show onboarding without sidebar
  if (isOnboardingPage) {
    return <>{children}</>;
  }

  // Show loading if no organization and not on onboarding
  if (hasNoOrganization) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar - hidden on mobile */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
