'use client';

/**
 * Registers the service worker in production builds only.
 *
 * The worker caches the shell, fonts, wasm, and app bundles; registration is a
 * no-op in development so hot reload is never shadowed by a stale cache.
 */

import { useEffect } from 'react';

export function PwaRegistration(): null {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const register = async (): Promise<void> => {
      try {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      } catch (error) {
        // Registration failure must not break the host; offline support degrades.
        console.warn('service worker registration failed', error);
      }
    };
    void register();
  }, []);
  return null;
}
