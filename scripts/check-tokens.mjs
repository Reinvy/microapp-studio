#!/usr/bin/env node
/**
 * Token gate: DESIGN-CLAY §4 forbids literal visual values outside tokens.css.
 *
 * Scans the stylesheets that ship with the host and fails when a value that must
 * come from a token is written literally:
 *   - hex colours and rgb()/hsl() literals
 *   - literal border-radius lengths
 *   - literal box-shadow declarations
 *   - literal font-size / transition-duration lengths
 *
 * `color-mix(...)` and `var(--mads-*)` are always allowed. tokens.css is the one
 * file allowed to hold literals.
 *
 * Usage: node scripts/check-tokens.mjs [--json]
 */
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGETS = [
  'packages/ui-kit/src/components.css',
  'apps/studio-web/src/app/globals.css',
  'apps/studio-web/src/app/legacy-host.css',
];
const ALLOWED = new Set(['packages/ui-kit/src/tokens.css']);

const RULES = [
  { id: 'hex-colour', pattern: /#[0-9a-fA-F]{3,8}\b/g, hint: 'use var(--mads-color-*)' },
  { id: 'rgb-colour', pattern: /\brgba?\(/g, hint: 'use var(--mads-color-*) or color-mix()' },
  { id: 'hsl-colour', pattern: /\bhsla?\(/g, hint: 'use var(--mads-color-*) or color-mix()' },
  {
    id: 'radius-literal',
    pattern: /border(?:-[a-z]+)?-radius:(?!\s*var\(|\s*0\b|\s*inherit|\s*initial)[^;]+;/g,
    hint: 'use var(--mads-radius-*)',
  },
  {
    id: 'shadow-literal',
    pattern: /box-shadow:(?!\s*var\(|\s*none\b|\s*inherit)[^;]+;/g,
    hint: 'use var(--mads-clay-shadow-*)',
  },
  {
    id: 'font-size-literal',
    pattern: /font-size:(?!\s*var\(|\s*inherit)[^;]+;/g,
    hint: 'use var(--mads-text-*)',
  },
  {
    id: 'duration-literal',
    pattern: /(?:transition|animation)(?:-[a-z]+)?:(?![^;]*var\()[^;]*\b[0-9.]+m?s\b[^;]*;/g,
    hint: 'use var(--mads-duration-*)',
    // Zeroing a duration is how reduced motion is expressed; it is not a style value.
    allow: (value) => !/[1-9]/.test(value.replace(/var\([^)]*\)/g, '')),
  },
];

async function collect(relative) {
  const absolute = path.join(root, relative);
  try {
    return [{ relative, css: await readFile(absolute, 'utf8') }];
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

const files = [];
for (const target of TARGETS) {
  if (ALLOWED.has(target)) continue;
  files.push(...(await collect(target)));
}

const violations = [];
for (const file of files) {
  const lines = file.css.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trimStart().startsWith('*') || line.trimStart().startsWith('/*')) continue;
    for (const rule of RULES) {
      rule.pattern.lastIndex = 0;
      for (const match of line.matchAll(rule.pattern)) {
        if (rule.allow && rule.allow(match[0])) continue;
        violations.push({
          file: file.relative,
          line: index + 1,
          rule: rule.id,
          value: match[0].trim(),
          hint: rule.hint,
        });
      }
    }
  }
}

const json = process.argv.includes('--json');
if (json) {
  console.log(JSON.stringify({ files: files.map((file) => file.relative), violations }, null, 2));
} else if (violations.length === 0) {
  console.log(`tokens check: OK (${files.length} stylesheets, no literal visual values)`);
} else {
  for (const violation of violations) {
    console.error(`${violation.file}:${violation.line} ${violation.rule}: ${violation.value} — ${violation.hint}`);
  }
  console.error(`tokens check: ${violations.length} violation(s)`);
  process.exitCode = 1;
}
