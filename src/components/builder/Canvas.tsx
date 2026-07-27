'use client';

import { useCallback, useState } from 'react';
import {
  SortableContext,
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
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from 'lucide-react';
import type { FieldType, FieldSchema } from '@/types/schema';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// ── Icon map ──

export const fieldIcons: Record<string, React.ReactNode> = {
  text: <Type className="h-3.5 w-3.5" />,
  number: <Hash className="h-3.5 w-3.5" />,
  select: <List className="h-3.5 w-3.5" />,
  checkbox: <CheckSquare className="h-3.5 w-3.5" />,
  textarea: <AlignLeft className="h-3.5 w-3.5" />,
  date: <Calendar className="h-3.5 w-3.5" />,
  file: <File className="h-3.5 w-3.5" />,
  slider: <Sliders className="h-3.5 w-3.5" />,
  toggle: <ToggleLeft className="h-3.5 w-3.5" />,
  email: <Mail className="h-3.5 w-3.5" />,
  phone: <Phone className="h-3.5 w-3.5" />,
  url: <Link className="h-3.5 w-3.5" />,
  color: <Palette className="h-3.5 w-3.5" />,
  rating: <Star className="h-3.5 w-3.5" />,
  heading: <Heading className="h-3.5 w-3.5" />,
  paragraph: <Pilcrow className="h-3.5 w-3.5" />,
  divider: <SeparatorHorizontal className="h-3.5 w-3.5" />,
  spacer: <Expand className="h-3.5 w-3.5" />,
  image: <Image className="h-3.5 w-3.5" />,
  card: <Layout className="h-3.5 w-3.5" />,
  button: <SquareMousePointer className="h-3.5 w-3.5" />,
};

const typeColors: Record<string, string> = {
  text: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  number: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  select: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  checkbox: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  textarea: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  date: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  file: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  slider: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  toggle: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  email: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  phone: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  url: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  color: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/30 dark:text-fuchsia-300',
  rating: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  heading: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  paragraph: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300',
  divider: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
  spacer: 'bg-stone-100 text-stone-700 dark:bg-stone-900/30 dark:text-stone-300',
  image: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  card: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  button: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
};

// ── Visual Field Preview ──

export function FieldPreview({ field }: { field: FieldSchema }) {
  switch (field.type) {
    case 'heading':
      return (
        <div className={cn('font-bold text-foreground', field.alignment === 'center' ? 'text-center' : field.alignment === 'right' ? 'text-right' : 'text-left')}>
          {field.content || 'Heading'} ({'H' + (field.level || 2)})
        </div>
      );

    case 'paragraph':
      return (
        <p className={cn('text-sm text-muted-foreground leading-relaxed', field.alignment === 'center' ? 'text-center' : field.alignment === 'right' ? 'text-right' : 'text-left')}>
          {field.content || 'Paragraph text...'}
        </p>
      );

    case 'divider':
      return <hr className="border-t border-border w-full" />;

    case 'spacer':
      return <div className="h-6 w-full bg-muted/20 rounded" />;

    case 'image':
      return (
        <div className={cn('bg-muted rounded-md flex items-center justify-center overflow-hidden', field.aspectRatio === 'square' ? 'aspect-square' : field.aspectRatio === '16:9' ? 'aspect-video' : 'h-32')}>
          <Image className="h-8 w-8 text-muted-foreground/40" />
        </div>
      );

    case 'card':
      return (
        <div className="rounded-lg border bg-card p-4 shadow-sm">
          <div className="h-3 w-24 bg-muted rounded mb-2" />
          <div className="h-2 w-full bg-muted/50 rounded" />
        </div>
      );

    case 'button':
      return (
        <div className="flex">
          <span
            className={cn(
              'inline-flex items-center justify-center rounded-md px-4 py-1.5 text-xs font-medium transition-colors',
              field.variant === 'secondary' && 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
              field.variant === 'outline' && 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
              field.variant === 'ghost' && 'hover:bg-accent hover:text-accent-foreground',
              field.variant === 'danger' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
              (!field.variant || field.variant === 'primary') && 'bg-primary text-primary-foreground hover:bg-primary/90',
            )}
          >
            {field.label || 'Button'}
          </span>
        </div>
      );

    case 'checkbox':
      return (
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded border-2 border-muted-foreground/30" />
          <span className="text-sm text-muted-foreground">{field.label}</span>
        </div>
      );

    case 'toggle':
      return (
        <div className="flex items-center gap-2">
          <div className="h-5 w-9 rounded-full bg-muted relative">
            <div className="h-3.5 w-3.5 rounded-full bg-muted-foreground/30 absolute left-0.5 top-0.5" />
          </div>
          <span className="text-sm text-muted-foreground">{field.label}</span>
        </div>
      );

    case 'rating':
      return (
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} className="h-4 w-4 text-muted-foreground/30 fill-muted-foreground/20" />
          ))}
        </div>
      );

    case 'color':
      return (
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md border bg-gradient-to-br from-red-400 via-green-400 to-blue-400" />
          <span className="text-sm text-muted-foreground">{field.label}</span>
        </div>
      );

    case 'slider':
      return (
        <div className="space-y-1">
          <span className="text-sm text-muted-foreground">{field.label}</span>
          <div className="h-2 rounded-full bg-muted relative overflow-hidden">
            <div className="h-full w-1/2 rounded-full bg-primary/40" />
          </div>
        </div>
      );

    case 'select':
      return (
        <div className="space-y-1">
          <span className="text-sm text-muted-foreground">{field.label}</span>
          <div className="flex h-8 items-center justify-between rounded-md border border-input bg-background px-3 text-sm text-muted-foreground">
            {field.placeholder || 'Select...'}
          </div>
        </div>
      );

    case 'textarea':
      return (
        <div className="space-y-1">
          <span className="text-sm text-muted-foreground">{field.label}</span>
          <div className="h-16 rounded-md border border-input bg-background p-2 text-sm text-muted-foreground">
            {field.placeholder || 'Enter text...'}
          </div>
        </div>
      );

    case 'file':
      return (
        <div className="space-y-1">
          <span className="text-sm text-muted-foreground">{field.label}</span>
          <div className="flex h-8 items-center gap-2 rounded-md border border-dashed border-input bg-background px-3 text-sm text-muted-foreground">
            <File className="h-3.5 w-3.5" />
            Choose file...
          </div>
        </div>
      );

    // Default: text, number, email, phone, url, date — all show input preview
    default:
      return (
        <div className="space-y-1">
          <span className="text-sm text-muted-foreground">{field.label}</span>
          {field.required && <span className="text-[10px] text-destructive">*</span>}
          <div className="flex h-8 items-center rounded-md border border-input bg-background px-3 text-sm text-muted-foreground">
            {field.placeholder || `Enter ${field.type}...`}
          </div>
        </div>
      );
  }
}

// ── Sortable Field ──

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
        'group relative rounded-lg border-2 bg-card cursor-pointer transition-all duration-200',
        'hover:border-primary/40 hover:shadow-md',
        isSelected
          ? 'border-primary shadow-lg shadow-primary/15 ring-2 ring-primary/30 animate-in fade-in zoom-in-95 duration-200'
          : 'border-border/40',
        isDragging && 'opacity-40 shadow-2xl z-50 scale-[1.02] rotate-[2deg]',
        'overflow-hidden'
      )}
      onClick={() => onSelect(field.id)}
    >
      {/* Top bar: drag handle + type icon + label + delete */}
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border/20">
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="flex items-center justify-center h-7 w-5 rounded text-muted-foreground/50 hover:text-foreground cursor-grab active:cursor-grabbing transition-colors shrink-0"
          onClick={(e) => e.stopPropagation()}
          aria-label={`Drag to reorder ${field.label}`}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>

        {/* Type icon */}
        <div className={cn('flex items-center justify-center w-6 h-6 rounded-md shrink-0', typeColors[field.type] || 'bg-muted text-muted-foreground')}>
          {fieldIcons[field.type]}
        </div>

        {/* Label */}
        <span className="flex-1 text-sm font-medium truncate min-w-0">
          {field.label}
        </span>

        {/* Type badge */}
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-normal uppercase shrink-0">
          {field.type}
        </Badge>

        {/* Delete button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(field.id);
          }}
          className="flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground/40 opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all shrink-0"
          aria-label={`Delete ${field.label}`}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Visual preview area */}
      <div className="px-4 py-3">
        <FieldPreview field={field} />
      </div>
    </div>
  );
}

// ── Overlay Card ── (exported for use in builder page's DragOverlay)

export function CanvasFieldCard({ field }: { field: FieldSchema }) {
  return (
    <div className="w-72 rounded-lg border-2 border-primary/50 bg-card shadow-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border/20">
        <div className={cn('flex items-center justify-center w-6 h-6 rounded-md shrink-0', typeColors[field.type] || 'bg-muted')}>
          {fieldIcons[field.type]}
        </div>
        <span className="flex-1 text-sm font-medium truncate">{field.label}</span>
        <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-normal uppercase shrink-0">
          {field.type}
        </Badge>
      </div>
      <div className="px-4 py-3">
        <FieldPreview field={field} />
      </div>
    </div>
  );
}

// ── Main Canvas ──

export default function Canvas() {
  const {
    activeApp,
    selectedFieldId,
    selectField,
    removeField,
  } = useAppStore();

  const [zoom, setZoom] = useState(1);

  const fields = activeApp?.fields || [];
  const isEmpty = fields.length === 0;

  const handleClearAll = useCallback(() => {
    if (!activeApp) return;
    fields.forEach((f) => removeField(f.id));
  }, [activeApp, fields, removeField]);

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
    <div className="flex-1 flex flex-col overflow-hidden bg-muted/20">
      {/* Canvas inner with grid pattern */}
      <div
        className="flex-1 overflow-y-auto"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)
          `,
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
        }}
      >
        <div className="max-w-3xl mx-auto p-6" style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}>
          {/* Canvas toolbar */}
          <div className="flex items-center justify-between mb-4 bg-background/80 backdrop-blur-sm rounded-lg border border-border/40 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {fields.length} field{fields.length !== 1 ? 's' : ''}
              </span>
              {!isEmpty && (
                <span className="text-[10px] text-muted-foreground/60">
                  &middot; Drag to reorder
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}
                className="flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                aria-label="Zoom out"
              >
                <ZoomOut className="h-3.5 w-3.5" />
              </button>
              <span className="text-[11px] font-mono text-muted-foreground w-10 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
                className="flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                aria-label="Zoom in"
              >
                <ZoomIn className="h-3.5 w-3.5" />
              </button>
              <div className="w-px h-4 bg-border mx-1" />
              <button
                onClick={() => setZoom(1)}
                className="flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                aria-label="Reset zoom"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
              {!isEmpty && (
                <>
                  <div className="w-px h-4 bg-border mx-1" />
                  <button
                    onClick={handleClearAll}
                    className="flex items-center gap-1 h-7 px-2 rounded-md text-[11px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear all
                  </button>
                </>
              )}
            </div>
          </div>

          <SortableContext
            items={fields.map((f) => f.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2 min-h-[300px]">
              {isEmpty && (
                <div className="flex flex-col items-center justify-center py-20 px-4 rounded-xl border-2 border-dashed border-border/50 bg-card/30 animate-in fade-in duration-500">
                  <div className="relative mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center animate-pulse">
                      <Layout className="h-8 w-8 text-primary/60" />
                    </div>
                    <span className="absolute -top-1 -right-1 flex h-5 w-5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/30 opacity-75" />
                      <span className="relative inline-flex rounded-full h-5 w-5 bg-primary/20 items-center justify-center">
                        <span className="text-[9px] text-primary font-bold">+</span>
                      </span>
                    </span>
                  </div>
                  <h3 className="text-base font-semibold mb-1.5">Drop components here</h3>
                  <p className="text-sm text-muted-foreground text-center max-w-sm">
                    Drag fields from the palette on the left, or click a field type to add it to your app.
                  </p>
                  <div className="flex items-center gap-2 mt-4 text-[10px] text-muted-foreground/60">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                      Drag & drop
                    </span>
                    <span className="text-muted-foreground/30">&bull;</span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                      Click to add
                    </span>
                    <span className="text-muted-foreground/30">&bull;</span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                      Reorder
                    </span>
                  </div>
                  {/* Animated dotted border */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ borderRadius: 'inherit' }}>
                    <rect
                      x="2"
                      y="2"
                      width="calc(100% - 4px)"
                      height="calc(100% - 4px)"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeDasharray="8 8"
                      className="text-primary/20 animate-[dash_1.5s_linear_infinite]"
                    />
                  </svg>
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
        </div>
      </div>
    </div>
  );
}
