#!/usr/bin/env node
/**
 * check-security.mjs — static denial of dynamic code paths.
 *
 * The host and runtime must never build behaviour from strings. This gate rejects
 * `eval(`, `new Function`, `innerHTML`, `insertAdjacentHTML`,
 * `dangerouslySetInnerHTML`, and `document.write` in shipped source. The MUIP
 * validator's *rejection list* names these strings on purpose, so that single
 * declaration is exempted by exact match.
 *
 * Usage: node scripts/check-security.mjs [--json]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const TARGETS = [
  join(ROOT, 'apps', 'studio-web', 'src'),
  join(ROOT, 'packages', 'runtime-web', 'src'),
];
const EXTENSIONS = /\.(ts|tsx|mjs|js)$/;
const SKIP_DIRS = new Set(['node_modules', '.next', 'dist', 'coverage']);

const RULES = [
  { id: 'eval', pattern: /\beval\s*\(/ },
  { id: 'new-function', pattern: /new\s+Function\s*\(/ },
  { id: 'inner-html', pattern: /\.innerHTML\s*=/ },
  { id: 'insert-adjacent-html', pattern: /insertAdjacentHTML\s*\(/ },
  { id: 'dangerous-set-inner-html', pattern: /dangerouslySetInnerHTML/ },
  { id: 'document-write', pattern: /document\.write\s*\(/ },
];

/** Exact declarations that legitimately name a denied token. */
const ALLOW = [
  // The MUIP validator rejects documents containing these field names.
  "const FORBIDDEN_FIELDS = ['html', 'css', 'style', 'script', 'innerHTML', 'href', 'src'];",
];

function walk(directory, out = []) {
  for (const entry of readdirSync(directory)) {
    if (SKIP_DIRS.has(entry)) continue;
    const absolute = join(directory, entry);
    const stats = statSync(absolute);
    if (stats.isDirectory()) walk(absolute, out);
    else if (EXTENSIONS.test(entry)) out.push(absolute);
  }
  return out;
}

const violations = [];
for (const target of TARGETS) {
  for (const file of walk(target)) {
    const lines = readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (ALLOW.some((allowed) => trimmed === allowed)) return;
      // Skip pure comment lines: this gate is about executed code.
      if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;
      for (const rule of RULES) {
        if (rule.pattern.test(line)) {
          violations.push({ file: relative(ROOT, file), line: index + 1, rule: rule.id, text: trimmed.slice(0, 120) });
        }
      }
    });
  }
}

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ violations }, null, 2));
} else if (violations.length === 0) {
  console.log('security scan: OK (no dynamic code execution or raw HTML sinks)');
} else {
  for (const violation of violations) {
    console.error(`${violation.file}:${violation.line} ${violation.rule}: ${violation.text}`);
  }
  console.error(`security scan: ${violations.length} violation(s)`);
  process.exitCode = 1;
}
