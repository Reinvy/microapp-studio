'use client';

import { useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
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
  Plus,
} from 'lucide-react';
import type { FieldType, FieldSchema } from '@/types/schema';
import { useAppStore } from '@/store/appStore';
import { generateId, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const fieldIcons: Record<FieldType, React.ReactNode> = {
  text: <Type className="h-3.5 w-3.5" />,
  number: <Hash className="h-3.5 w-3.5" />,
  select: <List className="h-3.5 w-3.5" />,
  checkbox: <CheckSquare className="h-3.5 w-3.5" />,
  textarea: <AlignLeft className="h-3.5 w-3.5" />,
  date: <Calendar className="h-3.5 w-3.5" />,
  file: <File className="h-3.5 w-3.5" />,
  slider: <Sliders className="h-3.5 w-3.5" />,
  toggle: <ToggleLeft className="h-3.5 w-3.5" />,
};

interface SortableFieldProps {
  field: FieldSchema;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}

function SortableField({ field, isSelected, onSelect, onRemove }: SortableFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative flex items-center gap-3 p-3 rounded-lg border-2 bg-card cursor-pointer transition-all duration-150',
        'hover:border-primary/30 hover:shadow-sm',
        isSelected
          ? 'border-primary shadow-sm shadow-primary/10 ring-1 ring-primary/20'
          : 'border-border/50',
        isDragging && 'opacity-50 shadow-lg z-50'
      )}
      onClick={() => onSelect(field.id)}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="flex items-center justify-center h-8 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent cursor-grab active:cursor-grabbing transition-colors shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </button>

      {/* Type icon */}
      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary shrink-0">
        {fieldIcons[field.type]}
      </div>

      {/* Field info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{field.label}</span>
          {field.required && (
            <span className="text-[10px] text-destructive font-medium">*</span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-normal uppercase">
            {field.type}
          </Badge>
          {field.placeholder && (
            <span className="text-[10px] text-muted-foreground truncate">
              {field.placeholder}
            </span>
          )}
        </div>
      </div>

      {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(field.id);
        }}
        className="flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

interface CanvasFieldCardProps {
  field: FieldSchema;
}

function CanvasFieldCard({ field }: CanvasFieldCardProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
      <div className="flex items-center justify-center w-8 h-8 rounded-md bg-primary/10 text-primary shrink-0">
        {fieldIcons[field.type]}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{field.label}</span>
        </div>
        <Badge variant="secondary" className="text-[9px] px-1.5 py-0 h-4 font-normal uppercase">
          {field.type}
        </Badge>
      </div>
    </div>
  );
}

export default function Canvas() {
  const {
    activeApp,
    selectedFieldId,
    selectField,
    removeField,
    reorderFields,
    addField,
  } = useAppStore();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      // Check if this is a palette drop
      if (active.data.current?.type === 'component') {
        const fieldType = active.data.current?.fieldType as FieldType;
        if (fieldType && activeApp) {
          const newIndex = activeApp.fields.findIndex((f) => f.id === over.id);
          addField({
            type: fieldType,
            label: `New ${fieldType.charAt(0).toUpperCase() + fieldType.slice(1)}`,
          });
          if (newIndex >= 0) {
            reorderFields(activeApp.fields.length - 1, newIndex);
          }
        }
        return;
      }

      // Reorder existing fields
      const oldIndex = activeApp?.fields.findIndex((f) => f.id === active.id);
      const newIndex = activeApp?.fields.findIndex((f) => f.id === over.id);
      if (oldIndex !== undefined && newIndex !== undefined && oldIndex !== -1 && newIndex !== -1) {
        reorderFields(oldIndex, newIndex);
      }
    },
    [activeApp, addField, reorderFields]
  );

  const fields = activeApp?.fields || [];
  const isEmpty = fields.length === 0;

  if (!activeApp) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center p-8">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <Type className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No app selected</h3>
          <p className="text-sm text-muted-foreground">
            Select or create an app to start building.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-muted/20">
      <div className="max-w-3xl mx-auto p-6">
        {/* Canvas header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold">Canvas</h2>
            <p className="text-[11px] text-muted-foreground">
              {fields.length} field{fields.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={fields.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {isEmpty && (
                <div className="flex flex-col items-center justify-center py-16 px-4 rounded-xl border-2 border-dashed border-border/50 bg-card/30">
                  <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center mb-4">
                    <Plus className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <h3 className="text-sm font-medium mb-1">Drop components here</h3>
                  <p className="text-xs text-muted-foreground text-center max-w-xs">
                    Drag fields from the palette on the left, or click a field type to add it to
                    your app.
                  </p>
                </div>
              )}

              {fields.map((field) => (
                <SortableField
                  key={field.id}
                  field={field}
                  isSelected={selectedFieldId === field.id}
                  onSelect={selectField}
                  onRemove={removeField}
                />
              ))}
            </div>
          </SortableContext>

          <DragOverlay>
            {activeApp && (
              <CanvasFieldCard
                field={
                  fields.find((f) => f.id === selectedFieldId) || {
                    id: 'overlay',
                    type: 'text',
                    label: 'Field',
                  }
                }
              />
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
