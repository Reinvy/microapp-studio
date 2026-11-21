#!/usr/bin/env node
/**
 * check-budget.mjs — per-route JavaScript budget.
 *
 * Starts the production server, loads each budgeted route, and sums the gzip size
 * of the scripts the document actually requests. This measures first-load JS as a
 * browser sees it, which is the number the budget is about.
 *
 * Usage: node scripts/check-budget.mjs [--json]
 * Env:   PORT (default 3210), BUDGET_KIB (default 250)
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const APP_DIR = join(ROOT, 'apps', 'studio-web');
const PORT = Number(process.env.PORT ?? 3210);
const BUDGET_KIB = Number(process.env.BUDGET_KIB ?? 250);
const BUDGET_BYTES = BUDGET_KIB * 1024;
const BUDGETED_ROUTES = ['/', '/app/studio.p000000000000'];
const START_TIMEOUT_MS = 60_000;

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!existsSync(join(APP_DIR, '.next', 'BUILD_ID'))) {
  fail('build output missing; run `npm run build` first');
}

const server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
  cwd: APP_DIR,
  stdio: ['ignore', 'ignore', 'inherit'],
  env: { ...process.env, NODE_ENV: 'production' },
});

async function waitForServer() {
  const deadline = Date.now() + START_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/theme-init.js`, { method: 'HEAD' });
      if (response.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  throw new Error('server did not start in time');
}

/** Gzip size of a `/_next/static/...` URL, read from the build directory. */
function scriptSize(url) {
  const path = url.replace(/^\/_next\//, '');
  const absolute = join(APP_DIR, '.next', path.split('?')[0]);
  if (!existsSync(absolute) || !statSync(absolute).isFile()) return 0;
  return gzipSync(readFileSync(absolute)).byteLength;
}

function scriptsOf(html) {
  return [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((src) => src.startsWith('/_next/static/'));
}

async function main() {
  await waitForServer();
  const rows = [];
  for (const route of BUDGETED_ROUTES) {
    const response = await fetch(`http://127.0.0.1:${PORT}${route}`);
    const html = await response.text();
    const scripts = [...new Set(scriptsOf(html))];
    const bytes = scripts.reduce((total, src) => total + scriptSize(src), 0);
    rows.push({ route, scripts: scripts.length, bytes });
  }

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ budgetKib: BUDGET_KIB, routes: rows }, null, 2));
    return;
  }

  const violations = rows.filter((row) => row.bytes > BUDGET_BYTES);
  for (const row of rows) {
    console.log(
      `${row.bytes > BUDGET_BYTES ? '!' : '*'} ${row.route.padEnd(30)} ${(row.bytes / 1024)
        .toFixed(1)
        .padStart(8)} KiB gzip (${row.scripts} scripts)`,
    );
  }
  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(
        `budget exceeded: ${violation.route} ${(violation.bytes / 1024).toFixed(1)} KiB > ${BUDGET_KIB} KiB`,
      );
    }
    process.exitCode = 1;
    return;
  }
  console.log(`budget check: OK (${BUDGETED_ROUTES.join(', ')} ≤ ${BUDGET_KIB} KiB gzip)`);
}

try {
  await main();
} catch (error) {
  console.error(`budget check failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
} finally {
  server.kill('SIGTERM');
}
