import { describe, expect, it } from 'vitest';
import { validateDocument } from '@microapp/runtime-web';
import {
  TEMPLATES,
  TEMPLATE_CATEGORIES,
  searchTemplates,
  templateById,
  templateCategory,
  templatesByCategory,
} from '../catalog';

describe('template catalog', () => {
  it('ships eight templates across four categories', () => {
    expect(TEMPLATES).toHaveLength(8);
    expect(TEMPLATE_CATEGORIES.map((category) => category.id)).toEqual([
      'kasir',
      'produktivitas',
      'inventaris',
      'survey',
    ]);
    for (const category of TEMPLATE_CATEGORIES) {
      expect(templatesByCategory(category.id).length).toBeGreaterThan(0);
    }
  });

  it('validates every template against the MUIP contract', () => {
    for (const template of TEMPLATES) {
      const result = validateDocument(template.nodes[0]);
      expect(result.node.type, template.id).toBe('Stack');
      expect(result.node.props?.direction).toBe('column');
      expect(result.placeholders, `${template.id} must not need advanced components`).toEqual([]);
    }
  });

  it('gives every template storage.app and a unique id', () => {
    const ids = new Set(TEMPLATES.map((template) => template.id));
    expect(ids.size).toBe(TEMPLATES.length);
    for (const template of TEMPLATES) {
      expect(template.permissions).toContain('storage.app');
      expect(template.name.length).toBeGreaterThan(0);
      expect(template.description.length).toBeGreaterThan(0);
    }
  });

  it('filters by category and search term', () => {
    expect(templatesByCategory('kasir').map((template) => template.id).sort()).toEqual([
      'kasir-sederhana',
      'kasir-warung',
    ]);
    expect(searchTemplates('stok').map((template) => template.id)).toContain('stok-minimum');
    expect(searchTemplates('  ').length).toBe(8);
    expect(searchTemplates('tidak-ada').length).toBe(0);
  });

  it('derives the category of a template id', () => {
    expect(templateCategory('kasir-warung')).toBe('kasir');
    expect(templateCategory('survey-warga')).toBe('survey');
    expect(templateById('tidak-ada')).toBeUndefined();
  });
});
