import { describe, expect, it } from 'vitest';
import { CORE_CATALOG_SIZE } from '@microapp/runtime-web';
import { createRoot } from '../document';
import { defaultPropsFor, nodeFromPalette, paletteItem, paletteItems } from '../palette';

describe('palette', () => {
  it('offers the 48 core components by default and 120 with Advanced', () => {
    expect(paletteItems({ advanced: false })).toHaveLength(CORE_CATALOG_SIZE);
    expect(CORE_CATALOG_SIZE).toBe(48);
    expect(paletteItems({ advanced: true })).toHaveLength(120);
  });

  it('filters by category and search term', () => {
    expect(paletteItems({ advanced: true, category: 'layout' }).every((item) => item.category === 'layout')).toBe(true);
    expect(paletteItems({ advanced: false, query: 'card' }).map((item) => item.name)).toContain('Card');
    expect(paletteItems({ advanced: false, query: 'zzz' })).toHaveLength(0);
  });

  it('marks containers so the canvas knows where a drop is legal', () => {
    expect(paletteItem('Stack')?.allowsChildren).toBe(true);
    expect(paletteItem('Card')?.allowsChildren).toBe(true);
    expect(paletteItem('Button')?.allowsChildren).toBe(false);
    expect(paletteItem('DataTable')?.allowsChildren).toBe(false);
  });

  it('gives fresh nodes valid default props', () => {
    expect(defaultPropsFor('Stack')).toMatchObject({ direction: 'column' });
    expect(defaultPropsFor('DataTable')).toHaveProperty('columns');
    expect(defaultPropsFor('TidakAda')).toEqual({});
  });

  it('creates a palette node with a unique id and default props', () => {
    const root = createRoot();
    const first = nodeFromPalette('Card', root);
    expect(first).toMatchObject({ type: 'Card', id: 'card-1' });
    expect(first?.props).toMatchObject({ padding: 'md' });
    expect(nodeFromPalette('TidakAda', root)).toBeNull();
  });
});
