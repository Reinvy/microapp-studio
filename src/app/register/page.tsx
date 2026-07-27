'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AuthProvider, useAuth } from '@/context/AuthContext';
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
    <div className="flex min-h-screen items-center justify-center bg-[#FFF8F0] p-4 relative overflow-hidden">
      {/* Decorative clay blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full bg-[#C5E8F7] clay" style={{filter:'blur(40px)', opacity:0.5}} />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-[#FFD5E5] clay" style={{filter:'blur(50px)', opacity:0.4}} />
        <div className="absolute top-1/2 left-3/4 w-64 h-64 rounded-full bg-[#FFF2C5] clay" style={{filter:'blur(45px)', opacity:0.3}} />
        <div className="absolute bottom-1/4 right-1/3 w-72 h-72 rounded-full bg-[#C5F0D5] clay" style={{filter:'blur(45px)', opacity:0.2}} />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl clay-sm bg-[#C5E8F7] text-[#5D4E37] transition-transform duration-300 group-hover:scale-105">
              <AppWindow className="h-6 w-6" />
            </div>
            <span className="text-xl font-bold tracking-tight text-[#5D4E37]">MicroApp Studio</span>
          </Link>
        </div>

        <div className="clay-card overflow-hidden">
          <div className="bg-gradient-to-r from-[#C5E8F7] to-[#D5B8F5] px-6 py-5">
            <h1 className="text-xl font-bold text-[#5D4E37]">Create an account</h1>
            <p className="mt-1 text-sm text-[#5D4E37]/70">Start building micro-apps in minutes.</p>
          </div>

          <div className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {apiError && (
                <div className="clay-sm bg-[#FFD0D0] px-4 py-3 text-sm text-[#5D4E37]">
                  {apiError}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#5D4E37]">Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B8A898]" />
                  <input
                    placeholder="Your full name" value={name}
                    onChange={(e) => { setName(e.target.value); if (errors.name) setErrors((p) => ({ ...p, name: '' })); }}
                    className={`clay-input h-11 w-full pl-10 text-sm text-[#5D4E37] ${errors.name ? 'clay-input-error' : ''}`}
                    autoFocus
                  />
                </div>
                {errors.name && <p className="text-xs text-[#E87A7A]">{errors.name}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#5D4E37]">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B8A898]" />
                  <input
                    type="email" placeholder="you@example.com" value={email}
                    onChange={(e) => { setEmail(e.target.value); if (errors.email) setErrors((p) => ({ ...p, email: '' })); }}
                    className={`clay-input h-11 w-full pl-10 text-sm text-[#5D4E37] ${errors.email ? 'clay-input-error' : ''}`}
                    autoComplete="email"
                  />
                </div>
                {errors.email && <p className="text-xs text-[#E87A7A]">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#5D4E37]">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B8A898]" />
                  <input
                    type={showPassword ? 'text' : 'password'} placeholder="At least 6 characters" value={password}
                    onChange={(e) => { setPassword(e.target.value); if (errors.password) setErrors((p) => ({ ...p, password: '' })); }}
                    className={`clay-input h-11 w-full pl-10 pr-10 text-sm text-[#5D4E37] ${errors.password ? 'clay-input-error' : ''}`}
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B8A898] hover:text-[#5D4E37]"
                    aria-label={showPassword ? 'Hide' : 'Show'}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-[#E87A7A]">{errors.password}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-[#5D4E37]">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#B8A898]" />
                  <input
                    type={showPassword ? 'text' : 'password'} placeholder="Repeat your password" value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); if (errors.confirmPassword) setErrors((p) => ({ ...p, confirmPassword: '' })); }}
                    className={`clay-input h-11 w-full pl-10 text-sm text-[#5D4E37] ${errors.confirmPassword ? 'clay-input-error' : ''}`}
                    autoComplete="new-password"
                  />
                </div>
                {errors.confirmPassword && <p className="text-xs text-[#E87A7A]">{errors.confirmPassword}</p>}
              </div>

              {/* Terms */}
              <div className="flex items-start gap-2">
                <input
                  type="checkbox" id="terms" checked={agreeTerms}
                  onChange={(e) => { setAgreeTerms(e.target.checked); if (errors.terms) setErrors((p) => ({ ...p, terms: '' })); }}
                  className="mt-1 h-4 w-4 rounded accent-[#D5B8F5]"
                />
                <label htmlFor="terms" className="text-xs leading-relaxed text-[#B8A898]">
                  I agree to the{' '}
                  <button type="button" className="text-[#5D4E37] underline underline-offset-2 hover:text-[#5D4E37]/80">Terms of Service</button>
                  {' '}and{' '}
                  <button type="button" className="text-[#5D4E37] underline underline-offset-2 hover:text-[#5D4E37]/80">Privacy Policy</button>
                </label>
              </div>
              {errors.terms && <p className="text-xs text-[#E87A7A]">{errors.terms}</p>}

              <button type="submit" disabled={loading}
                className="clay-button h-11 w-full flex items-center justify-center gap-2 text-sm font-medium text-[#5D4E37] bg-[#C5E8F7] disabled:opacity-60">
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Creating account...</>
                ) : (
                  <>Create account <ArrowRight className="h-4 w-4" /></>
                )}
              </button>
            </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#E8E0D8]" /></div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#FFFFFFF0] px-2 text-[#B8A898]">Or sign up with</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button type="button" className="clay-sm flex h-11 items-center justify-center gap-2 bg-[#FFD5E5] text-sm font-medium text-[#5D4E37]">
                <Globe className="h-4 w-4" /> Google
              </button>
              <button type="button" className="clay-sm flex h-11 items-center justify-center gap-2 bg-[#FFF2C5] text-sm font-medium text-[#5D4E37]">
                <Globe className="h-4 w-4" /> GitHub
              </button>
            </div>

            <p className="mt-6 text-center text-sm text-[#B8A898]">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-[#5D4E37] underline-offset-4 hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
