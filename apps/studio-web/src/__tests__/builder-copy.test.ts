/**
 * builder-copy.test.ts — Builder UI copy centralization (Cron 2, UI/UX)
 *
 * Source-level compliance checks for the builder tool chrome:
 * - PropertiesPanel must NOT hardcode UI label strings — every label /
 *   placeholder / option label comes from builderCopy.properties
 * - PropertiesPanel uses the shared ClayToggle for switch controls (no
 *   duplicated inline toggle markup)
 * - ComponentPalette quick-add defaults come from builderCopy.palette.quickAdd
 * - builderCopy.properties covers the full label surface it replaces
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

const repoRoot = path.resolve(__dirname, '..', '..');
const read = (p: string) => readFileSync(path.join(repoRoot, p), 'utf8');

const propertiesPanel = read('src/components/builder/PropertiesPanel.tsx');
const palette = read('src/components/builder/ComponentPalette.tsx');
const builderCopy = read('src/lib/builderCopy.ts');
const clayToggle = read('src/components/ui/clay-toggle.tsx');

// Strings that used to be hardcoded in PropertiesPanel before the Cron 2
// refactor — none of them may appear as JSX text nodes anymore.
const FORMER_HARDCODED: string[] = [
  '>Field Type<',
  '>Basic<',
  '>Validation<',
  '>Styling<',
  '>Animation<',
  '>Advanced<',
  '>Label<',
  '>Placeholder<',
  '>Required<',
  '>Content Text<',
  '>Level<',
  '>Alignment<',
  '>Variant<',
  '>Action Type<',
  '>URL<',
  '>Image URL<',
  '>Alt Text<',
  '>Aspect Ratio<',
  '>Options<',
  '>Default Value<',
  '>Min Length<',
  '>Max Length<',
  '>Regex Pattern<',
  '>Error Message<',
  '>Min<',
  '>Max<',
  '>Step<',
  '>Width<',
  '>BG Color<',
  '>Text Color<',
  '>Show Border<',
  '>Border Radius<',
  '>Shadow<',
  '>Custom CSS Class<',
  '>Help Text<',
  '>Remove Field<',
  '>No field selected<',
  '>H1 - Largest<',
  '>Full Width<',
];

describe('Builder tool chrome — copy centralization (Cron 2)', () => {
  it('PropertiesPanel has no hardcoded UI label strings', () => {
    for (const literal of FORMER_HARDCODED) {
      expect(propertiesPanel, `PropertiesPanel must not contain ${literal}`).not.toContain(literal);
    }
  });

  it('PropertiesPanel reads labels/placeholders from builderCopy.properties', () => {
    expect(propertiesPanel).toMatch(/const\s*\{\s*labels,\s*placeholders,\s*sections\s*\}\s*=\s*builderCopy\.properties/);
    expect(propertiesPanel).toMatch(/builderCopy\.properties\.removeField/);
    expect(propertiesPanel).toMatch(/\{\s*properties\s*\}\s*=\s*builderCopy/);
    expect(propertiesPanel).toMatch(/properties\.panelTitle/);
  });

  it('PropertiesPanel uses the shared ClayToggle (no duplicated switch markup)', () => {
    expect(propertiesPanel).toMatch(/import\s*\{[^}]*ClayToggle[^}]*\}\s*from\s*['"]@\/components\/ui\/clay-toggle['"]/);
    expect(propertiesPanel).toMatch(/<ClayToggle/g);
    // The old inline toggle markup (h-5 w-9 track + knob) must no longer be
    // duplicated inside PropertiesPanel — it lives only in ClayToggle.
    expect(propertiesPanel).not.toMatch(/relative inline-flex h-5 w-9/);
  });

  it('ClayToggle renders role="switch" for accessibility', () => {
    expect(clayToggle).toMatch(/role="switch"/);
    expect(clayToggle).toMatch(/aria-checked=\{checked\}/);
  });

  it('ComponentPalette quick-add defaults come from builderCopy, not literals', () => {
    expect(palette).toMatch(/builderCopy\.page\.newField\(label\)/);
    expect(palette).toMatch(/builderCopy\.palette\.quickAdd\.heading/);
    expect(palette).toMatch(/builderCopy\.palette\.quickAdd\.paragraph/);
    expect(palette).not.toContain("'Heading Text'");
    expect(palette).not.toContain("'Paragraph text goes here...'");
  });

  it('builderCopy.properties covers the centralized option labels', () => {
    expect(builderCopy).toMatch(/h1: 'H1 - Largest'/);
    expect(builderCopy).toMatch(/fullWidth: 'Full Width'/);
    expect(builderCopy).toMatch(/noShadow: 'No Shadow'/);
    expect(builderCopy).toMatch(/widescreen: 'Widescreen/);
  });

  it('textColor placeholder is the clay token #4A3F35, never pure black', () => {
    expect(builderCopy).toMatch(/textColor: '#4A3F35'/);
    expect(builderCopy).not.toMatch(/textColor: '#000'/);
  });
});
