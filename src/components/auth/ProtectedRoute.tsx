'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

function GradientSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          {/* Spinning gradient circle */}
          <div
            className="h-12 w-12 animate-spin rounded-full"
            style={{
              border: '3px solid transparent',
              borderTopColor: '#6366f1',
              borderRightColor: '#a855f7',
              borderBottomColor: '#6366f1',
              borderLeftColor: 'transparent',
            }}
          />
          {/* Inner glow */}
          <div
            className="absolute inset-0 rounded-full opacity-30 blur-sm"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            }}
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
    return <GradientSpinner />;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
