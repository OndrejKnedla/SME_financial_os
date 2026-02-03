'use client';

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

type User = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
};

type Organization = {
  id: string;
  name: string;
  country: string;
  currency: string;
  role: string;
};

type AuthContextType = {
  user: User | null;
  organizations: Organization[];
  currentOrganization: Organization | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  setCurrentOrganization: (org: Organization) => void;
  refreshUser: () => Promise<void>;
  refetchUser: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrganization, setCurrentOrganizationState] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('sessionToken');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/trpc/auth.me', {
        headers: {
          authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }

      const data = await response.json();
      const result = data.result?.data;

      if (result?.user) {
        setUser(result.user);
        setOrganizations(result.organizations ?? []);

        // Restore current organization from localStorage
        const savedOrgId = localStorage.getItem('organizationId');
        const savedOrg = result.organizations?.find(
          (org: Organization) => org.id === savedOrgId
        );
        if (savedOrg) {
          setCurrentOrganizationState(savedOrg);
        } else if (result.organizations?.length > 0) {
          const firstOrg = result.organizations[0];
          setCurrentOrganizationState(firstOrg);
          localStorage.setItem('organizationId', firstOrg.id);
        }
      }
    } catch {
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('organizationId');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback((token: string, userData: User) => {
    localStorage.setItem('sessionToken', token);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('organizationId');
    setUser(null);
    setOrganizations([]);
    setCurrentOrganizationState(null);
    router.push('/login');
  }, [router]);

  const setCurrentOrganization = useCallback((org: Organization) => {
    setCurrentOrganizationState(org);
    localStorage.setItem('organizationId', org.id);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        organizations,
        currentOrganization,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        setCurrentOrganization,
        refreshUser,
        refetchUser: refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
