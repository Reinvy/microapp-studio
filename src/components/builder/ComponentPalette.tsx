'use client';

import { useDraggable } from '@dnd-kit/core';
import {
  Type,
  Hash,
  List,
  CheckSquare,
  AlignLeft,
  Calendar,
  Sliders,
  ToggleLeft,
  File,
  Code2,
  GripVertical,
  Layout,
  SeparatorHorizontal,
} from 'lucide-react';
import type { FieldType } from '@/types/schema';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';

interface FieldTypeItem {
  type: FieldType;
  label: string;
  icon: React.ReactNode;
  category: 'input' | 'layout' | 'logic';
}

const FIELD_TYPES: FieldTypeItem[] = [
  { type: 'text', label: 'Text', icon: <Type className="h-4 w-4" />, category: 'input' },
  { type: 'number', label: 'Number', icon: <Hash className="h-4 w-4" />, category: 'input' },
  { type: 'select', label: 'Select', icon: <List className="h-4 w-4" />, category: 'input' },
  { type: 'checkbox', label: 'Checkbox', icon: <CheckSquare className="h-4 w-4" />, category: 'input' },
  { type: 'textarea', label: 'Textarea', icon: <AlignLeft className="h-4 w-4" />, category: 'input' },
  { type: 'date', label: 'Date', icon: <Calendar className="h-4 w-4" />, category: 'input' },
  { type: 'file', label: 'File', icon: <File className="h-4 w-4" />, category: 'input' },
  { type: 'slider', label: 'Slider', icon: <Sliders className="h-4 w-4" />, category: 'input' },
  { type: 'toggle', label: 'Toggle', icon: <ToggleLeft className="h-4 w-4" />, category: 'input' },
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
        'flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-border/50 bg-card cursor-grab active:cursor-grabbing select-none',
        'hover:border-primary/30 hover:bg-accent/50 hover:shadow-sm transition-all duration-150',
        'text-sm font-medium text-foreground/80',
        isDragging && 'opacity-50 shadow-lg ring-2 ring-primary/20'
      )}
    >
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground">{item.icon}</span>
      <span>{item.label}</span>
    </div>
  );
}

export default function ComponentPalette() {
  const { activeApp, addField } = useAppStore();
  const inputFields = FIELD_TYPES.filter((f) => f.category === 'input');

  return (
    <aside className="w-64 border-r border-border/50 bg-card/50 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Components
        </h3>
      </div>

      {/* Palette content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Input Fields */}
        <div>
          <div className="flex items-center gap-1.5 mb-2 px-1">
            <Type className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Input Fields
            </span>
          </div>
          <div className="space-y-1.5">
            {inputFields.map((item) => (
              <DraggableField key={item.type} item={item} />
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border/50" />

        {/* Quick add section */}
        <div className="space-y-2">
          <p className="text-[10px] text-muted-foreground px-1">
            Drag fields onto the canvas or click to add
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {inputFields.slice(0, 6).map((item) => (
              <button
                key={item.type}
                onClick={() =>
                  addField({
                    type: item.type,
                    label: `New ${item.label}`,
                  })
                }
                className="flex flex-col items-center gap-1 py-2 rounded-md border border-border/30 bg-card hover:bg-accent hover:border-primary/30 transition-all text-[10px] text-muted-foreground hover:text-foreground"
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom JS Node hint */}
        <div className="rounded-lg border border-dashed border-border/50 p-3 bg-muted/30">
          <div className="flex items-center gap-2 mb-1.5">
            <Code2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs font-medium">Custom Logic</span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Add custom JS logic nodes in the{' '}
            <span className="text-primary">Dev Playground</span> to process field values.
          </p>
        </div>
      </div>
    </aside>
  );
}
