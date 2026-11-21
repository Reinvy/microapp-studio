/**
 * Studio document helpers: creation, validation, serialization, responsive
 * merging, and the empty-canvas root.
 *
 * Validation delegates to the MUIP validator so a document that the builder
 * accepts can always be rendered and packaged. A stored document that fails
 * validation surfaces as `E-STUDIO-001`; the builder shows the recovery surface
 * and never overwrites the stored copy until the user edits it.
 */

import { validateDocument, type MuipNode } from '@microapp/runtime-web';
import {
  STUDIO_DEVICES,
  STUDIO_SCHEMA_VERSION,
  type BlankLayout,
  type StudioDevice,
  type StudioDocument,
} from './types';

const ID_SAFE = /[^a-zA-Z0-9_-]/g;

export function documentId(seed: string): string {
  return `doc_${seed.replace(ID_SAFE, '').slice(0, 24) || 'draft'}`.slice(0, 32);
}

/** A fresh, valid root: one vertical Stack with the documented gap. */
export function createRoot(children: MuipNode[] = []): MuipNode {
  return {
    type: 'Stack',
    id: 'root',
    props: { direction: 'column', gap: 'md' },
    ...(children.length > 0 ? { children } : {}),
  };
}

export interface CreateDocumentInput {
  id: string;
  name: string;
  root?: MuipNode;
  permissions?: string[];
  dataSample?: Record<string, unknown>;
  device?: StudioDevice;
}

export function createDocument(input: CreateDocumentInput): StudioDocument {
  return {
    schemaVersion: STUDIO_SCHEMA_VERSION,
    id: input.id,
    name: input.name,
    version: 0,
    device: input.device ?? 'desktop',
    nodes: [input.root ?? createRoot()],
    dataSample: input.dataSample ?? {},
    permissions: input.permissions ?? ['storage.app'],
  };
}

/**
 * Merge the device override for every node into its props.
 * Non-target devices are untouched, so editing mobile never rewrites desktop.
 */
export function applyResponsive(document: StudioDocument, device: StudioDevice = document.device): StudioDocument {
  const overrides = document.responsive?.[device];
  if (!overrides) return document;
  const mergeNode = (node: MuipNode): MuipNode => ({
    ...node,
    props: { ...(node.props ?? {}), ...(overrides[node.id] ?? {}) },
    ...(node.children ? { children: node.children.map(mergeNode) } : {}),
  });
  const [root] = document.nodes;
  return { ...document, nodes: [mergeNode(root)] };
}

/** Set (or clear) one override for one node on one device. */
export function setResponsiveOverride(
  document: StudioDocument,
  device: StudioDevice,
  nodeId: string,
  props: Record<string, unknown> | null,
): StudioDocument {
  const responsive = { ...(document.responsive ?? {}) };
  const forDevice = { ...(responsive[device] ?? {}) };
  if (props === null || Object.keys(props).length === 0) delete forDevice[nodeId];
  else forDevice[nodeId] = { ...props };
  if (Object.keys(forDevice).length === 0) delete responsive[device];
  else responsive[device] = forDevice;
  // Drop the whole field when no overrides remain so the stored document stays compact.
  if (Object.keys(responsive).length === 0) {
    const { responsive: _omitted, ...rest } = document;
    void _omitted;
    return rest;
  }
  return { ...document, responsive };
}

export function findNode(root: MuipNode, id: string): MuipNode | undefined {
  if (root.id === id) return root;
  for (const child of root.children ?? []) {
    const found = findNode(child, id);
    if (found) return found;
  }
  return undefined;
}

export function countNodes(root: MuipNode): number {
  return 1 + (root.children ?? []).reduce((total, child) => total + countNodes(child), 0);
}

/** New node ids are unique per document: `<type-slug>-<counter>`. */
export function nextNodeId(type: string, root: MuipNode): string {
  const slug = type.toLowerCase().replace(ID_SAFE, '') || 'node';
  let counter = 1;
  while (findNode(root, `${slug}-${counter}`)) counter += 1;
  return `${slug}-${counter}`;
}

export function createNode(type: string, root?: MuipNode): MuipNode {
  return { type, id: root ? nextNodeId(type, root) : `${type.toLowerCase()}-1` };
}

export interface DocumentValidation {
  ok: boolean;
  code: 'E-STUDIO-001' | null;
  message: string | null;
  document: StudioDocument | null;
  /** The raw value when invalid, so the recovery surface can export it. */
  raw: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validate an unknown stored value. Accepts the object form only; a legacy or
 * corrupt blob yields `E-STUDIO-001` without throwing.
 */
export function parseStudioDocument(raw: unknown): DocumentValidation {
  if (!isRecord(raw)) {
    return { ok: false, code: 'E-STUDIO-001', message: 'document is not an object', document: null, raw };
  }
  if (raw.schemaVersion !== STUDIO_SCHEMA_VERSION) {
    return { ok: false, code: 'E-STUDIO-001', message: 'unsupported document version', document: null, raw };
  }
  if (typeof raw.id !== 'string' || typeof raw.name !== 'string') {
    return { ok: false, code: 'E-STUDIO-001', message: 'document id or name is missing', document: null, raw };
  }
  const nodes = Array.isArray(raw.nodes) ? raw.nodes : [];
  if (nodes.length !== 1) {
    return { ok: false, code: 'E-STUDIO-001', message: 'document must have exactly one root', document: null, raw };
  }
  try {
    const validated = validateDocument(nodes[0]);
    const document: StudioDocument = {
      schemaVersion: STUDIO_SCHEMA_VERSION,
      id: raw.id,
      name: raw.name,
      version: typeof raw.version === 'number' && Number.isFinite(raw.version) ? raw.version : 0,
      device:
        raw.device === 'mobile' || raw.device === 'tablet' || raw.device === 'desktop'
          ? raw.device
          : 'desktop',
      nodes: [validated.node],
      dataSample: isRecord(raw.dataSample) ? raw.dataSample : {},
      permissions: Array.isArray(raw.permissions)
        ? raw.permissions.filter((item): item is string => typeof item === 'string')
        : ['storage.app'],
      ...(isRecord(raw.responsive) ? { responsive: sanitizeResponsive(raw.responsive) } : {}),
    };
    return { ok: true, code: null, message: null, document, raw };
  } catch (error) {
    return {
      ok: false,
      code: 'E-STUDIO-001',
      message: error instanceof Error ? error.message : 'invalid document',
      document: null,
      raw,
    };
  }
}

function sanitizeResponsive(raw: Record<string, unknown>): StudioDocument['responsive'] {
  const out: NonNullable<StudioDocument['responsive']> = {};
  for (const device of ['mobile', 'tablet', 'desktop'] as const) {
    const entry = raw[device];
    if (!isRecord(entry)) continue;
    const forDevice: Record<string, Record<string, unknown>> = {};
    for (const [nodeId, props] of Object.entries(entry)) {
      if (isRecord(props)) forDevice[nodeId] = { ...props };
    }
    if (Object.keys(forDevice).length > 0) out[device] = forDevice;
  }
  return out;
}

export function serializeDocument(document: StudioDocument): string {
  return JSON.stringify(document);
}

/** Human-readable width for the device frame selector. */
export function deviceWidth(device: StudioDevice): number {
  return STUDIO_DEVICES.find((entry) => entry.id === device)?.width ?? 1280;
}

/**
 * Blank starting points. Each produces one valid screen with sample data, so a
 * new draft is never an empty canvas the user has to dig out of.
 */
export function blankDocument(layout: BlankLayout, name: string, id: string): StudioDocument {
  const base = { id, name, permissions: ['storage.app'] };
  if (layout === 'form') {
    return createDocument({
      ...base,
      dataSample: { nama: '', catatan: '' },
      root: createRoot([
        {
          type: 'Card',
          id: 'form',
          props: { title: 'Formulir baru', padding: 'md' },
          children: [
            { type: 'TextField', id: 'nama', props: { label: 'Nama', placeholder: 'Nama', name: 'nama' } },
            { type: 'TextArea', id: 'catatan', props: { label: 'Catatan', lineCount: 4 } },
          ],
        },
        { type: 'Button', id: 'submit', props: { label: 'Simpan', variant: 'primary' } },
      ]),
    });
  }
  if (layout === 'list') {
    return createDocument({
      ...base,
      dataSample: { items: [] },
      root: createRoot([
        { type: 'SearchField', id: 'search', props: { label: 'Cari', placeholder: 'Cari', name: 'q' } },
        {
          type: 'DataTable',
          id: 'table',
          props: {
            caption: 'Daftar',
            columns: [
              { key: 'nama', label: 'Nama' },
              { key: 'status', label: 'Status' },
            ],
            rows: [{ nama: 'Contoh', status: 'baru' }],
          },
        },
        { type: 'Button', id: 'add', props: { label: 'Tambah', variant: 'primary' } },
      ]),
    });
  }
  return createDocument({
    ...base,
    dataSample: { total: 0 },
    root: createRoot([
      {
        type: 'Grid',
        id: 'stats',
        props: { gridColumns: 2, gap: 'sm' },
        children: [
          { type: 'StatCard', id: 'total', props: { label: 'Total', value: '0' } },
          { type: 'StatCard', id: 'active', props: { label: 'Aktif', value: '0' } },
        ],
      },
      {
        type: 'Card',
        id: 'summary',
        props: { title: 'Ringkasan', padding: 'md' },
        children: [{ type: 'Progress', id: 'progress', props: { label: 'Penyelesaian', percent: 0 } }],
      },
    ]),
  });
}
