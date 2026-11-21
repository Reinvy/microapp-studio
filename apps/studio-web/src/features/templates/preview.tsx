'use client';

/**
 * Template preview.
 *
 * Renders the template's root with the real MUIP renderer. Template content is
 * bundled and trusted, so it runs host-side (no iframe) — but it still goes
 * through `validateDocument` so a broken template fails loudly at preview time
 * instead of at install time.
 */

import { useEffect, useRef, type ReactElement } from 'react';
import { MuipRenderer, validateDocument, type MuipNode } from '@microapp/runtime-web';

export interface TemplatePreviewProps {
  root: MuipNode;
  label: string;
  className?: string;
}

export function TemplatePreview({ root, label, className }: TemplatePreviewProps): ReactElement {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = hostRef.current;
    if (!element) return;
    const renderer = new MuipRenderer(element, { onEvent: () => undefined });
    try {
      renderer.render(validateDocument(root).node);
    } catch {
      element.textContent = label;
    }
    return () => renderer.destroy();
  }, [root, label]);

  return <div ref={hostRef} className={className} role="group" aria-label={label} />;
}
