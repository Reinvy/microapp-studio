// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';

import { CATALOG_SIZE, COMPONENT_CATALOG, CORE_CATALOG_SIZE } from '../catalog.generated';
import { CORE_COMPONENTS, buildComponent } from '../components';
import type { MuipNode } from '../validate';

const coreNames = COMPONENT_CATALOG.filter((component) => component.level === 'core').map((component) => component.name);
const advancedNames = COMPONENT_CATALOG.filter((component) => component.level === 'advanced').map((component) => component.name);

function node(type: string, props: Record<string, unknown> = {}, id?: string): MuipNode {
  return { type, id: id ?? `node-${type.toLowerCase()}`, props };
}

function withLanguage(language: string): void {
  document.documentElement.lang = language;
}

afterEach(() => {
  withLanguage('en');
});

describe('catalog levels', () => {
  it('keeps 120 catalog entries with 48 core components', () => {
    expect(CATALOG_SIZE).toBe(120);
    expect(CORE_CATALOG_SIZE).toBe(48);
    expect(coreNames).toHaveLength(48);
    expect(advancedNames).toHaveLength(72);
    expect([...CORE_COMPONENTS].sort()).toEqual([...coreNames].sort());
  });
});

describe('core builders', () => {
  it('returns a real HTMLElement for every core component', () => {
    for (const type of coreNames) {
      const view = buildComponent(node(type));
      expect(view.element, type).toBeInstanceOf(HTMLElement);
      expect(view.content, type).toBeInstanceOf(HTMLElement);
      expect(typeof view.sync, type).toBe('function');
    }
  });

  it('never renders markup payloads from props', () => {
    const payload = '<img src=x onerror="alert(1)"><b>bold</b>';
    const view = buildComponent(node('Badge', { text: payload }));
    expect(view.element.querySelector('img')).toBeNull();
    expect(view.element.querySelector('b')).toBeNull();
    expect(view.element.textContent).toContain(payload);
  });

  it('names a Button from its label', () => {
    const view = buildComponent(node('Button', { label: 'Simpan' }));
    expect(view.element.tagName).toBe('BUTTON');
    expect(view.element.getAttribute('aria-label')).toBe('Simpan');
    expect(view.element.textContent).toBe('Simpan');
  });

  it('prefers ariaLabel over label for the accessible name', () => {
    const view = buildComponent(node('Button', { label: 'X', ariaLabel: 'Tutup panel' }));
    expect(view.element.getAttribute('aria-label')).toBe('Tutup panel');
  });

  it('renders one header per column and one row per row entry', () => {
    const view = buildComponent(
      node('DataTable', {
        columns: [
          { key: 'name', label: 'Nama' },
          { key: 'qty', label: 'Jumlah', align: 'end' },
          { key: 'price', label: 'Harga', align: 'end' },
        ],
        rows: [
          { name: 'Kopi', qty: 2, price: '10.000' },
          { name: 'Teh', qty: 1, price: '8.000' },
        ],
      }),
    );
    expect(view.element.tagName).toBe('TABLE');
    expect(view.element.querySelectorAll('thead th')).toHaveLength(3);
    expect(view.element.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(view.element.querySelector('tbody tr td')?.textContent).toBe('Kopi');
  });

  it('exposes StorageMeter as a meter with value semantics', () => {
    const view = buildComponent(node('StorageMeter', { usedBytes: 1_048_576, quotaBytes: 10_485_760 }));
    expect(view.element.getAttribute('role')).toBe('meter');
    expect(view.element.getAttribute('aria-valuemin')).toBe('0');
    expect(view.element.getAttribute('aria-valuemax')).toBe('10485760');
    expect(view.element.getAttribute('aria-valuenow')).toBe('1048576');
    expect(view.element.getAttribute('aria-valuetext')).toContain('MB');
  });

  it('uses alert for Alert and FieldError, status for Toast and AIStatus', () => {
    expect(buildComponent(node('Alert', { text: 'Gagal' })).element.getAttribute('role')).toBe('alert');
    expect(buildComponent(node('FieldError', { message: 'Wajib' })).element.getAttribute('role')).toBe('alert');
    expect(buildComponent(node('Toast', { text: 'Tersimpan' })).element.getAttribute('role')).toBe('status');
    expect(buildComponent(node('AIStatus', { text: 'Menulis' })).element.getAttribute('role')).toBe('status');
  });

  it('marks dialogs as modal', () => {
    for (const type of ['Modal', 'Sheet', 'ConfirmDialog']) {
      const element = buildComponent(node(type, { title: 'Konfirmasi' })).element;
      expect(element.getAttribute('role'), type).toBe('dialog');
      expect(element.getAttribute('aria-modal'), type).toBe('true');
    }
  });

  it('renders real headings with the requested level', () => {
    const card = buildComponent(node('Card', { title: 'Ringkasan', headingLevel: 3 }));
    expect(card.element.querySelector('h3')?.textContent).toBe('Ringkasan');
    const fallback = buildComponent(node('Card', { title: 'Ringkasan' }));
    expect(fallback.element.querySelector('h2')?.textContent).toBe('Ringkasan');
  });

  it('renders a fixed glyph for IconButton and a dot for unknown names', () => {
    const view = buildComponent(node('IconButton', { icon: 'plus', ariaLabel: 'Tambah' }));
    expect(view.element.tagName).toBe('BUTTON');
    expect(view.element.getAttribute('aria-label')).toBe('Tambah');
    expect(view.element.querySelector('svg path')?.getAttribute('d')).toContain('M12 5v14');

    const unknown = buildComponent(node('IconButton', { icon: 'flux-capacitor', ariaLabel: 'X' }));
    const path = unknown.element.querySelector('svg path')?.getAttribute('d') ?? '';
    expect(path).toBe('M12 12h.01');
    expect(unknown.element.querySelector('script')).toBeNull();
  });

  it('skips malformed list entries instead of throwing', () => {
    const view = buildComponent(
      node('Sidebar', { items: ['nope', null, { value: 'ok' }, { label: 'Beranda', href: 'javascript:alert(1)' }] }),
    );
    const links = view.element.querySelectorAll('li');
    expect(links.length).toBe(2);
    expect(view.element.querySelector('a')).toBeNull();
    expect(view.element.textContent).toContain('Beranda');
  });

  it('resets stale token styles when a prop is removed', () => {
    const view = buildComponent(node('Button', { label: 'A', tone: 'primary' }));
    const themed = view.element.style.backgroundColor;
    expect(themed).toBe('var(--mads-color-primary)');
    view.sync(node('Button', { label: 'B' }));
    expect(view.element.style.backgroundColor).not.toBe(themed);
    expect(view.element.textContent).toBe('B');
  });
});

describe('advanced placeholders', () => {
  it('renders a labelled placeholder for every advanced component', () => {
    withLanguage('en');
    for (const type of advancedNames) {
      const view = buildComponent(node(type, {}, `adv-${type}`));
      expect(view.element.getAttribute('data-muip-placeholder'), type).toBe(type);
      expect(view.element.getAttribute('role'), type).toBe('note');
      expect(view.element.getAttribute('aria-label'), type).toBeTruthy();
      expect(view.element.textContent, type).toContain(type);
      expect(view.element.textContent, type).toContain(`adv-${type}`);
    }
  });

  it('localises the placeholder sentence from documentElement.lang', () => {
    withLanguage('id');
    const indonesian = buildComponent(node('SplitPane', {}, 'split'));
    expect(indonesian.element.textContent).toContain('Belum tersedia di host ini');

    withLanguage('en');
    indonesian.sync(node('SplitPane', {}, 'split'));
    expect(indonesian.element.textContent).toContain('Not available in this host');
    expect(indonesian.element.textContent).not.toContain('Belum tersedia');
  });

  it('keeps children of a placeholder container', () => {
    const view = buildComponent(node('SplitPane', {}, 'split'));
    const child = document.createElement('span');
    child.textContent = 'child';
    view.content.append(child);
    expect(view.element.contains(child)).toBe(true);
  });
});
