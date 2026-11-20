'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
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
import { contentService } from '@/services/contentService';
import type { FeatureItem, StepItem, StatItem, HeroContent, HeroShowcase, CtaContent, LandingSections } from '@/db/contentRepo';
import { pickPastelClass } from '@/lib/claymorphism';

// Icon registry — maps stored icon names to Lucide components
const iconRegistry: Record<string, LucideIcon> = {
  Brain, Layout, Code2, Shield, Play, Zap, Copy, Star, Eye,
};

interface FeatureData { icon: LucideIcon; title: string; description: string; }
interface StepData { icon: LucideIcon; title: string; description: string; }
interface StatData { icon: LucideIcon; value: string; label: string; }

function resolveIcon(name: string, fallback: LucideIcon): LucideIcon {
  return iconRegistry[name] || fallback;
}

// Fallback data used when DB is empty
const fallbackFeatures: FeatureData[] = [
  { icon: Brain, title: 'AI Prompt Builder', description: 'Describe your app in plain English and watch the AI generate a complete form or interface automatically.' },
  { icon: Layout, title: 'Drag & Drop Editor', description: 'Visually arrange fields, reorder inputs, and customize layouts with an intuitive drag-and-drop canvas.' },
  { icon: Code2, title: 'Custom JS Nodes', description: 'Add custom JavaScript logic nodes for calculations, validations, and complex app behavior.' },
  { icon: Shield, title: 'Local-First Storage', description: 'Your data stays on your device with IndexedDB-backed persistence. Full privacy, zero cloud dependency.' },
  { icon: Play, title: 'App Runner', description: 'Run your micro-apps instantly in a clean, interactive preview. Test inputs, see outputs, iterate fast.' },
  { icon: Zap, title: 'Dev Playground', description: 'Live preview with Monaco editor, real-time schema validation, and instant feedback as you build.' },
];

const fallbackSteps: StepData[] = [
  { icon: Brain, title: 'Describe your app', description: 'Tell us what you want to build in plain language — "A BMI calculator" or "A todo list with categories".' },
  { icon: Layout, title: 'Customize with drag & drop', description: 'Fine-tune the generated fields, add logic nodes, and arrange the layout visually.' },
  { icon: Eye, title: 'Run & share', description: 'Launch your micro-app instantly, test it out, and share it with anyone via a unique link.' },
];

const fallbackStats: StatData[] = [
  { icon: Copy, value: '50+', label: 'Templates' },
  { icon: Shield, value: '100%', label: 'Local-First' },
  { icon: Code2, value: 'Open', label: 'Source' },
  { icon: Star, value: 'MIT', label: 'License' },
];

// Hero copy is seeded via contentRepo ('hero-content') — fallback keeps SSR/first paint intact
const fallbackHero: HeroContent = {
  badge: 'AI-Powered Micro-App Builder',
  titleLine1: 'Create',
  titleHighlight: 'Mini Apps',
  titleLine2: 'with AI Prompts',
  subtitle:
    'Build fully functional micro-apps by describing them in plain English. Drag, drop, and customize — no coding required.',
  primaryCta: { label: 'Get Started Free', href: '/register' },
  secondaryCta: { label: 'View Demo', href: '/login' },
};

// CTA + section headings are seeded via contentRepo ('landing-cta', 'landing-sections') —
// fallbacks keep SSR/first paint intact and mirror the seeded defaults.
const fallbackCta: CtaContent = {
  heading: 'Ready to build your',
  headingHighlight: 'first micro-app',
  subtitle:
    'Join users building everything from calculators to databases. No signup required to start — just describe and go.',
  primaryCta: { label: 'Get Started Free', href: '/register' },
  secondaryCta: { label: 'Sign In', href: '/login' },
};

// Hero browser-mockup copy is seeded via contentRepo ('hero-showcase') —
// fallback keeps SSR/first paint intact and mirrors the seeded defaults.
const fallbackShowcase: HeroShowcase = {
  windowUrl: 'my-micro-app',
  leftTile: 'Preview your app',
  rightTile: 'Edit with AI',
};

const fallbackSections: LandingSections = {
  features: {
    title: 'Everything you need to build',
    highlight: 'micro-apps',
    subtitle:
      'From AI-powered generation to a fully interactive runtime — all in one beautiful studio.',
  },
  howItWorks: {
    title: 'How it',
    highlight: 'works',
    subtitle: 'Three simple steps to go from idea to running micro-app.',
  },
};

export default function LandingPage() {
  const [features, setFeatures] = useState<FeatureData[]>(fallbackFeatures);
  const [steps, setSteps] = useState<StepData[]>(fallbackSteps);
  const [stats, setStats] = useState<StatData[]>(fallbackStats);
  const [hero, setHero] = useState<HeroContent>(fallbackHero);
  const [showcase, setShowcase] = useState<HeroShowcase>(fallbackShowcase);
  const [cta, setCta] = useState<CtaContent>(fallbackCta);
  const [sections, setSections] = useState<LandingSections>(fallbackSections);

  useEffect(() => {
    // Load dynamic content from IndexedDB — falls back to hardcoded data if DB is empty.
    // ONE batched read through the content service (single IndexedDB round trip
    // via `anyOf`) instead of six sequential `contentRepo.getByType` calls. The
    // service caches each type, so Navbar/Footer single-type reads that mount
    // in the same tick become instant cache hits.
    contentService.getContentMany([
      'hero-content',
      'hero-showcase',
      'landing-features',
      'landing-steps',
      'landing-stats',
      'landing-cta',
      'landing-sections',
    ]).then((map) => {
      const heroContent = map['hero-content'];
      if (heroContent && typeof heroContent.data === 'object' && !Array.isArray(heroContent.data)) {
        setHero(heroContent.data as HeroContent);
      }

      const showcaseContent = map['hero-showcase'];
      if (showcaseContent && typeof showcaseContent.data === 'object' && !Array.isArray(showcaseContent.data)) {
        setShowcase(showcaseContent.data as HeroShowcase);
      }

      const featuresContent = map['landing-features'];
      if (featuresContent && Array.isArray(featuresContent.data)) {
        setFeatures((featuresContent.data as FeatureItem[]).map(f => ({ ...f, icon: resolveIcon(f.icon, Brain) })));
      }

      const stepsContent = map['landing-steps'];
      if (stepsContent && Array.isArray(stepsContent.data)) {
        setSteps((stepsContent.data as StepItem[]).map(s => ({ ...s, icon: resolveIcon(s.icon, Brain) })));
      }

      const statsContent = map['landing-stats'];
      if (statsContent && Array.isArray(statsContent.data)) {
        setStats((statsContent.data as StatItem[]).map(s => ({ ...s, icon: resolveIcon(s.icon, Copy) })));
      }

      const ctaContent = map['landing-cta'];
      if (ctaContent && typeof ctaContent.data === 'object' && !Array.isArray(ctaContent.data)) {
        setCta(ctaContent.data as CtaContent);
      }

      const sectionsContent = map['landing-sections'];
      if (sectionsContent && typeof sectionsContent.data === 'object' && !Array.isArray(sectionsContent.data)) {
        setSections(sectionsContent.data as LandingSections);
      }
    }).catch(() => {
      // Fallbacks already set — content service is fail-safe.
    });
  }, []);

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
                {hero.badge}
              </div>

              <h1 className="mb-6 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl text-foreground">
                {hero.titleLine1}{' '}
                <span className="gradient-text">{hero.titleHighlight}</span>
                <br />
                {hero.titleLine2}
              </h1>

              <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                {hero.subtitle}
              </p>

              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href={hero.primaryCta.href}>
                  <Button variant="primary" size="lg" className="h-12 gap-2 px-8 text-base">
                    {hero.primaryCta.label}
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href={hero.secondaryCta.href}>
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-12 gap-2 px-8 text-base"
                  >
                    <Eye className="h-5 w-5" />
                    {hero.secondaryCta.label}
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
                        {showcase.windowUrl}
                      </div>
                    </div>
                    {/* Fake app content */}
                    <div className="flex flex-1 items-center justify-center gap-4 p-8">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <AppWindow className="h-12 w-12 text-[#D5B8F5]/60" />
                        <span className="text-sm font-medium">{showcase.leftTile}</span>
                      </div>
                      <ChevronRight className="h-8 w-8 text-muted-foreground/40" />
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Code2 className="h-12 w-12 text-[#FFD5E5]/60" />
                        <span className="text-sm font-medium">{showcase.rightTile}</span>
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
                {sections.features.title}{' '}
                <span className="gradient-text">{sections.features.highlight}</span>
              </h2>
              <p className="text-lg leading-relaxed text-muted-foreground">
                {sections.features.subtitle}
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
                  <div className={`mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-foreground shadow-[5px_5px_10px_var(--clay-shadow-dark),-5px_-5px_10px_var(--clay-shadow-light)] ${pickPastelClass(stat.label)}`}>
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
                {sections.howItWorks.title}{' '}
                <span className="gradient-text">{sections.howItWorks.highlight}</span>
              </h2>
              <p className="text-lg leading-relaxed text-muted-foreground">
                {sections.howItWorks.subtitle}
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
                {cta.heading}{' '}
                <span className="gradient-text">{cta.headingHighlight}</span>?
              </h2>
              <p className="mb-10 text-lg leading-relaxed text-muted-foreground">
                {cta.subtitle}
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href={cta.primaryCta.href}>
                  <Button variant="primary" size="lg" className="h-12 gap-2 px-8 text-base">
                    {cta.primaryCta.label}
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link href={cta.secondaryCta.href}>
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-12 gap-2 px-8 text-base"
                  >
                    {cta.secondaryCta.label}
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
