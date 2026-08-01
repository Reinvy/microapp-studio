'use client';

import { useDraggable } from '@dnd-kit/core';
import type { FieldType } from '@/types/schema';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';
import { FieldTypeIcon } from '@/lib/fieldMeta';

interface FieldTypeItem {
  type: FieldType;
  label: string;
  icon: React.ReactNode;
  category: 'input' | 'layout' | 'content' | 'actions';
  color: string;
  gradient: string;
}

const FIELD_TYPES: FieldTypeItem[] = [
  // ── Input Fields ──
  { type: 'text', label: 'Text', icon: <FieldTypeIcon type="text" />, category: 'input', color: 'text-blue-600', gradient: 'from-blue-500/10 to-blue-600/5' },
  { type: 'number', label: 'Number', icon: <FieldTypeIcon type="number" />, category: 'input', color: 'text-cyan-600', gradient: 'from-cyan-500/10 to-cyan-600/5' },
  { type: 'select', label: 'Select', icon: <FieldTypeIcon type="select" />, category: 'input', color: 'text-violet-600', gradient: 'from-violet-500/10 to-violet-600/5' },
  { type: 'checkbox', label: 'Checkbox', icon: <FieldTypeIcon type="checkbox" />, category: 'input', color: 'text-emerald-600', gradient: 'from-emerald-500/10 to-emerald-600/5' },
  { type: 'textarea', label: 'Textarea', icon: <FieldTypeIcon type="textarea" />, category: 'input', color: 'text-amber-600', gradient: 'from-amber-500/10 to-amber-600/5' },
  { type: 'date', label: 'Date', icon: <FieldTypeIcon type="date" />, category: 'input', color: 'text-rose-600', gradient: 'from-rose-500/10 to-rose-600/5' },
  { type: 'file', label: 'File', icon: <FieldTypeIcon type="file" />, category: 'input', color: 'text-orange-600', gradient: 'from-orange-500/10 to-orange-600/5' },
  { type: 'slider', label: 'Slider', icon: <FieldTypeIcon type="slider" />, category: 'input', color: 'text-pink-600', gradient: 'from-pink-500/10 to-pink-600/5' },
  { type: 'toggle', label: 'Toggle', icon: <FieldTypeIcon type="toggle" />, category: 'input', color: 'text-indigo-600', gradient: 'from-indigo-500/10 to-indigo-600/5' },
  { type: 'email', label: 'Email', icon: <FieldTypeIcon type="email" />, category: 'input', color: 'text-sky-600', gradient: 'from-sky-500/10 to-sky-600/5' },
  { type: 'phone', label: 'Phone', icon: <FieldTypeIcon type="phone" />, category: 'input', color: 'text-teal-600', gradient: 'from-teal-500/10 to-teal-600/5' },
  { type: 'url', label: 'URL', icon: <FieldTypeIcon type="url" />, category: 'input', color: 'text-purple-600', gradient: 'from-purple-500/10 to-purple-600/5' },
  { type: 'color', label: 'Color', icon: <FieldTypeIcon type="color" />, category: 'input', color: 'text-fuchsia-600', gradient: 'from-fuchsia-500/10 to-fuchsia-600/5' },
  { type: 'rating', label: 'Rating', icon: <FieldTypeIcon type="rating" />, category: 'input', color: 'text-yellow-600', gradient: 'from-yellow-500/10 to-yellow-600/5' },

  // ── Layout Elements ──
  { type: 'heading', label: 'Heading', icon: <FieldTypeIcon type="heading" />, category: 'layout', color: 'text-blue-700', gradient: 'from-blue-600/10 to-blue-700/5' },
  { type: 'paragraph', label: 'Paragraph', icon: <FieldTypeIcon type="paragraph" />, category: 'layout', color: 'text-slate-700', gradient: 'from-slate-600/10 to-slate-700/5' },
  { type: 'divider', label: 'Divider', icon: <FieldTypeIcon type="divider" />, category: 'layout', color: 'text-gray-600', gradient: 'from-gray-500/10 to-gray-600/5' },
  { type: 'spacer', label: 'Spacer', icon: <FieldTypeIcon type="spacer" />, category: 'layout', color: 'text-stone-600', gradient: 'from-stone-500/10 to-stone-600/5' },

  // ── Rich Content ──
  { type: 'image', label: 'Image', icon: <FieldTypeIcon type="image" />, category: 'content', color: 'text-green-700', gradient: 'from-green-600/10 to-green-700/5' },
  { type: 'card', label: 'Card', icon: <FieldTypeIcon type="card" />, category: 'content', color: 'text-teal-700', gradient: 'from-teal-600/10 to-teal-700/5' },

  // ── Actions ──
  { type: 'button', label: 'Button', icon: <FieldTypeIcon type="button" />, category: 'actions', color: 'text-white', gradient: 'from-purple-600/20 to-indigo-600/20' },
];

const CATEGORIES: { key: string; label: string; gradient: string; border: string }[] = [
  {
    key: 'input',
    label: 'Input Fields',
    gradient: 'from-blue-50/50 via-cyan-50/30 to-transparent',
    border: 'border-blue-200/40',
  },
  {
    key: 'layout',
    label: 'Layout Elements',
    gradient: 'from-amber-50/50 via-orange-50/30 to-transparent',
    border: 'border-amber-200/40',
  },
  {
    key: 'content',
    label: 'Rich Content',
    gradient: 'from-emerald-50/50 via-green-50/30 to-transparent',
    border: 'border-emerald-200/40',
  },
  {
    key: 'actions',
    label: 'Actions',
    gradient: 'from-purple-50/50 via-violet-50/30 to-transparent',
    border: 'border-purple-200/40',
  },
];

interface DraggableFieldProps {
  item: FieldTypeItem;
}

function DraggableField({ item }: DraggableFieldProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `palette-${item.type}`,
    data: {
      type: 'component',
      fieldType: item.type,
    },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-xl clay-sm cursor-grab active:cursor-grabbing select-none transition-all duration-150',
        'bg-white/80 hover:bg-white',
        'hover:scale-[1.02]',
        'text-sm font-medium',
        isDragging && 'opacity-50 ring-2 ring-clay-purple/30 scale-105 clay-inset'
      )}
    >
      <span className={cn('flex items-center justify-center w-7 h-7 rounded-md shrink-0', item.color.replace('text-', 'bg-').replace(/-\d{3}$/, '-100'))}>
        {item.icon}
      </span>
      <span className="flex-1 truncate">{item.label}</span>
    </div>
  );
}

export default function ComponentPalette() {
  const { addField } = useAppStore();

  const handleQuickAdd = (type: FieldType, label: string) => {
    const baseField: Record<string, unknown> = { type, label: `New ${label}` };
    if (type === 'heading') {
      baseField.level = 2;
      baseField.content = 'Heading Text';
    }
    if (type === 'paragraph') {
      baseField.content = 'Paragraph text goes here...';
    }
    if (type === 'button') {
      baseField.variant = 'primary';
      baseField.actionType = 'submit';
    }
    addField(baseField as any);
  };

  return (
    <aside className="w-64 clay-card rounded-none rounded-r-2xl flex flex-col h-full overflow-hidden" style={{ backgroundColor: '#FFFFFFF0' }}>
      {/* Header */}
      <div className="px-4 py-4 border-b border-clay-border/40">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--clay-foreground)' }}>
          Components
        </h3>
      </div>

      {/* Palette content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {CATEGORIES.map((category) => {
          const items = FIELD_TYPES.filter((f) => f.category === category.key);
          return (
            <div
              key={category.key}
              className={cn(
                'rounded-xl p-3 space-y-2',
                'bg-clay-cream/60 clay-sm'
              )}
            >
              <div className="flex items-center gap-1.5 px-1">
                <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--clay-foreground)' }}>
                  {category.label}
                </span>
                <span className="text-[10px] ml-auto" style={{ color: 'var(--clay-muted)' }}>
                  {items.length}
                </span>
              </div>

              {/* Draggable items */}
              <div className="space-y-1">
                {items.map((item) => (
                  <DraggableField key={item.type} item={item} />
                ))}
              </div>

              {/* Quick-add buttons */}
              <div className="grid grid-cols-4 gap-1 pt-1">
                {items.map((item) => (
                  <button
                    key={item.type}
                    onClick={() => handleQuickAdd(item.type, item.label)}
                    className={cn(
                      'flex flex-col items-center gap-0.5 py-1.5 rounded-xl clay-sm',
                      'bg-white/80 hover:bg-white',
                      'hover:scale-105 active:scale-95 transition-all',
                      'text-[9px]',
                      item.color
                    )}
                    title={`Add ${item.label}`}
                  >
                    {item.icon}
                    <span className="truncate max-w-full">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
