'use client';

import { AuthProvider } from '@/context/AuthContext';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          {children}
        </div>
      </ProtectedRoute>
    </AuthProvider>
  );
}
