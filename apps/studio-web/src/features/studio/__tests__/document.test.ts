import { describe, expect, it } from 'vitest';
import { validateDocument } from '@microapp/runtime-web';
import {
  applyResponsive,
  blankDocument,
  countNodes,
  createDocument,
  createNode,
  createRoot,
  deviceWidth,
  documentId,
  findNode,
  nextNodeId,
  parseStudioDocument,
  setResponsiveOverride,
} from '../document';
import { BLANK_LAYOUTS } from '../types';

const base = () => createDocument({ id: 'doc_1', name: 'Draft' });

describe('studio document', () => {
  it('creates a valid document with one Stack root', () => {
    const document = base();
    expect(document.schemaVersion).toBe(1);
    expect(document.nodes).toHaveLength(1);
    expect(document.nodes[0].type).toBe('Stack');
    expect(document.nodes[0].props).toMatchObject({ direction: 'column', gap: 'md' });
    expect(validateDocument(document.nodes[0]).nodeCount).toBe(1);
  });

  it('rejects a corrupt document with E-STUDIO-001 instead of throwing', () => {
    expect(parseStudioDocument(null)).toMatchObject({ ok: false, code: 'E-STUDIO-001' });
    expect(parseStudioDocument({ schemaVersion: 2 })).toMatchObject({ ok: false, code: 'E-STUDIO-001' });
    expect(parseStudioDocument({ schemaVersion: 1, id: 'd', name: 'n', nodes: [] })).toMatchObject({
      ok: false,
      code: 'E-STUDIO-001',
    });
    const twoRoots = parseStudioDocument({
      schemaVersion: 1,
      id: 'd',
      name: 'n',
      nodes: [createRoot(), createRoot()],
    });
    expect(twoRoots.code).toBe('E-STUDIO-001');

    const unknownType = parseStudioDocument({
      schemaVersion: 1,
      id: 'd',
      name: 'n',
      nodes: [{ type: 'Text', id: 'root' }],
    });
    expect(unknownType).toMatchObject({ ok: false, code: 'E-STUDIO-001' });
  });

  it('accepts a valid round trip and keeps the revision', () => {
    const document = { ...base(), version: 7 };
    const parsed = parseStudioDocument(JSON.parse(JSON.stringify(document)));
    expect(parsed.ok).toBe(true);
    expect(parsed.document?.version).toBe(7);
  });

  it('merges responsive overrides into props without touching other devices', () => {
    const document: ReturnType<typeof base> = {
      ...base(),
      nodes: [
        {
          ...createRoot([
            { type: 'Card', id: 'card', props: { padding: 'md' } },
          ]),
        },
      ],
      responsive: {
        mobile: { card: { padding: 'sm' } },
        tablet: { card: { padding: 'lg' } },
      },
    };
    const mobile = applyResponsive(document, 'mobile');
    expect(findNode(mobile.nodes[0], 'card')?.props?.padding).toBe('sm');
    const desktop = applyResponsive(document, 'desktop');
    expect(findNode(desktop.nodes[0], 'card')?.props?.padding).toBe('md');
    // The source document is untouched.
    expect(findNode(document.nodes[0], 'card')?.props?.padding).toBe('md');
  });

  it('sets and clears a single responsive override', () => {
    const withOverride = setResponsiveOverride(base(), 'mobile', 'root', { gap: 'sm' });
    expect(withOverride.responsive?.mobile?.root).toEqual({ gap: 'sm' });
    const cleared = setResponsiveOverride(withOverride, 'mobile', 'root', null);
    expect(cleared.responsive).toBeUndefined();
  });

  it('builds a valid document for every blank layout', () => {
    for (const layout of BLANK_LAYOUTS) {
      const document = blankDocument(layout, `Draft ${layout}`, documentId(layout));
      const result = validateDocument(document.nodes[0]);
      expect(result.placeholders, layout).toEqual([]);
      expect(Object.keys(document.dataSample).length, layout).toBeGreaterThan(0);
    }
  });

  it('derives unique node ids and counts the tree', () => {
    const root = createRoot([{ type: 'Card', id: 'card-1' }]);
    expect(nextNodeId('Card', root)).toBe('card-2');
    expect(createNode('Button', root).id).toBe('button-1');
    expect(countNodes(root)).toBe(2);
  });

  it('sanitises ids and exposes device widths', () => {
    expect(documentId('a b/c')).toBe('doc_abc');
    expect(deviceWidth('mobile')).toBe(390);
    expect(deviceWidth('tablet')).toBe(834);
    expect(deviceWidth('desktop')).toBe(1280);
  });
});
