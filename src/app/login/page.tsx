'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AppWindow,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  Globe,
} from 'lucide-react';

export default function LoginPage() {
  return (
    <AuthProvider>
      <LoginForm />
    </AuthProvider>
  );
}

function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Invalid email format';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        router.push('/app');
      } else {
        setApiError(result.error || 'Invalid credentials. Please try again.');
      }
    } catch {
      setApiError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/50 p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-purple-500 text-white shadow-md transition-transform duration-300 group-hover:scale-105">
              <AppWindow className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold tracking-tight gradient-text">MicroApp Studio</span>
          </Link>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card shadow-elevated">
          <div className="rounded-t-2xl bg-gradient-to-r from-primary to-purple-500 px-6 py-5">
            <h1 className="text-xl font-bold text-white">Welcome back</h1>
            <p className="mt-1 text-sm text-white/80">Sign in to continue building your apps.</p>
          </div>

          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {apiError && (
                <div className="animate-slide-down rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {apiError}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="login-email" className="text-sm font-medium text-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="login-email" type="email" placeholder="you@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((p) => ({ ...p, email: undefined })); }}
                    className={`h-11 pl-10 ${errors.email ? 'border-destructive ring-1 ring-destructive' : ''}`}
                    autoComplete="email" autoFocus
                  />
                </div>
                {errors.email && <p className="animate-slide-down text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="login-password" className="text-sm font-medium text-foreground">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="login-password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((p) => ({ ...p, password: undefined })); }}
                    className={`h-11 pl-10 pr-10 ${errors.password ? 'border-destructive ring-1 ring-destructive' : ''}`}
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="animate-slide-down text-xs text-destructive">{errors.password}</p>}
              </div>

              <div className="flex justify-end">
                <button type="button" className="text-xs text-muted-foreground underline-offset-4 hover:text-primary hover:underline">
                  Forgot password?
                </button>
              </div>

              <Button type="submit" disabled={loading} className="h-11 w-full gap-2 text-sm font-medium shadow-sm">
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Signing in...</>
                ) : (
                  <>Sign In <ArrowRight className="h-4 w-4" /></>
                )}
              </Button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/60" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button type="button" className="flex h-11 items-center justify-center gap-2 rounded-lg border border-border/60 bg-background text-sm font-medium text-foreground transition-colors hover:bg-accent">
                <Globe className="h-4 w-4" /> Google
              </button>
              <button type="button" className="flex h-11 items-center justify-center gap-2 rounded-lg border border-border/60 bg-background text-sm font-medium text-foreground transition-colors hover:bg-accent">
                <Globe className="h-4 w-4" /> GitHub
              </button>
            </div>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="font-medium text-primary underline-offset-4 hover:underline">Sign up</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
