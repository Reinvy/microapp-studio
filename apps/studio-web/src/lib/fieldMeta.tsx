'use client';

/**
 * fieldMeta — shared field-type metadata for the builder UI.
 *
 * Single source of truth for:
 *  - fieldIcons:  Lucide icon component per FieldType (used by Canvas, Palette, etc.)
 *  - typeColors:  Tailwind pastel badge classes per FieldType
 *
 * Previously duplicated between Canvas.tsx and ComponentPalette.tsx.
 */
import {
  Type,
  Hash,
  List,
  CheckSquare,
  AlignLeft,
  Calendar,
  File,
  Sliders,
  ToggleLeft,
  Mail,
  Phone,
  Link,
  Palette,
  Star,
  Heading,
  Pilcrow,
  SeparatorHorizontal,
  Expand,
  Image,
  Layout,
  SquareMousePointer,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { FieldType } from '@/types/schema';

/** Icon component per field type — reference, not rendered node. */
export const fieldIcons: Record<string, LucideIcon> = {
  text: Type,
  number: Hash,
  select: List,
  checkbox: CheckSquare,
  textarea: AlignLeft,
  date: Calendar,
  file: File,
  slider: Sliders,
  toggle: ToggleLeft,
  email: Mail,
  phone: Phone,
  url: Link,
  color: Palette,
  rating: Star,
  heading: Heading,
  paragraph: Pilcrow,
  divider: SeparatorHorizontal,
  spacer: Expand,
  image: Image,
  card: Layout,
  button: SquareMousePointer,
};

/**
 * Pastel clay hex colors per field type.
 *
 * Single source of truth for field-type chips / badges. Values are actual
 * CSS colors (not Tailwind class names) so they work both as inline
 * `backgroundColor` in Canvas chips and as badge accents elsewhere.
 *
 * All colors come from the Claymorphism v3 pastel palette:
 *   pink #FFD5E5, blue #C5E8F7, purple #D5B8F5, yellow #FFF2C5,
 *   green #C5F0D5, peach #FFE5D0, rose #FFD0D0
 */
export const typeColors: Record<string, string> = {
  text: '#C5E8F7',      // clay blue
  number: '#FFE5D0',    // clay peach
  select: '#D5B8F5',    // clay purple
  checkbox: '#C5F0D5',  // clay green
  textarea: '#FFF2C5',  // clay yellow
  date: '#FFD0D0',      // clay rose
  file: '#FFD5E5',      // clay pink
  slider: '#C5E8F7',    // clay blue
  toggle: '#D5B8F5',    // clay purple
  email: '#C5F0D5',     // clay green
  phone: '#FFE5D0',     // clay peach
  url: '#FFF2C5',       // clay yellow
  color: '#FFD5E5',     // clay pink
  rating: '#FFD0D0',    // clay rose
  heading: '#D5B8F5',   // clay purple
  paragraph: '#C5E8F7', // clay blue
  divider: '#FFE5D0',   // clay peach
  spacer: '#FFF2C5',    // clay yellow
  image: '#C5F0D5',     // clay green
  card: '#FFD5E5',      // clay pink
  button: '#D5B8F5',    // clay purple
};

/** Renders the icon for a field type with a configurable size. */
export function FieldTypeIcon({
  type,
  className = 'h-4 w-4',
}: {
  type: FieldType | string;
  className?: string;
}) {
  const Icon = fieldIcons[type] || Type;
  return <Icon className={className} />;
}

/**
 * Human-readable label per field type — used by dashboard AppCard badges,
 * the builder palette, and anywhere a type needs a display name.
 *
 * Single source of truth; previously duplicated in AppCard.tsx.
 */
export const fieldLabels: Record<string, string> = {
  text: 'Text',
  number: 'Number',
  select: 'Select',
  checkbox: 'Checkbox',
  textarea: 'Textarea',
  date: 'Date',
  file: 'File',
  slider: 'Slider',
  toggle: 'Toggle',
  email: 'Email',
  phone: 'Phone',
  url: 'URL',
  color: 'Color',
  rating: 'Rating',
  heading: 'Heading',
  paragraph: 'Paragraph',
  divider: 'Divider',
  spacer: 'Spacer',
  image: 'Image',
  card: 'Card',
  button: 'Button',
};

