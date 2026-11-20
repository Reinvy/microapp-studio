'use client';

import { contentRepo } from '@/db/contentRepo';
import {
  DEFAULT_PROMPT_TEMPLATES,
  sanitizePromptTemplates,
  type PromptTemplate,
} from '@/lib/promptTemplates';

/**
 * PromptTemplateService — loads the runtime-tunable prompt suggestions for the
 * New App dialog from IndexedDB (`prompt-templates` content record).
 *
 * Design mirrors DashboardConfigService:
 * - **Single read gate**: every consumer gets its templates from one place, so
 *   suggestions can be changed at runtime without a redeploy.
 * - **Short TTL cache**: repeated reads within the TTL window never touch
 *   IndexedDB again (the dialog re-reads templates on every open).
 * - **In-flight coalescing**: concurrent first loads share one IndexedDB
 *   round-trip.
 * - **Fail-safe**: any read error or corrupt record falls back to
 *   DEFAULT_PROMPT_TEMPLATES via sanitizePromptTemplates — the dialog always
 *   renders suggestions, never crashes on bad data.
 */

const TEMPLATES_TYPE = 'prompt-templates';
const CACHE_TTL_MS = 10_000; // 10 seconds

class PromptTemplateService {
  private cache: { templates: PromptTemplate[]; timestamp: number } | null = null;
  private inFlight: Promise<PromptTemplate[]> | null = null;

  /** Load (and cache) the prompt templates. Never rejects. */
  async load(): Promise<PromptTemplate[]> {
    const now = Date.now();
    if (this.cache && now - this.cache.timestamp < CACHE_TTL_MS) {
      return this.cache.templates;
    }
    if (this.inFlight) {
      return this.inFlight;
    }
    this.inFlight = this.fetch().finally(() => {
      this.inFlight = null;
    });
    return this.inFlight;
  }

  /** Clear the cache so the next load() re-reads IndexedDB (tests/devtools). */
  invalidateCache(): void {
    this.cache = null;
  }

  private async fetch(): Promise<PromptTemplate[]> {
    try {
      const content = await contentRepo.getByType(TEMPLATES_TYPE);
      const templates = sanitizePromptTemplates(content?.data);
      this.cache = { templates, timestamp: Date.now() };
      return templates;
    } catch (error) {
      console.error('[PromptTemplateService] load failed, using defaults:', error);
      this.cache = { templates: DEFAULT_PROMPT_TEMPLATES, timestamp: Date.now() };
      return DEFAULT_PROMPT_TEMPLATES;
    }
  }
}

/** Singleton instance */
export const promptTemplateService = new PromptTemplateService();
