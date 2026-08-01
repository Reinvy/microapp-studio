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

/** Pastel Tailwind classes per field type (badge / chip). */
export const typeColors: Record<string, string> = {
  text: 'bg-blue-100 text-blue-700',
  number: 'bg-cyan-100 text-cyan-700',
  select: 'bg-violet-100 text-violet-700',
  checkbox: 'bg-emerald-100 text-emerald-700',
  textarea: 'bg-amber-100 text-amber-700',
  date: 'bg-rose-100 text-rose-700',
  file: 'bg-orange-100 text-orange-700',
  slider: 'bg-pink-100 text-pink-700',
  toggle: 'bg-indigo-100 text-indigo-700',
  email: 'bg-sky-100 text-sky-700',
  phone: 'bg-teal-100 text-teal-700',
  url: 'bg-purple-100 text-purple-700',
  color: 'bg-fuchsia-100 text-fuchsia-700',
  rating: 'bg-yellow-100 text-yellow-700',
  heading: 'bg-blue-100 text-blue-700',
  paragraph: 'bg-slate-100 text-slate-700',
  divider: 'bg-gray-100 text-gray-700',
  spacer: 'bg-stone-100 text-stone-700',
  image: 'bg-green-100 text-green-700',
  card: 'bg-teal-100 text-teal-700',
  button: 'bg-purple-100 text-purple-700',
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
