#!/usr/bin/env node
/**
 * build-sandbox.mjs — bundle the iframe bootstrap into a single IIFE served as
 * a static asset (`apps/studio-web/public/sandbox-bootstrap.js`).
 *
 * The same renderer/validator code runs inside the sandbox, so there is no
 * second MUIP implementation. The artifact is generated (gitignored).
 */
import { build } from 'esbuild';
import { join, resolve } from 'node:path';
import { statSync } from 'node:fs';

const ROOT = resolve(import.meta.dirname, '..');
const ENTRY = join(ROOT, 'packages', 'runtime-web', 'src', 'sandbox', 'bootstrap.ts');
const OUT = join(ROOT, 'apps', 'studio-web', 'public', 'sandbox-bootstrap.js');

await build({
  entryPoints: [ENTRY],
  outfile: OUT,
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'es2022',
  minify: true,
  sourcemap: false,
  legalComments: 'none',
});

const size = statSync(OUT).size;
process.stdout.write(`sandbox bootstrap: ${OUT} (${size} bytes)\n`);
