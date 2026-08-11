'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { contentService } from '@/services/contentService';
import type { AuthCopy } from '@/db/contentRepo';
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

// Login copy is seeded via contentRepo ('auth-copy') — fallback keeps first
// paint intact and mirrors the seeded defaults.
const fallbackAuthCopy: AuthCopy['login'] = {
  title: 'Welcome back',
  subtitle: 'Sign in to continue building your apps.',
  emailLabel: 'Email',
  emailPlaceholder: 'you@example.com',
  passwordLabel: 'Password',
  passwordPlaceholder: 'Enter your password',
  forgotPassword: 'Forgot password?',
  submitLabel: 'Sign In',
  submittingLabel: 'Signing in...',
  socialDivider: 'Or continue with',
  googleLabel: 'Google',
  githubLabel: 'GitHub',
  bottomPrefix: "Don't have an account?",
  bottomCta: 'Sign up',
};

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

  const [copy, setCopy] = useState<AuthCopy['login']>(fallbackAuthCopy);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load auth copy from IndexedDB — falls back to hardcoded defaults.
    contentService.getContent<AuthCopy>('auth-copy')
      .then((authCopy) => {
        if (authCopy && typeof authCopy.login === 'object') {
          setCopy(authCopy.login);
        }
      })
      .catch(() => {
        // Fallback already set — content service is fail-safe.
      });
  }, []);

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
    <div className="flex min-h-screen items-center justify-center bg-clay-cream p-4 relative overflow-hidden">
      {/* Decorative clay blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-[#FFD5E5] clay" style={{filter:'blur(40px)', opacity:0.5}} />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 rounded-full bg-[#C5E8F7] clay" style={{filter:'blur(50px)', opacity:0.4}} />
        <div className="absolute top-1/3 left-1/4 w-64 h-64 rounded-full bg-[#FFF2C5] clay" style={{filter:'blur(45px)', opacity:0.3}} />
        <div className="absolute bottom-1/3 right-1/4 w-72 h-72 rounded-full bg-[#D5B8F5] clay" style={{filter:'blur(45px)', opacity:0.25}} />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl clay-sm bg-[#D5B8F5] text-clay-foreground transition-transform duration-300 group-hover:scale-105">
              <AppWindow className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-clay-foreground">MicroApp Studio</span>
          </Link>
        </div>

        <div className="clay-card overflow-hidden">
          <div className="bg-gradient-to-r from-[#D5B8F5] to-[#FFD5E5] px-6 py-5">
            <h1 className="text-xl font-bold text-clay-foreground">{copy.title}</h1>
            <p className="mt-1 text-sm text-clay-foreground/70">{copy.subtitle}</p>
          </div>

          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              {apiError && (
                <div className="clay-sm bg-[#FFD0D0] px-4 py-3 text-sm text-clay-foreground">
                  {apiError}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="login-email" className="text-sm font-medium text-clay-foreground">{copy.emailLabel}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-clay-muted" />
                  <input
                    id="login-email" type="email" placeholder={copy.emailPlaceholder}
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((p) => ({ ...p, email: undefined })); }}
                    className={`clay-input h-11 w-full pl-10 text-sm text-clay-foreground ${errors.email ? 'clay-input-error' : ''}`}
                    autoComplete="email" autoFocus
                  />
                </div>
                {errors.email && <p className="text-xs text-[#E87A7A]">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="login-password" className="text-sm font-medium text-clay-foreground">{copy.passwordLabel}</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-clay-muted" />
                  <input
                    id="login-password" type={showPassword ? 'text' : 'password'} placeholder={copy.passwordPlaceholder}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((p) => ({ ...p, password: undefined })); }}
                    className={`clay-input h-11 w-full pl-10 pr-10 text-sm text-clay-foreground ${errors.password ? 'clay-input-error' : ''}`}
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-clay-muted hover:text-clay-foreground"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-[#E87A7A]">{errors.password}</p>}
              </div>

              <div className="flex justify-end">
                <button type="button" className="text-xs text-clay-muted underline-offset-4 hover:text-clay-foreground hover:underline">
                  {copy.forgotPassword}
                </button>
              </div>

              <button type="submit" disabled={loading}
                className="clay-button h-11 w-full flex items-center justify-center gap-2 text-sm font-medium text-clay-foreground bg-[#D5B8F5] disabled:opacity-60">
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> {copy.submittingLabel}</>
                ) : (
                  <>{copy.submitLabel} <ArrowRight className="h-4 w-4" /></>
                )}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#E8E0D8]" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#FFFFFFF0] px-2 text-clay-muted">{copy.socialDivider}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button type="button" className="clay-sm flex h-11 items-center justify-center gap-2 bg-[#C5E8F7] text-sm font-medium text-clay-foreground">
                <Globe className="h-4 w-4" /> {copy.googleLabel}
              </button>
              <button type="button" className="clay-sm flex h-11 items-center justify-center gap-2 bg-[#FFD5E5] text-sm font-medium text-clay-foreground">
                <Globe className="h-4 w-4" /> {copy.githubLabel}
              </button>
            </div>

            <p className="mt-6 text-center text-sm text-clay-muted">
              {copy.bottomPrefix}{' '}
              <Link href="/register" className="font-medium text-clay-foreground underline-offset-4 hover:underline">{copy.bottomCta}</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
