#!/usr/bin/env node
/**
 * verify-deploy.mjs — smoke test a deployed web build.
 *
 * Usage:
 *   DEPLOY_URL=https://example.com node scripts/verify-deploy.mjs
 *
 * Checks the public routes and accepts 2xx/3xx. HEAD is tried first and GET is
 * used when a host rejects HEAD. No credentials, no telemetry.
 */

const base = process.env.DEPLOY_URL ?? 'https://microapp-studio.vercel.app';
const routes = ['/', '/templates', '/packages', '/settings'];

async function probe(path) {
  const url = new URL(path, base);
  for (const method of ['HEAD', 'GET']) {
    try {
      const res = await fetch(url, {
        method,
        redirect: 'manual',
        signal: AbortSignal.timeout(10_000),
        headers: { 'user-agent': 'microapp-studio-deploy-check' },
      });
      if (method === 'HEAD' && (res.status === 405 || res.status === 501)) continue;
      return { path, status: res.status, ok: res.status >= 200 && res.status < 400 };
    } catch (error) {
      if (method === 'GET') return { path, status: 0, ok: false, error: error.message };
    }
  }
  return { path, status: 0, ok: false, error: 'no response' };
}

const results = [];
for (const path of routes) results.push(await probe(path));

for (const r of results) {
  const detail = r.status === 0 ? r.error : `HTTP ${r.status}`;
  console.log(`${r.ok ? 'ok' : 'fail'} ${r.path} -> ${detail}`);
}

const allOk = results.every((r) => r.ok);
console.log(allOk ? 'deploy smoke: OK' : 'deploy smoke: FAILED');
process.exit(allOk ? 0 : 1);
