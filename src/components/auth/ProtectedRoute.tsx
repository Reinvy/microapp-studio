'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppWindow } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

function ClaySpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FFF8F0]">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-[50%] clay-sm bg-[#D5B8F5] animate-float">
          <AppWindow className="h-7 w-7 text-clay-foreground" />
        </div>
        <div className="flex items-center gap-2 text-sm text-clay-muted">
          <div className="h-2 w-2 rounded-full bg-[#D5B8F5] animate-pulse" />
          <span>Loading your workspace…</span>
        </div>
      </div>
    </div>
  );
}

export interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading) {
    return <ClaySpinner />;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
