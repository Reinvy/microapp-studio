import { describe, expect, it, vi } from 'vitest';
import { AiClient, AiClientError, assertEndpoint, isAiConfigured, parseCompletion } from '../client';
import { MAX_PROMPT_LENGTH, checkPrompt, planPermissions, planTitle, validateAiDraft } from '../plan';

const config = { endpoint: 'https://api.example.com/v1', model: 'gpt-test', apiKey: 'sk-test-key' };

const completion = (content: unknown): Response =>
  new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(content) } }] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

describe('endpoint validation', () => {
  it('accepts https and loopback http, rejects everything else', () => {
    expect(assertEndpoint('https://api.example.com/v1').host).toBe('api.example.com');
    expect(assertEndpoint('http://localhost:11434/v1').hostname).toBe('localhost');
    expect(assertEndpoint('http://127.0.0.1:8080').hostname).toBe('127.0.0.1');
    for (const bad of [
      'javascript:alert(1)',
      'data:text/json,{}',
      'file:///etc/passwd',
      'http://api.example.com',
      'https://user:pass@api.example.com',
      'https://api.example.com?x=1',
      'https://api.example.com#frag',
      '',
    ]) {
      expect(() => assertEndpoint(bad), bad).toThrow(AiClientError);
    }
  });

  it('requires endpoint, model, and key before a call is possible', () => {
    expect(isAiConfigured(config)).toBe(true);
    expect(isAiConfigured({ ...config, apiKey: '' })).toBe(false);
    expect(isAiConfigured({ endpoint: '', model: 'm', apiKey: 'k' })).toBe(false);
  });
});

describe('prompt rules', () => {
  it('rejects an empty or oversized prompt with E-CREATE-001', () => {
    expect(checkPrompt('   ')).toMatchObject({ ok: false, code: 'E-CREATE-001' });
    expect(checkPrompt('x'.repeat(MAX_PROMPT_LENGTH + 1))).toMatchObject({ ok: false, code: 'E-CREATE-001' });
    expect(checkPrompt('x'.repeat(MAX_PROMPT_LENGTH))).toMatchObject({ ok: true, code: null });
    expect(MAX_PROMPT_LENGTH).toBe(2000);
  });

  it('rejects a draft that is not exactly one valid MUIP root', () => {
    expect(validateAiDraft([])).toMatchObject({ ok: false, code: 'E-CREATE-003' });
    expect(validateAiDraft([{ type: 'Text', id: 'root' }])).toMatchObject({ ok: false, code: 'E-CREATE-003' });
    expect(
      validateAiDraft([
        { type: 'Stack', id: 'root', props: { direction: 'column', gap: 'md' }, children: [] },
        { type: 'Stack', id: 'root' },
      ]),
    ).toMatchObject({ ok: false, code: 'E-CREATE-003' });
    const ok = validateAiDraft([
      { type: 'Stack', id: 'root', props: { direction: 'column', gap: 'md' }, children: [] },
    ]);
    expect(ok.ok).toBe(true);
    expect(ok.root?.type).toBe('Stack');
  });

  it('derives a title and permission set from a plan', () => {
    expect(planTitle({ screens: ['Kasir'], data: [], actions: [] }, 'Fallback')).toBe('Kasir');
    expect(planTitle({ screens: [], data: [], actions: [] }, 'Fallback')).toBe('Fallback');
    expect(planPermissions({ screens: [], data: [], actions: [] })).toEqual(['storage.app']);
    expect(planPermissions({ screens: [], data: [], actions: ['fetch dari internet'] })).toContain('network.fetch');
  });
});

describe('AiClient', () => {
  it('posts the documented request shape and parses the plan', async () => {
    const fetchImpl = vi.fn(async () =>
      completion({ plan: { screens: ['Kasir'], data: ['barang'], actions: ['simpan'] } }),
    );
    const client = new AiClient(config, { fetchImpl });
    const plan = await client.plan('kasir warung');
    expect(plan).toEqual({ screens: ['Kasir'], data: ['barang'], actions: ['simpan'] });

    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.example.com/v1/chat/completions');
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      model: 'gpt-test',
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer sk-test-key');
  });

  it('maps provider failures and bad payloads to E-CREATE-003', async () => {
    const failing = new AiClient(config, { fetchImpl: async () => new Response('nope', { status: 500 }) });
    await expect(failing.plan('x')).rejects.toMatchObject({ code: 'E-CREATE-003' });

    const notJson = new AiClient(config, {
      fetchImpl: async () => new Response(JSON.stringify({ choices: [{ message: { content: 'plain text' } }] })),
    });
    await expect(notJson.plan('x')).rejects.toMatchObject({ code: 'E-CREATE-003' });

    expect(() => parseCompletion({ choices: [] })).toThrow(AiClientError);
  });

  it('never retries automatically across providers', async () => {
    const fetchImpl = vi.fn(async () => new Response('down', { status: 503 }));
    const client = new AiClient(config, { fetchImpl });
    await expect(client.draft({ screens: [], data: [], actions: [] })).rejects.toBeInstanceOf(AiClientError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
