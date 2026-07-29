'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Zap,
  AppWindow,
  Shield,
  ArrowRight,
  Star,
  Code2,
  Brain,
  Bot,
  Layout,
  Copy,
  Eye,
  Play,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import FeatureCard from '@/components/landing/FeatureCard';
import StepCard from '@/components/landing/StepCard';

const features = [
  {
    icon: Brain,
    title: 'AI Prompt Builder',
    description:
      'Describe your app in plain English and watch the AI generate a complete form or interface automatically.',
  },
  {
    icon: Layout,
    title: 'Drag & Drop Editor',
    description:
      'Visually arrange fields, reorder inputs, and customize layouts with an intuitive drag-and-drop canvas.',
  },
  {
    icon: Code2,
    title: 'Custom JS Nodes',
    description:
      'Add custom JavaScript logic nodes for calculations, validations, and complex app behavior.',
  },
  {
    icon: Shield,
    title: 'Local-First Storage',
    description:
      'Your data stays on your device with IndexedDB-backed persistence. Full privacy, zero cloud dependency.',
  },
  {
    icon: Play,
    title: 'App Runner',
    description:
      'Run your micro-apps instantly in a clean, interactive preview. Test inputs, see outputs, iterate fast.',
  },
  {
    icon: Zap,
    title: 'Dev Playground',
    description:
      'Live preview with Monaco editor, real-time schema validation, and instant feedback as you build.',
  },
];

const steps = [
  {
    icon: Brain,
    title: 'Describe your app',
    description:
      'Tell us what you want to build in plain language — "A BMI calculator" or "A todo list with categories".',
  },
  {
    icon: Layout,
    title: 'Customize with drag & drop',
    description:
      'Fine-tune the generated fields, add logic nodes, and arrange the layout visually.',
  },
  {
    icon: Eye,
    title: 'Run & share',
    description:
      'Launch your micro-app instantly, test it out, and share it with anyone via a unique link.',
  },
];

const stats = [
  { icon: Copy, value: '50+', label: 'Templates' },
  { icon: Shield, value: '100%', label: 'Local-First' },
  { icon: Code2, value: 'Open', label: 'Source' },
  { icon: Star, value: 'MIT', label: 'License' },
];

export default function LandingPage() {

  useEffect(() => {
    // Smooth scroll for anchor links
    const handleAnchorClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a[href^="#"]');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      e.preventDefault();
      const el = document.querySelector(href);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    document.addEventListener('click', handleAnchorClick);
    return () => document.removeEventListener('click', handleAnchorClick);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* ─── HERO SECTION ─── */}
        <section className="hero-clay relative flex min-h-screen items-center overflow-hidden pt-16">
          {/* Floating decorative elements in clay pastel */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute left-[10%] top-[20%] animate-float text-[#D5B8F5]/30">
              <Sparkles className="h-16 w-16" />
            </div>
            <div
              className="absolute right-[15%] top-[30%] animate-float text-[#FFD5E5]/30"
              style={{ animationDelay: '1s' }}
            >
              <Zap className="h-20 w-20" />
            </div>
            <div
              className="absolute bottom-[25%] left-[20%] animate-float text-[#C5E8F7]/30"
              style={{ animationDelay: '0.5s' }}
            >
              <AppWindow className="h-12 w-12" />
            </div>
            <div
              className="absolute bottom-[35%] right-[10%] animate-float text-[#D5B8F5]/30"
              style={{ animationDelay: '1.5s' }}
            >
              <Bot className="h-14 w-14" />
            </div>
            {/* Soft pastel gradient orbs */}
            <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-gradient-to-br from-[#D5B8F5]/20 via-[#FFD5E5]/10 to-transparent blur-3xl" />
            <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-gradient-to-br from-[#C5E8F7]/20 via-[#FFF2C5]/10 to-transparent blur-3xl" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              {/* Badge — clay pill */}
              <div className="mb-6 inline-flex items-center gap-1.5 rounded-full bg-[#D5B8F5]/30 px-5 py-2 text-xs font-medium text-foreground shadow-[4px_4px_8px_var(--clay-shadow-dark),-4px_-4px_8px_var(--clay-shadow-light)]">
                <Sparkles className="h-3.5 w-3.5" />
                AI-Powered Micro-App Builder
              </div>

              <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl text-foreground">
                Create{' '}
                <span className="gradient-text">Mini Apps</span>
                <br />
                with AI Prompts
              </h1>

              <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                Build fully functional micro-apps by describing them in plain English. Drag, drop,
                and customize — no coding required.
              </p>

              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/register">
                  <Button variant="primary" size="lg" className="h-12 gap-2 px-8 text-base">
                    Get Started Free
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-12 gap-2 px-8 text-base"
                  >
                    <Eye className="h-5 w-5" />
                    View Demo
                  </Button>
                </Link>
              </div>
            </div>

            {/* Hero illustration / showcase — clay card */}
            <div className="mt-16 flex justify-center">
              <div className="relative w-full max-w-4xl">
                <div className="aspect-[16/9] w-full rounded-3xl bg-card shadow-[8px_8px_16px_var(--clay-shadow-dark),-6px_-6px_14px_var(--clay-shadow-light)]">
                  <div className="flex h-full flex-col">
                    {/* Fake window chrome */}
                    <div className="flex items-center gap-1.5 border-b border-border/40 px-4 py-3">
                      <div className="h-3 w-3 rounded-full bg-[#FFD0D0] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)]" />
                      <div className="h-3 w-3 rounded-full bg-[#FFF2C5] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)]" />
                      <div className="h-3 w-3 rounded-full bg-[#C5F0D5] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)]" />
                      <div className="ml-4 flex-1 rounded-xl bg-[#F5EDE5] px-3 py-1 text-center text-xs text-muted-foreground shadow-[inset_2px_2px_4px_var(--clay-shadow-dark),inset_-2px_-2px_4px_var(--clay-shadow-light)]">
                        my-micro-app
                      </div>
                    </div>
                    {/* Fake app content */}
                    <div className="flex flex-1 items-center justify-center gap-4 p-8">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <AppWindow className="h-12 w-12 text-[#D5B8F5]/60" />
                        <span className="text-sm font-medium">Preview your app</span>
                      </div>
                      <ChevronRight className="h-8 w-8 text-muted-foreground/40" />
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Code2 className="h-12 w-12 text-[#FFD5E5]/60" />
                        <span className="text-sm font-medium">Edit with AI</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── FEATURES SECTION ─── */}
        <section id="features" className="relative scroll-mt-20 py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-14 max-w-2xl text-center">
              <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Everything you need to build{' '}
                <span className="gradient-text">micro-apps</span>
              </h2>
              <p className="text-lg leading-relaxed text-muted-foreground">
                From AI-powered generation to a fully interactive runtime — all in one beautiful
                studio.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <FeatureCard key={feature.title} {...feature} />
              ))}
            </div>
          </div>
        </section>

        {/* ─── STATS SECTION ─── */}
        <section className="border-y border-border/40 bg-muted/50 py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
              {stats.map((stat) => (
                <div key={stat.label} className="flex flex-col items-center text-center">
                  <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-clay-purple text-foreground shadow-[5px_5px_10px_var(--clay-shadow-dark),-5px_-5px_10px_var(--clay-shadow-light)]">
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <div className="text-2xl font-bold tracking-tight text-foreground">
                    {stat.value}
                  </div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── HOW IT WORKS ─── */}
        <section id="how-it-works" className="relative scroll-mt-20 py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                How it <span className="gradient-text">works</span>
              </h2>
              <p className="text-lg leading-relaxed text-muted-foreground">
                Three simple steps to go from idea to running micro-app.
              </p>
            </div>

            <div className="grid gap-12 md:grid-cols-3 md:gap-8">
              {steps.map((step, i) => (
                <StepCard
                  key={step.title}
                  number={i + 1}
                  {...step}
                  isLast={i === steps.length - 1}
                />
              ))}
            </div>
          </div>
        </section>

        {/* ─── CTA SECTION ─── */}
        <section className="relative py-24">
          {/* Pastel gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#D5B8F5]/15 via-[#FFD5E5]/10 to-[#C5E8F7]/15" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(213,184,245,0.12),transparent_50%)]" />

          <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl">
              <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Ready to build your{' '}
                <span className="gradient-text">first micro-app</span>?
              </h2>
              <p className="mb-10 text-lg leading-relaxed text-muted-foreground">
                Join users building everything from calculators to databases. No signup required to
                start — just describe and go.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/register">
                  <Button variant="primary" size="lg" className="h-12 gap-2 px-8 text-base">
                    Get Started Free
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-12 gap-2 px-8 text-base"
                  >
                    Sign In
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
