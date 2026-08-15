/**
 * canvas-touch.test.ts — Builder canvas mobile/touch UX + header refactor (Cron 2, UI/UX)
 *
 * Source-level compliance checks for src/components/builder/Canvas.tsx:
 * - Field delete button is visible on touch devices (no hover): the
 *   hover-reveal (`opacity-0 group-hover:opacity-100`) must be gated to md+
 *   screens only, mirroring AppRunner's CopyValuePill fix — otherwise users
 *   on phones/tablets can never delete a field from the canvas.
 * - The field-card header markup is extracted into a shared FieldCardHeader
 *   used by BOTH SortableField (canvas) and CanvasFieldCard (drag overlay) —
 *   no duplicated type-icon/label/badge rows.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

const repoRoot = path.resolve(__dirname, '..', '..');
const canvas = readFileSync(path.join(repoRoot, 'src', 'components', 'builder', 'Canvas.tsx'), 'utf8');

describe('Builder canvas — touch delete + shared header (Cron 2)', () => {
  it('delete button is touch-visible (hover-reveal only on md+ screens)', () => {
    // The delete action must be visible without hover (touch devices).
    expect(canvas).toMatch(/opacity-100 md:opacity-0 md:group-hover:opacity-100/);
  });

  it('no hover-only (touch-invisible) controls remain in the canvas', () => {
    // Any remaining bare `opacity-0 group-hover:opacity-100` (no md: gate)
    // would be unreachable on touch screens.
    const bareHoverReveal = canvas.match(/opacity-0 group-hover:opacity-100(?!.*md:)/g) || [];
    expect(bareHoverReveal).toEqual([]);
  });

  it('extracts a shared FieldCardHeader component', () => {
    expect(canvas).toMatch(/function FieldCardHeader\(/);
    expect(canvas).toMatch(/<FieldCardHeader/);
  });

  it('both SortableField and CanvasFieldCard render through FieldCardHeader', () => {
    // SortableField (canvas rows) passes a drag handle + delete action…
    expect(canvas).toMatch(/<FieldCardHeader\s+field=\{field\}\s+dragHandle=\{/);
    expect(canvas).toMatch(/action=\{\s*<button[\s\S]*?onRemove\(field\.id\)/);
    // …and the drag-overlay card uses the same header without duplication.
    expect(canvas).toMatch(/<FieldCardHeader field=\{field\} roundedTop=\{false\} \/>/);
  });

  it('does not duplicate the type-icon/label/badge header row markup', () => {
    // The header row (type icon + label + type badge) should exist exactly
    // once as shared markup; per-context controls use the dragHandle/action
    // slots instead of re-declaring the layout.
    const headerRowDeclarations = canvas.match(/typeColors\[field\.type\]/g) || [];
    expect(headerRowDeclarations.length).toBe(1);
  });
});
