#!/usr/bin/env node
/**
 * generate-catalog.mjs — derive the MUIP component catalog from
 * `docs/02-design/component-catalog.md`.
 *
 * Output: `packages/runtime-web/src/muip/catalog.generated.ts`.
 * The catalog is committed so the web runtime builds offline; `--check` fails
 * when the committed file drifts from the documentation.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const SOURCE = join(ROOT, 'docs', '02-design', 'component-catalog.md');
const TARGET = join(ROOT, 'packages', 'runtime-web', 'src', 'muip', 'catalog.generated.ts');
const CHECK = process.argv.includes('--check');

const CATEGORIES = {
  LAY: 'layout',
  NAV: 'navigation',
  INP: 'input',
  DATA: 'data',
  FBK: 'feedback',
  MED: 'media',
  DOM: 'domain',
  PLT: 'platform',
  AI: 'ai',
};

const lines = readFileSync(SOURCE, 'utf8').split('\n');
const entries = [];
for (const line of lines) {
  if (!line.startsWith('| MADS-')) continue;
  const cells = line.split('|').map((cell) => cell.trim());
  const id = cells[1];
  const name = cells[2];
  const match = /^MADS-([A-Z]+)-\d{2}$/.exec(id ?? '');
  if (!match || !name) continue;
  const category = CATEGORIES[match[1]];
  if (!category) {
    console.error(`unknown component category: ${id}`);
    process.exit(1);
  }
  entries.push({ id, name, category });
}

const unique = new Map();
for (const entry of entries) {
  if (unique.has(entry.name)) {
    console.error(`duplicate component name: ${entry.name}`);
    process.exit(1);
  }
  unique.set(entry.name, entry);
}

if (unique.size !== 120) {
  console.error(`expected 120 components, found ${unique.size}`);
  process.exit(1);
}

const body = [...unique.values()]
  .map(
    (entry) =>
      `  { id: '${entry.id}', name: '${entry.name}', category: '${entry.category}', introducedIn: '2.0.0' },`,
  )
  .join('\n');

const output = `// GENERATED FILE — do not edit by hand.
// Source: docs/02-design/component-catalog.md
// Regenerate: node scripts/generate-catalog.mjs

export type ComponentCategory =
  | 'layout'
  | 'navigation'
  | 'input'
  | 'data'
  | 'feedback'
  | 'media'
  | 'domain'
  | 'platform'
  | 'ai';

export interface CatalogComponent {
  readonly id: string;
  readonly name: string;
  readonly category: ComponentCategory;
  /** First host version that MUST render the component (U-02/U-12). */
  readonly introducedIn: string;
}

export const COMPONENT_CATALOG: readonly CatalogComponent[] = [
${body}
];

export const CATALOG_SIZE = COMPONENT_CATALOG.length;

const BY_NAME = new Map(COMPONENT_CATALOG.map((component) => [component.name, component]));

export function catalogComponent(name: string): CatalogComponent | undefined {
  return BY_NAME.get(name);
}
`;

if (CHECK) {
  const current = existsSync(TARGET) ? readFileSync(TARGET, 'utf8') : '';
  if (current !== output) {
    console.error('catalog.generated.ts is out of date; run node scripts/generate-catalog.mjs');
    process.exit(1);
  }
  console.log(`catalog up to date (${unique.size} components)`);
  process.exit(0);
}

writeFileSync(TARGET, output);
console.log(`wrote ${TARGET} (${unique.size} components)`);
