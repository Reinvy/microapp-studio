'use client';

import { useDraggable } from '@dnd-kit/core';
import type { FieldType } from '@/types/schema';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';
import { FieldTypeIcon, typeColors } from '@/lib/fieldMeta';

interface FieldTypeItem {
  type: FieldType;
  label: string;
  icon: React.ReactNode;
  category: 'input' | 'layout' | 'content' | 'actions';
}

const FIELD_TYPES: FieldTypeItem[] = [
  // ── Input Fields ──
  { type: 'text', label: 'Text', icon: <FieldTypeIcon type="text" />, category: 'input' },
  { type: 'number', label: 'Number', icon: <FieldTypeIcon type="number" />, category: 'input' },
  { type: 'select', label: 'Select', icon: <FieldTypeIcon type="select" />, category: 'input' },
  { type: 'checkbox', label: 'Checkbox', icon: <FieldTypeIcon type="checkbox" />, category: 'input' },
  { type: 'textarea', label: 'Textarea', icon: <FieldTypeIcon type="textarea" />, category: 'input' },
  { type: 'date', label: 'Date', icon: <FieldTypeIcon type="date" />, category: 'input' },
  { type: 'file', label: 'File', icon: <FieldTypeIcon type="file" />, category: 'input' },
  { type: 'slider', label: 'Slider', icon: <FieldTypeIcon type="slider" />, category: 'input' },
  { type: 'toggle', label: 'Toggle', icon: <FieldTypeIcon type="toggle" />, category: 'input' },
  { type: 'email', label: 'Email', icon: <FieldTypeIcon type="email" />, category: 'input' },
  { type: 'phone', label: 'Phone', icon: <FieldTypeIcon type="phone" />, category: 'input' },
  { type: 'url', label: 'URL', icon: <FieldTypeIcon type="url" />, category: 'input' },
  { type: 'color', label: 'Color', icon: <FieldTypeIcon type="color" />, category: 'input' },
  { type: 'rating', label: 'Rating', icon: <FieldTypeIcon type="rating" />, category: 'input' },

  // ── Layout Elements ──
  { type: 'heading', label: 'Heading', icon: <FieldTypeIcon type="heading" />, category: 'layout' },
  { type: 'paragraph', label: 'Paragraph', icon: <FieldTypeIcon type="paragraph" />, category: 'layout' },
  { type: 'divider', label: 'Divider', icon: <FieldTypeIcon type="divider" />, category: 'layout' },
  { type: 'spacer', label: 'Spacer', icon: <FieldTypeIcon type="spacer" />, category: 'layout' },

  // ── Rich Content ──
  { type: 'image', label: 'Image', icon: <FieldTypeIcon type="image" />, category: 'content' },
  { type: 'card', label: 'Card', icon: <FieldTypeIcon type="card" />, category: 'content' },

  // ── Actions ──
  { type: 'button', label: 'Button', icon: <FieldTypeIcon type="button" />, category: 'actions' },
];

const CATEGORIES: { key: string; label: string; gradient: string; border: string }[] = [
  {
    key: 'input',
    label: 'Input Fields',
    gradient: 'from-clay-blue/20 via-clay-blue/10 to-transparent',
    border: 'border-clay-blue/40',
  },
  {
    key: 'layout',
    label: 'Layout Elements',
    gradient: 'from-clay-yellow/20 via-clay-yellow/10 to-transparent',
    border: 'border-clay-yellow/40',
  },
  {
    key: 'content',
    label: 'Rich Content',
    gradient: 'from-clay-green/20 via-clay-green/10 to-transparent',
    border: 'border-clay-green/40',
  },
  {
    key: 'actions',
    label: 'Actions',
    gradient: 'from-clay-purple/20 via-clay-purple/10 to-transparent',
    border: 'border-clay-purple/40',
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
      <span
        className="flex items-center justify-center w-7 h-7 rounded-xl shrink-0"
        style={{ backgroundColor: typeColors[item.type] || '#F5EDE5' }}
      >
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
    <aside className="w-full md:w-64 flex flex-col h-full overflow-hidden rounded-r-2xl border-r border-clay-border/30 bg-[#FFFFFFF0] shadow-[4px_0_12px_rgba(174,162,146,0.08)]">
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
                      'text-[9px] text-clay-foreground'
                    )}
                    title={`Add ${item.label}`}
                  >
                    <span
                      className="flex items-center justify-center w-6 h-6 rounded-xl"
                      style={{ backgroundColor: typeColors[item.type] || '#F5EDE5' }}
                    >
                      {item.icon}
                    </span>
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
