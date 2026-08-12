'use client';

import { useDraggable } from '@dnd-kit/core';
import type { FieldType } from '@/types/schema';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';
import { FieldTypeIcon, fieldLabels, typeColors } from '@/lib/fieldMeta';
import { builderCopy } from '@/lib/builderCopy';

type CategoryKey = 'input' | 'layout' | 'content' | 'actions';

// Field types per category — labels come from fieldLabels and icons from
// FieldTypeIcon (fieldMeta is the single source of truth; nothing is
// duplicated here).
const FIELD_TYPES: { type: FieldType; category: CategoryKey }[] = [
  // ── Input Fields ──
  { type: 'text', category: 'input' },
  { type: 'number', category: 'input' },
  { type: 'select', category: 'input' },
  { type: 'checkbox', category: 'input' },
  { type: 'textarea', category: 'input' },
  { type: 'date', category: 'input' },
  { type: 'file', category: 'input' },
  { type: 'slider', category: 'input' },
  { type: 'toggle', category: 'input' },
  { type: 'email', category: 'input' },
  { type: 'phone', category: 'input' },
  { type: 'url', category: 'input' },
  { type: 'color', category: 'input' },
  { type: 'rating', category: 'input' },

  // ── Layout Elements ──
  { type: 'heading', category: 'layout' },
  { type: 'paragraph', category: 'layout' },
  { type: 'divider', category: 'layout' },
  { type: 'spacer', category: 'layout' },

  // ── Rich Content ──
  { type: 'image', category: 'content' },
  { type: 'card', category: 'content' },

  // ── Actions ──
  { type: 'button', category: 'actions' },
];

const CATEGORIES: { key: CategoryKey; gradient: string; border: string }[] = [
  {
    key: 'input',
    gradient: 'from-clay-blue/20 via-clay-blue/10 to-transparent',
    border: 'border-clay-blue/40',
  },
  {
    key: 'layout',
    gradient: 'from-clay-yellow/20 via-clay-yellow/10 to-transparent',
    border: 'border-clay-yellow/40',
  },
  {
    key: 'content',
    gradient: 'from-clay-green/20 via-clay-green/10 to-transparent',
    border: 'border-clay-green/40',
  },
  {
    key: 'actions',
    gradient: 'from-clay-purple/20 via-clay-purple/10 to-transparent',
    border: 'border-clay-purple/40',
  },
];

interface DraggableFieldProps {
  item: { type: FieldType; category: CategoryKey };
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
      <span
        className="flex items-center justify-center w-7 h-7 rounded-xl shrink-0"
        style={{ backgroundColor: typeColors[item.type] || '#F5EDE5' }}
      >
        <FieldTypeIcon type={item.type} className="h-4 w-4" />
      </span>
      <span className="flex-1 truncate">{fieldLabels[item.type]}</span>
    </div>
  );
}

export default function ComponentPalette() {
  const { addField } = useAppStore();

  const handleQuickAdd = (type: FieldType, label: string) => {
    // Labels and default content come from builderCopy — nothing hardcoded here.
    const baseField: Record<string, unknown> = { type, label: builderCopy.page.newField(label) };
    if (type === 'heading') {
      baseField.level = 2;
      baseField.content = builderCopy.palette.quickAdd.heading;
    }
    if (type === 'paragraph') {
      baseField.content = builderCopy.palette.quickAdd.paragraph;
    }
    if (type === 'button') {
      baseField.variant = 'primary';
      baseField.actionType = 'submit';
    }
    addField(baseField as any);
  };

  return (
    <aside className="w-full md:w-64 flex flex-col h-full overflow-hidden rounded-r-2xl border-r border-clay-border/30 bg-[#FFFFFFF0] shadow-[4px_0_12px_rgba(174,162,146,0.08)]">
      {/* Header */}
      <div className="px-4 py-4 border-b border-clay-border/40">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--clay-foreground)' }}>
          {builderCopy.palette.title}
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
                  {builderCopy.palette.categories[category.key]}
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
                    onClick={() => handleQuickAdd(item.type, fieldLabels[item.type] || item.type)}
                    className={cn(
                      'flex flex-col items-center gap-0.5 py-1.5 rounded-xl clay-sm',
                      'bg-white/80 hover:bg-white',
                      'hover:scale-105 active:scale-95 transition-all',
                      'text-[9px] text-clay-foreground'
                    )}
                    title={builderCopy.palette.addTitle(fieldLabels[item.type] || item.type)}
                  >
                    <span
                      className="flex items-center justify-center w-6 h-6 rounded-xl"
                      style={{ backgroundColor: typeColors[item.type] || '#F5EDE5' }}
                    >
                      <FieldTypeIcon type={item.type} className="h-3 w-3" />
                    </span>
                    <span className="truncate max-w-full">{fieldLabels[item.type]}</span>
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
