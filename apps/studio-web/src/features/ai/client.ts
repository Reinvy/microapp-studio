/**
 * BYOK AI client.
 *
 * Two user-visible calls against an OpenAI-compatible `chat/completions`
 * endpoint: a plan call, then a draft call after the user approves the plan.
 * Nothing is retried across providers and no request is made without an
 * endpoint, a model, and a key.
 *
 * The endpoint must be HTTPS (plain HTTP is allowed only for loopback in
 * development), must not carry credentials, a query, or a fragment, and must be
 * an absolute URL.
 */

import type { MuipNode } from '@microapp/runtime-web';

export const AI_TIMEOUT_MS = 30_000;
export const AI_TEMPERATURE = 0.2;

export interface AiConfig {
  endpoint: string;
  model: string;
  apiKey: string;
}

export interface AiPlan {
  screens: string[];
  data: string[];
  actions: string[];
}

export class AiClientError extends Error {
  readonly code: 'E-CREATE-001' | 'E-CREATE-002' | 'E-CREATE-003';

  constructor(code: 'E-CREATE-001' | 'E-CREATE-002' | 'E-CREATE-003', message: string) {
    super(message);
    this.name = 'AiClientError';
    this.code = code;
  }
}

const LOOPBACK = new Set(['localhost', '127.0.0.1', '[::1]']);

/** Validate and normalize the endpoint; throws `E-CREATE-002` when unusable. */
export function assertEndpoint(endpoint: string, options: { allowLocalHttp?: boolean } = {}): URL {
  const trimmed = endpoint.trim();
  if (trimmed.length === 0) throw new AiClientError('E-CREATE-002', 'endpoint is empty');

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new AiClientError('E-CREATE-002', 'endpoint is not a valid URL');
  }
  if (url.username.length > 0 || url.password.length > 0) {
    throw new AiClientError('E-CREATE-002', 'endpoint must not contain credentials');
  }
  if (url.search.length > 0 || url.hash.length > 0) {
    throw new AiClientError('E-CREATE-002', 'endpoint must not contain a query or fragment');
  }
  if (url.protocol === 'https:') return url;
  if (url.protocol === 'http:' && (options.allowLocalHttp ?? true) && LOOPBACK.has(url.hostname)) return url;
  throw new AiClientError('E-CREATE-002', 'endpoint must use https');
}

export function isAiConfigured(config: Partial<AiConfig>): config is AiConfig {
  return (
    typeof config.endpoint === 'string' &&
    config.endpoint.trim().length > 0 &&
    typeof config.model === 'string' &&
    config.model.trim().length > 0 &&
    typeof config.apiKey === 'string' &&
    config.apiKey.length > 0
  );
}

interface ChatMessage {
  role: 'system' | 'user';
  content: string;
}

interface ChatRequest {
  model: string;
  temperature: number;
  response_format: { type: 'json_object' };
  messages: ChatMessage[];
}

type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

/**
 * Read `choices[0].message.content` as text and parse it as JSON.
 * Anything else is `E-CREATE-003` — the provider answered but not in the
 * documented shape.
 */
export function parseCompletion(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') {
    throw new AiClientError('E-CREATE-003', 'provider returned no body');
  }
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new AiClientError('E-CREATE-003', 'provider returned no choices');
  }
  const message = (choices[0] as { message?: unknown }).message;
  if (!message || typeof message !== 'object') {
    throw new AiClientError('E-CREATE-003', 'provider returned no message');
  }
  const content = (message as { content?: unknown }).content;
  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new AiClientError('E-CREATE-003', 'provider returned empty content');
  }
  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new AiClientError('E-CREATE-003', 'provider content is not JSON');
  }
}

export class AiClient {
  private readonly config: AiConfig;
  private readonly fetchImpl: FetchLike;
  private readonly allowLocalHttp: boolean;

  constructor(config: AiConfig, options: { fetchImpl?: FetchLike; allowLocalHttp?: boolean } = {}) {
    this.config = config;
    this.fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
    this.allowLocalHttp = options.allowLocalHttp ?? true;
  }

  private async complete(messages: ChatMessage[]): Promise<unknown> {
    const url = assertEndpoint(this.config.endpoint, { allowLocalHttp: this.allowLocalHttp });
    const body: ChatRequest = {
      model: this.config.model,
      temperature: AI_TEMPERATURE,
      response_format: { type: 'json_object' },
      messages,
    };
    let response: Response;
    try {
      response = await this.fetchImpl(`${url.toString().replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(AI_TIMEOUT_MS),
      });
    } catch {
      throw new AiClientError('E-CREATE-003', 'provider request failed');
    }
    if (!response.ok) throw new AiClientError('E-CREATE-003', 'provider rejected the request');
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new AiClientError('E-CREATE-003', 'provider response is not JSON');
    }
    return parseCompletion(payload);
  }

  /** Call 1: ask for a plan the user reviews before anything is generated. */
  async plan(prompt: string): Promise<AiPlan> {
    const raw = await this.complete([
      {
        role: 'system',
        content:
          'You plan a small offline micro-app. Reply with JSON only: ' +
          '{"plan":{"screens":[string],"data":[string],"actions":[string]}}. ' +
          'Each array has 1 to 6 short Indonesian entries. No prose.',
      },
      { role: 'user', content: prompt },
    ]);
    return normalizePlan(raw);
  }

  /** Call 2: turn the approved plan into MUIP nodes. */
  async draft(plan: AiPlan): Promise<MuipNode[]> {
    const raw = await this.complete([
      {
        role: 'system',
        content:
          'You generate a MUIP document. Reply with JSON only: ' +
          '{"draft":{"nodes":[MuipNode]}}. A node is ' +
          '{"type":"<catalog component>","id":"<unique id>","props":{...},"children":[...]}. ' +
          'Exactly one root of type "Stack" with props {"direction":"column","gap":"md"}. ' +
          'Use only these components: Card, Stack, Grid, DataTable, StatCard, Badge, Button, ' +
          'TextField, TextArea, SearchField, Select, Checkbox, Switch, RadioGroup, Progress, ' +
          'Alert, EmptyState, Avatar, AppIcon. No html, css, style, or script fields.',
      },
      { role: 'user', content: JSON.stringify(plan) },
    ]);
    return normalizeDraft(raw);
  }
}

/** Validate the plan shape; missing or wrong-typed arrays are `E-CREATE-003`. */
export function normalizePlan(raw: unknown): AiPlan {
  if (!raw || typeof raw !== 'object') throw new AiClientError('E-CREATE-003', 'plan is not an object');
  const plan = (raw as { plan?: unknown }).plan;
  if (!plan || typeof plan !== 'object') throw new AiClientError('E-CREATE-003', 'plan is missing');
  const record = plan as Record<string, unknown>;
  const readList = (key: string): string[] => {
    const value = record[key];
    if (!Array.isArray(value)) throw new AiClientError('E-CREATE-003', `plan.${key} is not an array`);
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .slice(0, 6);
  };
  return { screens: readList('screens'), data: readList('data'), actions: readList('actions') };
}

export function normalizeDraft(raw: unknown): MuipNode[] {
  if (!raw || typeof raw !== 'object') throw new AiClientError('E-CREATE-003', 'draft is not an object');
  const draft = (raw as { draft?: unknown }).draft;
  if (!draft || typeof draft !== 'object') throw new AiClientError('E-CREATE-003', 'draft is missing');
  const nodes = (draft as { nodes?: unknown }).nodes;
  if (!Array.isArray(nodes) || nodes.length === 0) {
    throw new AiClientError('E-CREATE-003', 'draft.nodes is empty');
  }
  return nodes as MuipNode[];
}
