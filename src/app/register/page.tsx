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
  User,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  Globe,
  Check,
} from 'lucide-react';

export default function RegisterPage() {
  return (
    <AuthProvider>
      <RegisterForm />
    </AuthProvider>
  );
}

function RegisterForm() {
  const router = useRouter();
  const { register } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name) newErrors.name = 'Name is required';
    else if (name.length < 2) newErrors.name = 'Name must be at least 2 characters';
    if (!email) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Invalid email format';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    if (password !== confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!agreeTerms) newErrors.terms = 'You must agree to the terms';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;
    setLoading(true);
    try {
      const result = await register(email, password, name);
      if (result.success) {
        // Auto-login after register
        router.push('/app');
      } else {
        setApiError(result.error || 'Registration failed. Please try again.');
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
          <div className="rounded-t-2xl bg-gradient-to-r from-purple-500 to-secondary px-6 py-5">
            <h1 className="text-xl font-bold text-white">Create an account</h1>
            <p className="mt-1 text-sm text-white/80">Start building micro-apps in minutes.</p>
          </div>

          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {apiError && (
                <div className="animate-slide-down rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {apiError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Your full name" value={name}
                    onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((p) => ({ ...p, name: '' })); }}
                    className={`h-11 pl-10 ${errors.name ? 'border-destructive ring-1 ring-destructive' : ''}`}
                    autoFocus
                  />
                </div>
                {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email" placeholder="you@example.com" value={email}
                    onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((p) => ({ ...p, email: '' })); }}
                    className={`h-11 pl-10 ${errors.email ? 'border-destructive ring-1 ring-destructive' : ''}`}
                    autoComplete="email"
                  />
                </div>
                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type={showPassword ? 'text' : 'password'} placeholder="At least 6 characters" value={password}
                    onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((p) => ({ ...p, password: '' })); }}
                    className={`h-11 pl-10 pr-10 ${errors.password ? 'border-destructive ring-1 ring-destructive' : ''}`}
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? 'Hide' : 'Show'}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type={showPassword ? 'text' : 'password'} placeholder="Repeat your password" value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); if (errors.confirmPassword) setErrors((p) => ({ ...p, confirmPassword: '' })); }}
                    className={`h-11 pl-10 ${errors.confirmPassword ? 'border-destructive ring-1 ring-destructive' : ''}`}
                    autoComplete="new-password"
                  />
                </div>
                {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword}</p>}
              </div>

              {/* Terms */}
              <div className="flex items-start gap-2">
                <input
                  type="checkbox" id="terms" checked={agreeTerms}
                  onChange={(e) => { setAgreeTerms(e.target.checked); if (errors.terms) setErrors((p) => ({ ...p, terms: '' })); }}
                  className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <label htmlFor="terms" className="text-xs leading-relaxed text-muted-foreground">
                  I agree to the{' '}
                  <button type="button" className="text-primary underline underline-offset-2 hover:text-primary/80">Terms of Service</button>
                  {' '}and{' '}
                  <button type="button" className="text-primary underline underline-offset-2 hover:text-primary/80">Privacy Policy</button>
                </label>
              </div>
              {errors.terms && <p className="text-xs text-destructive">{errors.terms}</p>}

              <Button type="submit" disabled={loading} className="h-11 w-full gap-2 text-sm font-medium shadow-sm">
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Creating account...</>
                ) : (
                  <>Create account <ArrowRight className="h-4 w-4" /></>
                )}
              </Button>
            </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border/60" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or sign up with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button type="button" className="flex h-11 items-center justify-center gap-2 rounded-lg border border-border/60 bg-background text-sm font-medium transition-colors hover:bg-accent">
                <Globe className="h-4 w-4" /> Google
              </button>
              <button type="button" className="flex h-11 items-center justify-center gap-2 rounded-lg border border-border/60 bg-background text-sm font-medium transition-colors hover:bg-accent">
                <Globe className="h-4 w-4" /> GitHub
              </button>
            </div>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-primary underline-offset-4 hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
