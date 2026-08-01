'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppWindow, Globe, MessageCircle } from 'lucide-react';
import { contentRepo, type FooterColumn } from '@/db/contentRepo';

const fallbackFooterColumns: FooterColumn[] = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#' },
      { label: 'Changelog', href: '#' },
      { label: 'Documentation', href: '#' },
    ],
  },
  {
    title: 'Features',
    links: [
      { label: 'AI Prompt Builder', href: '#features' },
      { label: 'Drag & Drop Editor', href: '#features' },
      { label: 'Custom JS Nodes', href: '#features' },
      { label: 'App Runner', href: '#features' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { label: 'GitHub', href: '#' },
      { label: 'API Reference', href: '#' },
      { label: 'Templates', href: '#' },
      { label: 'Community', href: '#' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '#' },
      { label: 'Blog', href: '#' },
      { label: 'Privacy', href: '#' },
      { label: 'Terms', href: '#' },
    ],
  },
];

export default function Footer() {
  const [footerColumns, setFooterColumns] = useState<FooterColumn[]>(fallbackFooterColumns);

  useEffect(() => {
    contentRepo.getByType('footer-columns').then((content) => {
      if (content && Array.isArray(content.data)) {
        setFooterColumns(content.data as FooterColumn[]);
      }
    }).catch(() => {
      // Fallback already set
    });
  }, []);
  return (
    <footer className="relative border-t border-[#E8E0D8]/40 bg-[var(--clay-card)] shadow-[0_-4px_8px_var(--clay-shadow-dark)]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4 lg:grid-cols-5">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1 lg:col-span-1">
            <Link href="/" className="mb-4 flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#D5B8F5] text-clay-foreground shadow-[4px_4px_8px_var(--clay-shadow-dark),-4px_-4px_8px_var(--clay-shadow-light)]">
                <AppWindow className="h-4 w-4" />
              </div>
              <span className="text-base font-bold tracking-tight gradient-text">
                MicroApp Studio
              </span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Build, run, and share custom micro-apps with AI-powered prompts and a visual
              drag-and-drop builder.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F5EDE5] text-muted-foreground clay-sm transition-all hover:-translate-y-[1px]"
                aria-label="GitHub"
              >
                <Globe className="h-4 w-4" />
              </a>
              <a
                href="#"
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F5EDE5] text-muted-foreground clay-sm transition-all hover:-translate-y-[1px]"
                aria-label="Twitter"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {footerColumns.map((col) => (
            <div key={col.title}>
              <h4 className="mb-3 text-sm font-semibold text-foreground">{col.title}</h4>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-all hover:text-foreground hover:pl-1"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t border-[#E8E0D8]/40 pt-6">
          <p className="text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} MicroApp Studio. All rights reserved. Built with care.
          </p>
        </div>
      </div>
    </footer>
  );
}
