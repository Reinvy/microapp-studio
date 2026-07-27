'use client';

import { useRouter } from 'next/navigation';
import {
  Play,
  Pencil,
  Trash2,
  Type,
  Hash,
  List,
  CheckSquare,
  AlignLeft,
  Calendar,
  Sliders,
  ToggleLeft,
  File,
} from 'lucide-react';
import type { AppSchema, FieldType } from '@/types/schema';
import { formatDate } from '@/lib/utils';

interface AppCardProps {
  app: AppSchema;
  onDelete: (id: string) => void;
  onRun: (id: string) => void;
}

const fieldTypeIcons: Record<FieldType, React.ReactNode> = {
  text: <Type className="h-3 w-3" />,
  number: <Hash className="h-3 w-3" />,
  select: <List className="h-3 w-3" />,
  checkbox: <CheckSquare className="h-3 w-3" />,
  textarea: <AlignLeft className="h-3 w-3" />,
  date: <Calendar className="h-3 w-3" />,
  file: <File className="h-3 w-3" />,
  slider: <Sliders className="h-3 w-3" />,
  toggle: <ToggleLeft className="h-3 w-3" />,
  heading: <Type className="h-3 w-3" />,
  paragraph: <AlignLeft className="h-3 w-3" />,
  divider: <Type className="h-3 w-3" />,
  spacer: <Type className="h-3 w-3" />,
  image: <File className="h-3 w-3" />,
  card: <Type className="h-3 w-3" />,
  button: <Type className="h-3 w-3" />,
  color: <Hash className="h-3 w-3" />,
  email: <Type className="h-3 w-3" />,
  phone: <Hash className="h-3 w-3" />,
  url: <Type className="h-3 w-3" />,
  rating: <List className="h-3 w-3" />,
};

const fieldTypeLabels: Record<FieldType, string> = {
  text: 'Text',
  number: 'Number',
  select: 'Select',
  checkbox: 'Checkbox',
  textarea: 'Textarea',
  date: 'Date',
  file: 'File',
  slider: 'Slider',
  toggle: 'Toggle',
  heading: 'Heading',
  paragraph: 'Paragraph',
  divider: 'Divider',
  spacer: 'Spacer',
  image: 'Image',
  card: 'Card',
  button: 'Button',
  color: 'Color',
  email: 'Email',
  phone: 'Phone',
  url: 'URL',
  rating: 'Rating',
};

function getFieldTypeCounts(fields: AppSchema['fields']): Map<FieldType, number> {
  const counts = new Map<FieldType, number>();
  for (const f of fields) {
    counts.set(f.type, (counts.get(f.type) || 0) + 1);
  }
  return counts;
}

export default function AppCard({ app, onDelete, onRun }: AppCardProps) {
  const router = useRouter();
  const fieldCounts = getFieldTypeCounts(app.fields);
  const totalFields = app.fields.length;
  const logicCount = app.logicNodes?.length || 0;

  return (
    <div className="clay-card group relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-1">
      {/* Top row: name + actions */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-base font-semibold text-[#5D4E37] truncate flex-1">
          {app.name}
        </h3>
        <div className="flex items-center gap-1 shrink-0">
          <button
            className="clay-sm flex h-7 w-7 items-center justify-center bg-[#F5EDE5] text-[#B8A898] hover:text-[#5D4E37]"
            onClick={() => router.push(`/builder?id=${app.id}`)}
            aria-label={`Edit ${app.name}`}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            className="clay-sm flex h-7 w-7 items-center justify-center bg-[#FFD0D0] text-[#B8A898] hover:text-[#5D4E37]"
            onClick={() => onDelete(app.id)}
            aria-label={`Delete ${app.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-[#B8A898] line-clamp-2 min-h-[2em] mb-3">
        {app.description || 'No description'}
      </p>

      {/* Field type badges */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {Array.from(fieldCounts.entries()).slice(0, 5).map(([type, count]) => (
          <span
            key={type}
            className="clay-sm inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-normal text-[#5D4E37] bg-[#F5EDE5]"
          >
            {fieldTypeIcons[type]}
            {fieldTypeLabels[type]}
            {count > 1 && <span className="text-[#B8A898]">×{count}</span>}
          </span>
        ))}
        {Array.from(fieldCounts.keys()).length > 5 && (
          <span className="clay-sm inline-flex items-center px-2 py-0.5 text-[10px] font-normal text-[#B8A898] bg-[#F5EDE5]">
            +{Array.from(fieldCounts.keys()).length - 5} more
          </span>
        )}
      </div>

      {/* Footer: meta + run button */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-3 text-[10px] text-[#B8A898]">
          <span>{totalFields} field{totalFields !== 1 ? 's' : ''}</span>
          {logicCount > 0 && <span>{logicCount} node{logicCount !== 1 ? 's' : ''}</span>}
          <span>{formatDate(app.updatedAt)}</span>
        </div>
        <button
          className="clay-button flex h-7 items-center gap-1.5 px-3 text-xs font-medium text-[#5D4E37] bg-[#C5E8F7]"
          onClick={() => onRun(app.id)}
        >
          <Play className="h-3 w-3 fill-current" />
          Run
        </button>
      </div>
    </div>
  );
}
