#!/usr/bin/env node
/**
 * copy-sqlite-wasm.mjs — publish `@sqlite.org/sqlite-wasm` runtime files into
 * the host's static directory.
 *
 * The package spawns its OPFS proxy with `new Worker(new URL(proxyUri, ...))`,
 * which no bundler can resolve statically. Loading the ESM files at runtime as
 * static assets keeps the host build free of that resolution problem.
 */
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SRC = join(ROOT, 'node_modules', '@sqlite.org', 'sqlite-wasm', 'dist');
const DEST = join(ROOT, 'apps', 'studio-web', 'public', 'sqlite-wasm');

mkdirSync(DEST, { recursive: true });
let copied = 0;
for (const name of readdirSync(SRC)) {
  const from = join(SRC, name);
  if (!statSync(from).isFile()) continue;
  if (!/\.(mjs|wasm|js)$/.test(name)) continue;
  copyFileSync(from, join(DEST, name));
  copied += 1;
}
if (copied === 0) {
  console.error(`no sqlite-wasm runtime files found in ${SRC}`);
  process.exit(1);
}
process.stdout.write(`sqlite-wasm runtime: ${copied} files copied to ${DEST}\n`);
