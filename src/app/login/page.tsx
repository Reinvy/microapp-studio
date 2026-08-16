'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { contentService } from '@/services/contentService';
import type { AuthCopy } from '@/db/contentRepo';
import AuthShell from '@/components/auth/AuthShell';
import { authCopy } from '@/lib/authCopy';
import {
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
    const v = authCopy.validation;
    if (!email) newErrors.email = v.emailRequired;
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = v.emailInvalid;
    if (!password) newErrors.password = v.passwordRequired;
    else if (password.length < 6) newErrors.password = v.passwordTooShort;
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
        setApiError(result.error || authCopy.apiError.loginFailed);
      }
    } catch {
      setApiError(authCopy.apiError.unexpected);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={copy.title}
      subtitle={copy.subtitle}
      logoClass="bg-[#D5B8F5]"
      headerClass="bg-gradient-to-r from-[#D5B8F5] to-[#FFD5E5]"
      blobClasses={['bg-[#FFD5E5]', 'bg-[#C5E8F7]', 'bg-[#FFF2C5]', 'bg-[#D5B8F5]']}
    >
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
                    aria-label={showPassword ? authCopy.aria.hidePassword : authCopy.aria.showPassword}>
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
    </AuthShell>
  );
}
