#!/usr/bin/env node
/**
 * check-docs.mjs — SDD documentation gate for MicroApp Studio.
 *
 * Usage:
 *   node scripts/check-docs.mjs [root] [--strict]
 *
 * `root` defaults to `docs` and must contain README.md. The script has no
 * dependencies and runs on Node >= 20.
 *
 * Exit codes: 0 clean, 1 error (or warning with --strict), 2 usage error.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, resolve, sep } from 'node:path';

const RAW_ARGS = process.argv.slice(2);
const FLAGS = new Set(RAW_ARGS.filter((a) => a.startsWith('--')));
if (FLAGS.has('--help') || FLAGS.has('-h')) {
  process.stdout.write(
    'Usage: node scripts/check-docs.mjs [root=docs] [--strict]\n' +
      'Validates frontmatter, headings, links, anchors, IDs, matrix coverage,\n' +
      'placeholders, code fences, JSON files, and reachability.\n',
  );
  process.exit(0);
}
const UNKNOWN = [...FLAGS].filter((f) => f !== '--strict');
if (UNKNOWN.length > 0) {
  process.stderr.write(`Unknown flag(s): ${UNKNOWN.join(', ')}\n`);
  process.exit(2);
}
const STRICT = FLAGS.has('--strict');

const POSITIONAL = RAW_ARGS.filter((a) => !a.startsWith('--'));
const ROOT = resolve(POSITIONAL[0] ?? 'docs');
if (!existsSync(join(ROOT, 'README.md'))) {
  process.stderr.write(`Root must contain README.md: ${ROOT}\n`);
  process.exit(2);
}

const errors = [];
const warnings = [];
const MIN_PRD_ROWS = 135;
const err = (file, msg) => errors.push(`${rel(file)}: ${msg}`);
const warn = (file, msg) => warnings.push(`${rel(file)}: ${msg}`);

function rel(p) {
  const r = relative(ROOT, p);
  return r === '' ? '.' : r.split(sep).join('/');
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

const SKIP_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir).sort()) {
    if (SKIP_DIRS.has(name)) continue;
    const abs = join(dir, name);
    const st = statSync(abs);
    if (st.isDirectory()) walk(abs, out);
    else out.push(abs);
  }
  return out;
}

const allFiles = walk(ROOT);
const mdFiles = allFiles.filter((f) => f.endsWith('.md'));
const jsonFiles = allFiles.filter((f) => f.endsWith('.json'));

const pathOf = (f) => rel(f);
const isTemplate = (f) => pathOf(f).startsWith('templates/');
const isArchive = (f) => pathOf(f).startsWith('archive/');
const isSkill = (f) => /(^|\/)06-skills\/.+\/SKILL\.md$/.test(pathOf(f));
const isSpec = (f) => pathOf(f).startsWith('03-specs/') && pathOf(f).endsWith('.md');
const isFlow = (f) => /^04-flows\/[0-9]/.test(pathOf(f));
const isAdr = (f) => /^01-architecture\/adr\/0.*\.md$/.test(pathOf(f));
const isMatrix = (f) => pathOf(f) === '00-foundation/prd-compliance-matrix.md';

// ---------------------------------------------------------------------------
// Frontmatter (minimal YAML subset: scalars + inline arrays)
// ---------------------------------------------------------------------------

const OWNERS = new Set([
  'product', 'architecture', 'design', 'runtime', 'data', 'sync',
  'registry', 'server', 'dx', 'qa', 'ops', 'security', 'governance',
]);
const STATUSES = new Set(['draft', 'accepted', 'implemented', 'deprecated']);
const ID_PREFIXES = [
  'DOC-', 'FOUND-', 'ARCH-', 'DESIGN-', 'SPEC-', 'FLOW-', 'AGENT-',
  'SKILL-', 'RULE-', 'QA-', 'OPS-', 'GOV-', 'TPL-', 'ADR-',
];

function parseFrontmatter(text) {
  if (!text.startsWith('---\n')) return null;
  const end = text.indexOf('\n---', 3);
  if (end === -1) return null;
  const block = text.slice(4, end);
  const data = {};
  for (const line of block.split('\n')) {
    if (!line.trim()) continue;
    const idx = line.indexOf(':');
    if (idx === -1) return null;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if (value.startsWith('[')) {
      const inner = value.replace(/^\[/, '').replace(/\]$/, '');
      data[key] = inner
        .split(',')
        .map((v) => v.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    } else {
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      data[key] = value;
    }
  }
  return data;
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

function stripFences(text) {
  const out = [];
  let inFence = false;
  for (const line of text.split('\n')) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      out.push('');
      continue;
    }
    out.push(inFence ? '' : line);
  }
  return out.join('\n');
}

const normalizeTitle = (s) =>
  s
    .toLowerCase()
    .replace(/^\s*\d+[.)]\s*/, '')
    .replace(/^\s*[a-z][a-z0-9-]*-\d+[.:]?\s+/, '')
    .replace(/[`*_]/g, '')
    .replace(/[.!?:;]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');

const anchorCache = new Map();
const idCache = new Map();

function headingsOf(text) {
  const clean = stripFences(text);
  return clean
    .split('\n')
    .map((l) => /^(#{1,6})\s+(.*?)\s*$/.exec(l))
    .filter(Boolean)
    .map((m) => ({ level: m[1].length, text: m[2] }));
}

function idsOf(text) {
  return new Set(
    (text.match(/(?<!RULE-)\b(?:FR-[A-Z]+-\d{3}|NFR-[A-Z][A-Z0-9]*-\d{3}|SEC-\d{3}|FLOW-\d{2}|ADR-\d{4}|E-[A-Z]+-\d{3})\b/g) ?? []),
  );
}

function anchorsOf(file) {
  if (anchorCache.has(file)) return anchorCache.get(file);
  const text = readFileSync(file, 'utf8');
  const set = new Set();
  for (const h of headingsOf(text)) {
    set.add(slugify(h.text));
    for (const id of idsOf(h.text)) set.add(id.toLowerCase());
  }
  for (const id of idsOf(text)) set.add(id.toLowerCase());
  anchorCache.set(file, set);
  return set;
}

// ---------------------------------------------------------------------------
// 1. Frontmatter, H1, required sections, placeholders, fences
// ---------------------------------------------------------------------------

const defined = {
  FR: new Map(), NFR: new Map(), SEC: new Map(),
  FLOW: new Map(), ADR: new Map(), E: new Map(),
};
const references = [];

function define(bucket, id, file, line) {
  const map = defined[bucket];
  if (map.has(id)) {
    err(file, `duplicate definition of ${id} (also at ${map.get(id).file}:${map.get(id).line})`);
    return;
  }
  map.set(id, { file, line });
}

function firstCellIds(line) {
  if (!line.startsWith('|')) return [];
  const cells = line.split('|');
  if (cells.length < 3) return [];
  const first = cells[1].trim().replace(/`/g, '');
  const m = /^(FR-[A-Z]+-\d{3}|NFR-[A-Z][A-Z0-9]*-\d{3}|SEC-\d{3}|E-[A-Z]+-\d{3})$/.exec(first);
  return m ? [m[1]] : [];
}

const docIds = new Map();

for (const file of mdFiles) {
  const text = readFileSync(file, 'utf8');
  const p = pathOf(file);
  const excluded = isTemplate(file) || isArchive(file);

  if (!excluded) {
    const fm = parseFrontmatter(text);
    if (!fm) {
      err(file, 'missing or malformed frontmatter');
    } else {
      for (const key of ['id', 'title', 'status', 'owner', 'prd_refs']) {
        if (!(key in fm) || fm[key] === '') err(file, `frontmatter missing "${key}"`);
      }
      const id = fm.id ?? '';
      if (id && !ID_PREFIXES.some((pre) => id.startsWith(pre))) {
        err(file, `frontmatter id "${id}" has no allowed prefix`);
      }
      if (id) {
        if (docIds.has(id)) err(file, `duplicate frontmatter id "${id}" (also in ${docIds.get(id)})`);
        else docIds.set(id, p);
      }
      if (fm.status && !STATUSES.has(fm.status)) {
        err(file, `invalid status "${fm.status}"`);
      }
      if (fm.status === 'draft') {
        (STRICT ? err : warn)(file, 'status: draft is not allowed outside templates');
      }
      if (fm.owner && !OWNERS.has(fm.owner)) {
        err(file, `invalid owner "${fm.owner}"`);
      }
      if (fm.prd_refs) {
        if (!Array.isArray(fm.prd_refs) || fm.prd_refs.length === 0) {
          err(file, 'prd_refs must be a non-empty array');
        } else {
          for (const ref of fm.prd_refs) {
            if (!ref.startsWith('§')) err(file, `prd_refs entry "${ref}" must start with §`);
          }
        }
      }
      if (isSkill(file)) {
        for (const key of ['name', 'description', 'when_to_use', 'required_docs']) {
          if (!(key in fm)) err(file, `skill frontmatter missing "${key}"`);
        }
      }

      const h1 = headingsOf(text).find((h) => h.level === 1);
      if (!h1) {
        err(file, 'missing H1');
      } else if (fm.title && normalizeTitle(h1.text) !== normalizeTitle(fm.title)) {
        err(file, `H1 "${h1.text}" does not match title "${fm.title}"`);
      }
    }

    // Required sections per path family.
    const headings = headingsOf(text).map((h) => (h.level === 2 ? h.text : null)).filter(Boolean);
    const need = (prefix, label) => {
      if (!headings.some((h) => h.startsWith(prefix))) err(file, `missing required section "${label}"`);
    };
    if (isSpec(file)) {
      need('1. Tujuan', '1. Tujuan dan Ruang Lingkup');
      need('3. Requirement', '3. Requirement');
      need('7. Acceptance Criteria', '7. Acceptance Criteria');
      need('8. Verifikasi', '8. Verifikasi');
    }
    if (isFlow(file)) {
      for (const name of ['Alur Utama', 'Cabang Gagal', 'Acceptance Criteria', 'Verifikasi']) need(name, name);
    }
    if (isSkill(file)) {
      for (const name of ['Kapan Digunakan', 'Prosedur', 'Verifikasi']) need(name, name);
    }
    if (isAdr(file)) {
      for (const name of ['Konteks', 'Keputusan', 'Konsekuensi']) need(name, name);
    }
  }

  // Code fences balanced + non-empty mermaid.
  const lines = text.split('\n');
  const fenceLines = lines.filter((l) => /^\s*```/.test(l));
  if (fenceLines.length % 2 !== 0) err(file, `unbalanced code fences (${fenceLines.length})`);
  for (let i = 0; i < lines.length; i += 1) {
    if (/^\s*```mermaid\s*$/.test(lines[i])) {
      const body = lines[i + 1] ?? '';
      if (!body.trim() || /^\s*```/.test(body)) err(file, 'empty mermaid block');
    }
  }

  // Placeholder ban (templates, archive, and skills are exempt).
  if (!isTemplate(file) && !isArchive(file) && !isSkill(file)) {
    const prose = stripFences(text).replace(/`[^`\n]*`/g, '');
    const banned = /\b(TODO|TBD|FIXME|XXX)\b|lorem ipsum/i.exec(prose);
    if (banned) err(file, `placeholder "${banned[0]}" is not allowed`);
  }
}

// ---------------------------------------------------------------------------
// 2. ID definitions
// ---------------------------------------------------------------------------

for (const file of mdFiles) {
  const text = readFileSync(file, 'utf8');
  const p = pathOf(file);
  const lines = text.split('\n');

  if (isSpec(file)) {
    lines.forEach((line, i) => {
      for (const id of firstCellIds(line)) {
        if (id.startsWith('SEC-')) {
          if (p === '03-specs/permissions.md') define('SEC', id, file, i + 1);
        } else if (id.startsWith('E-')) {
          if (p === '03-specs/error-codes.md') define('E', id, file, i + 1);
        } else if (id.startsWith('FR-')) {
          define('FR', id, file, i + 1);
        } else if (id.startsWith('NFR-')) {
          define('NFR', id, file, i + 1);
        }
      }
    });
  }

  if (isFlow(file)) {
    for (const id of idsOf(text)) {
      if (id.startsWith('FLOW-')) define('FLOW', id, file, lines.findIndex((l) => l.includes(id)) + 1);
    }
  }

  if (isAdr(file)) {
    const fm = parseFrontmatter(text);
    const id = fm?.id;
    if (id && /^ADR-\d{4}$/.test(id)) define('ADR', id, file, 1);
    else err(file, 'ADR frontmatter id must be ADR-NNNN');
  }

  // Collect references everywhere except the cell that defines the ID in its
  // canonical source file (other files may use an ID as the first cell too).
  const clean = stripFences(text);
  clean.split('\n').forEach((line, i) => {
    const cellDefs = new Set(firstCellIds(line));
    for (const id of idsOf(line)) {
      const canonical =
        (id.startsWith('E-') && p === '03-specs/error-codes.md') ||
        (id.startsWith('SEC-') && p === '03-specs/permissions.md') ||
        ((id.startsWith('FR-') || id.startsWith('NFR-')) && isSpec(file));
      if (cellDefs.has(id) && canonical) continue;
      references.push({ id, file, line: i + 1 });
    }
  });
}

for (const [bucket, map] of Object.entries(defined)) {
  for (const [id, meta] of map) {
    const expected = id.split('-')[0];
    if (expected !== bucket) err(meta.file, `${id} defined under wrong bucket`);
  }
}

// ---------------------------------------------------------------------------
// 3. References resolve
// ---------------------------------------------------------------------------

for (const ref of references) {
  const bucket = ref.id.split('-')[0];
  const map = defined[bucket];
  if (!map) continue; // SCR/MADS are design-locals, not in defined buckets
  if (!map.has(ref.id)) err(ref.file, `undefined reference ${ref.id} (line ${ref.line})`);
}

// ---------------------------------------------------------------------------
// 4. Flows reference requirements; specs define requirements
// ---------------------------------------------------------------------------

for (const file of mdFiles) {
  if (!isFlow(file)) continue;
  const text = stripFences(readFileSync(file, 'utf8'));
  if (!/\b(FR-[A-Z]+-\d{3}|SEC-\d{3})\b/.test(text)) {
    err(file, 'flow must reference at least one FR-* or SEC-*');
  }
}

// Every registered error code must be used outside its catalog.
for (const [id, meta] of defined.E) {
  const used = references.some((r) => r.id === id && r.file !== meta.file);
  if (!used) err(meta.file, `${id} is defined but never referenced by a spec or flow`);
}

for (const file of mdFiles) {
  if (!isSpec(file)) continue;
  const p = pathOf(file);
  const functional = /^03-specs\/0[1-8]-/.test(p);
  if (functional || p === '03-specs/permissions.md' || p === '03-specs/nfr.md') {
    const bucket = p === '03-specs/permissions.md' ? 'SEC' : p === '03-specs/nfr.md' ? 'NFR' : 'FR';
    const has = [...defined[bucket].values()].some((m) => m.file === file);
    if (!has) err(file, `must define at least one ${bucket}-* requirement`);
  }
}

// ---------------------------------------------------------------------------
// 5. Links and anchors
// ---------------------------------------------------------------------------

const LINK_RE = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

for (const file of mdFiles) {
  const text = readFileSync(file, 'utf8');
  const clean = stripFences(text);
  for (const m of clean.matchAll(LINK_RE)) {
    const raw = m[1];
    if (/^(https?:|mailto:|tel:|microapp:|data:)/.test(raw)) continue;
    if (raw.startsWith('<') || raw.includes(' ')) continue;
    const [target, anchor] = raw.split('#');
    if (target === '' && anchor === undefined) continue;
    let abs;
    if (target === '') abs = file;
    else {
      abs = resolve(dirname(file), decodeURIComponent(target));
      if (!existsSync(abs)) {
        err(file, `broken link target "${raw}"`);
        continue;
      }
    }
    if (anchor) {
      if (!abs.endsWith('.md')) continue;
      const anchors = anchorsOf(abs);
      if (!anchors.has(decodeURIComponent(anchor).toLowerCase())) {
        err(file, `broken anchor "${raw}"`);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// 6. Matrix coverage
// ---------------------------------------------------------------------------

const matrixFile = join(ROOT, '00-foundation', 'prd-compliance-matrix.md');
if (!existsSync(matrixFile)) {
  err(matrixFile, 'missing prd-compliance-matrix.md');
} else {
  const text = readFileSync(matrixFile, 'utf8');
  const rows = text.split('\n').filter((l) => l.startsWith('|'));
  const covered = new Set();
  let prdRows = 0;
  for (const line of rows) {
    const cells = line.split('|').map((c) => c.trim());
    if (cells.length < 3) continue;
    if (cells[1].includes('§')) prdRows += 1;
    for (const id of idsOf(cells[2] ?? '')) {
      if (/^(FR|NFR|SEC)-/.test(id)) covered.add(id);
    }
  }
  for (const bucket of ['FR', 'NFR', 'SEC']) {
    for (const id of defined[bucket].keys()) {
      if (!covered.has(id)) err(matrixFile, `matrix missing row for ${id}`);
    }
  }
  for (const id of covered) {
    const bucket = id.split('-')[0];
    if (!defined[bucket]?.has(id)) err(matrixFile, `matrix references undefined ${id}`);
  }
  if (prdRows < MIN_PRD_ROWS) err(matrixFile, `only ${prdRows} PRD rows with § reference; minimum ${MIN_PRD_ROWS}`);
}

// ---------------------------------------------------------------------------
// 7. JSON validity
// ---------------------------------------------------------------------------

for (const file of jsonFiles) {
  try {
    JSON.parse(readFileSync(file, 'utf8'));
  } catch (e) {
    err(file, `invalid JSON: ${e.message}`);
  }
}

// ---------------------------------------------------------------------------
// 8. Reachability from docs/README.md
// ---------------------------------------------------------------------------

const reachable = new Set();
const queue = [join(ROOT, 'README.md')];
reachable.add(queue[0]);
while (queue.length > 0) {
  const file = queue.shift();
  if (!file.endsWith('.md')) continue;
  const clean = stripFences(readFileSync(file, 'utf8'));
  for (const m of clean.matchAll(LINK_RE)) {
    const raw = m[1];
    if (/^(https?:|mailto:|tel:|microapp:|data:)/.test(raw)) continue;
    const target = raw.split('#')[0];
    if (!target) continue;
    const abs = resolve(dirname(file), decodeURIComponent(target));
    if (abs.endsWith('.md') && existsSync(abs) && !reachable.has(abs)) {
      reachable.add(abs);
      queue.push(abs);
    }
  }
}
for (const file of mdFiles) {
  if (!reachable.has(file)) err(file, 'not reachable from docs/README.md');
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

const counts = {
  files: mdFiles.length,
  requirements: defined.FR.size + defined.NFR.size + defined.SEC.size,
  flows: defined.FLOW.size,
  errors: defined.E.size,
  adrs: defined.ADR.size,
  warnings: warnings.length,
};

for (const w of warnings) process.stdout.write(`warning: ${w}\n`);
for (const e of errors) process.stdout.write(`error: ${e}\n`);
process.stdout.write(
  `\n${counts.files} files, ${counts.requirements} requirements ` +
    `(FR ${defined.FR.size}/NFR ${defined.NFR.size}/SEC ${defined.SEC.size}), ` +
    `${counts.flows} flows, ${counts.errors} error codes, ${counts.adrs} ADRs, ` +
    `${counts.warnings} warnings\n`,
);

const failed = errors.length > 0 || (STRICT && warnings.length > 0);
process.stdout.write(failed ? 'docs check: FAILED\n' : 'docs check: OK\n');
process.exit(failed ? 1 : 0);
