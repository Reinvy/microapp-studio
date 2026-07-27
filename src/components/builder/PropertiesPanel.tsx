'use client';

import { useCallback, useState } from 'react';
import {
  Settings2,
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
  ChevronDown,
  ChevronUp,
  Plus,
  X,
} from 'lucide-react';
import type { FieldType, FieldSchema, ButtonVariant, HeadingLevel, TextAlignment, WidthStyle, AnimationType, AspectRatio, BorderRadius, ShadowSize } from '@/types/schema';
import { useAppStore } from '@/store/appStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

// ── Helpers ──

const FIELD_TYPE_OPTIONS: { value: FieldType; label: string; icon: React.ReactNode }[] = [
  { value: 'text', label: 'Text', icon: <Type className="h-3.5 w-3.5" /> },
  { value: 'number', label: 'Number', icon: <Hash className="h-3.5 w-3.5" /> },
  { value: 'select', label: 'Select', icon: <List className="h-3.5 w-3.5" /> },
  { value: 'checkbox', label: 'Checkbox', icon: <CheckSquare className="h-3.5 w-3.5" /> },
  { value: 'textarea', label: 'Textarea', icon: <AlignLeft className="h-3.5 w-3.5" /> },
  { value: 'date', label: 'Date', icon: <Calendar className="h-3.5 w-3.5" /> },
  { value: 'file', label: 'File', icon: <File className="h-3.5 w-3.5" /> },
  { value: 'slider', label: 'Slider', icon: <Sliders className="h-3.5 w-3.5" /> },
  { value: 'toggle', label: 'Toggle', icon: <ToggleLeft className="h-3.5 w-3.5" /> },
  { value: 'email', label: 'Email', icon: <Mail className="h-3.5 w-3.5" /> },
  { value: 'phone', label: 'Phone', icon: <Phone className="h-3.5 w-3.5" /> },
  { value: 'url', label: 'URL', icon: <Link className="h-3.5 w-3.5" /> },
  { value: 'color', label: 'Color', icon: <Palette className="h-3.5 w-3.5" /> },
  { value: 'rating', label: 'Rating', icon: <Star className="h-3.5 w-3.5" /> },
  { value: 'heading', label: 'Heading', icon: <Heading className="h-3.5 w-3.5" /> },
  { value: 'paragraph', label: 'Paragraph', icon: <Pilcrow className="h-3.5 w-3.5" /> },
  { value: 'divider', label: 'Divider', icon: <SeparatorHorizontal className="h-3.5 w-3.5" /> },
  { value: 'spacer', label: 'Spacer', icon: <Expand className="h-3.5 w-3.5" /> },
  { value: 'image', label: 'Image', icon: <Image className="h-3.5 w-3.5" /> },
  { value: 'card', label: 'Card', icon: <Layout className="h-3.5 w-3.5" /> },
  { value: 'button', label: 'Button', icon: <SquareMousePointer className="h-3.5 w-3.5" /> },
];

const HEADING_LEVELS: { value: HeadingLevel; label: string }[] = [
  { value: 'h1', label: 'H1 - Largest' },
  { value: 'h2', label: 'H2 - Large' },
  { value: 'h3', label: 'H3 - Medium' },
  { value: 'h4', label: 'H4 - Small' },
];

const ALIGNMENTS: { value: TextAlignment; label: string }[] = [
  { value: 'left', label: 'Left' },
  { value: 'center', label: 'Center' },
  { value: 'right', label: 'Right' },
];

const BUTTON_VARIANTS: { value: ButtonVariant; label: string }[] = [
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'outline', label: 'Outline' },
  { value: 'ghost', label: 'Ghost' },
  { value: 'danger', label: 'Danger' },
];

const WIDTH_OPTIONS: { value: WidthStyle; label: string }[] = [
  { value: 'full', label: 'Full Width' },
  { value: 'half', label: 'Half Width' },
  { value: 'auto', label: 'Auto' },
];

const ANIMATION_OPTIONS: { value: AnimationType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'fade', label: 'Fade In' },
  { value: 'slide', label: 'Slide In' },
  { value: 'bounce', label: 'Bounce' },
  { value: 'pulse', label: 'Pulse' },
];

const ASPECT_RATIO_OPTIONS: { value: AspectRatio | string; label: string }[] = [
  { value: 'auto', label: 'Auto' },
  { value: 'square', label: 'Square (1:1)' },
  { value: '16:9', label: 'Widescreen (16:9)' },
  { value: '4:3', label: 'Standard (4:3)' },
];

const BORDER_RADIUS_OPTIONS: { value: BorderRadius; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
  { value: 'xl', label: 'Extra Large' },
  { value: '2xl', label: '2XL' },
  { value: 'full', label: 'Full' },
];

const SHADOW_OPTIONS: { value: ShadowSize; label: string }[] = [
  { value: 'none', label: 'No Shadow' },
  { value: 'sm', label: 'Small' },
  { value: 'md', label: 'Medium' },
  { value: 'lg', label: 'Large' },
];

// ── Collapsible Section ──

function Section({
  title,
  icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border/40 rounded-lg overflow-hidden bg-card/30">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider hover:bg-muted/30 transition-colors"
      >
        {icon && <span className="text-muted-foreground/70">{icon}</span>}
        <span className="flex-1">{title}</span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {open && <div className="px-3 py-2 space-y-2.5 border-t border-border/30">{children}</div>}
    </div>
  );
}

// ── Field Editor ──

interface FieldEditorProps {
  field: FieldSchema;
  onChange: (updates: Partial<FieldSchema>) => void;
  onRemove: () => void;
}

function FieldEditor({ field, onChange, onRemove }: FieldEditorProps) {
  const [newOption, setNewOption] = useState('');
  const isInputType = ['text', 'number', 'select', 'checkbox', 'textarea', 'date', 'file', 'slider', 'toggle', 'email', 'phone', 'url', 'color', 'rating'].includes(field.type);
  const isTextType = ['text', 'textarea', 'email', 'phone', 'url'].includes(field.type);
  const isNumberType = ['number', 'slider'].includes(field.type);

  return (
    <div className="space-y-2.5">
      {/* ── Type Change ── */}
      <Section title="Field Type" icon={<Settings2 className="h-3 w-3" />} defaultOpen={false}>
        <div className="grid grid-cols-4 gap-1">
          {FIELD_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange({ type: opt.value })}
              className={cn(
                'flex flex-col items-center gap-0.5 py-1.5 rounded-md border text-[9px] transition-all',
                field.type === opt.value
                  ? 'border-primary bg-primary/10 text-primary shadow-sm'
                  : 'border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground'
              )}
              title={opt.label}
            >
              {opt.icon}
              <span className="truncate max-w-full">{opt.label}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* ── Basic ── */}
      <Section title="Basic" icon={<Type className="h-3 w-3" />}>
        {/* Label */}
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground">Label</label>
          <Input
            value={field.label}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder="Field label"
            className="h-7 text-xs"
          />
        </div>

        {/* Placeholder - for input types */}
        {isInputType && field.type !== 'checkbox' && field.type !== 'toggle' && field.type !== 'color' && field.type !== 'rating' && (
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground">Placeholder</label>
            <Input
              value={field.placeholder || ''}
              onChange={(e) => onChange({ placeholder: e.target.value })}
              placeholder="Placeholder text"
              className="h-7 text-xs"
            />
          </div>
        )}

        {/* Required toggle */}
        {isInputType && (
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-medium text-muted-foreground">Required</label>
            <button
              onClick={() => onChange({ required: !field.required })}
              className={cn(
                'relative inline-flex h-4 w-7 items-center rounded-full transition-colors shrink-0',
                field.required ? 'bg-primary' : 'bg-muted'
              )}
            >
              <span
                className={cn(
                  'inline-block h-3 w-3 rounded-full bg-white shadow-sm transition-transform',
                  field.required ? 'translate-x-[14px]' : 'translate-x-[2px]'
                )}
              />
            </button>
          </div>
        )}

        {/* Content text - for heading/paragraph */}
        {(field.type === 'heading' || field.type === 'paragraph') && (
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground">Content Text</label>
            <Input
              value={field.content || ''}
              onChange={(e) => onChange({ content: e.target.value })}
              placeholder={field.type === 'heading' ? 'Heading Text' : 'Paragraph text...'}
              className="h-7 text-xs"
            />
          </div>
        )}

        {/* Heading level */}
        {field.type === 'heading' && (
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground">Level</label>
            <select
              value={field.level || 'h2'}
              onChange={(e) => onChange({ level: e.target.value as HeadingLevel })}
              className="flex h-7 w-full rounded-md border border-input bg-transparent px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {HEADING_LEVELS.map((hl) => (
                <option key={hl.value} value={hl.value}>{hl.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Alignment - heading/paragraph */}
        {(field.type === 'heading' || field.type === 'paragraph') && (
          <div className="space-y-1">
            <label className="text-[10px] font-medium text-muted-foreground">Alignment</label>
            <div className="flex gap-1">
              {ALIGNMENTS.map((a) => (
                <button
                  key={a.value}
                  onClick={() => onChange({ alignment: a.value })}
                  className={cn(
                    'flex-1 py-1 rounded text-[10px] border transition-colors',
                    (field.alignment === a.value || (!field.alignment && a.value === 'left'))
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border/50 text-muted-foreground hover:border-primary/30'
                  )}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Button specific */}
        {field.type === 'button' && (
          <>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground">Variant</label>
              <div className="flex gap-1 flex-wrap">
                {BUTTON_VARIANTS.map((v) => (
                  <button
                    key={v.value}
                    onClick={() => onChange({ variant: v.value })}
                    className={cn(
                      'px-2 py-1 rounded text-[10px] border transition-colors',
                      (field.variant === v.value || (!field.variant && v.value === 'primary'))
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/50 text-muted-foreground hover:border-primary/30'
                    )}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground">Action Type</label>
              <select
                value={field.actionType || 'submit'}
                onChange={(e) => onChange({ actionType: e.target.value as 'submit' | 'reset' | 'link' })}
                className="flex h-7 w-full rounded-md border border-input bg-transparent px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="submit">Submit</option>
                <option value="reset">Reset</option>
                <option value="link">Link</option>
              </select>
            </div>
            {field.actionType === 'link' && (
              <div className="space-y-1">
                <label className="text-[10px] font-medium text-muted-foreground">URL</label>
                <Input
                  value={field.href || ''}
                  onChange={(e) => onChange({ href: e.target.value })}
                  placeholder="https://..."
                  className="h-7 text-xs"
                />
              </div>
            )}
          </>
        )}

        {/* Image specific */}
        {field.type === 'image' && (
          <>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground">Image URL</label>
              <Input
                value={field.src || ''}
                onChange={(e) => onChange({ src: e.target.value })}
                placeholder="https://example.com/image.jpg"
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground">Alt Text</label>
              <Input
                value={field.alt || ''}
                onChange={(e) => onChange({ alt: e.target.value })}
                placeholder="Describe the image"
                className="h-7 text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium text-muted-foreground">Aspect Ratio</label>
              <select
                value={field.aspectRatio || 'auto'}
                onChange={(e) => onChange({ aspectRatio: e.target.value as AspectRatio })}
                className="flex h-7 w-full rounded-md border border-input bg-transparent px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {ASPECT_RATIO_OPTIONS.map((ar) => (
                  <option key={ar.value} value={ar.value}>{ar.label}</option>
                ))}
              </select>
            </div>
          </>
        )}

        {/* Select options */}
        {field.type === 'select' && (
          <div className="space-y-1.5">
            <label className="text-[10px] font-medium text-muted-foreground">Options</label>
            <div className="space-y-1 max-h-[120px] overflow-y-auto">
              {(field.options || []).map((opt, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="flex-1 text-xs px-2 py-0.5 rounded bg-muted/50 truncate">{opt}</span>
                  <button
                    onClick={() => {
                      const newOpts = [...(field.options || [])];
                      newOpts.splice(i, 1);
                      onChange({ options: newOpts });
                    }}
                    className="flex items-center justify-center h-5 w-5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <Input
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                placeholder="Add option..."
                className="h-7 text-xs flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newOption.trim()) {
                    onChange({ options: [...(field.options || []), newOption.trim()] });
                    setNewOption('');
                  }
                }}
              />
              <button
                onClick={() => {
                  if (newOption.trim()) {
                    onChange({ options: [...(field.options || []), newOption.trim()] });
                    setNewOption('');
                  }
                }}
                className="flex items-center justify-center h-7 w-7 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Default value - checkbox/toggle */}
        {(field.type === 'checkbox' || field.type === 'toggle') && (
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-medium text-muted-foreground">Default Value</label>
            <button
              onClick={() => onChange({ defaultValue: !field.defaultValue })}
              className={cn(
                'relative inline-flex h-4 w-7 items-center rounded-full transition-colors shrink-0',
                field.defaultValue ? 'bg-primary' : 'bg-muted'
              )}
            >
              <span
                className={cn(
                  'inline-block h-3 w-3 rounded-full bg-white shadow-sm transition-transform',
                  field.defaultValue ? 'translate-x-[14px]' : 'translate-x-[2px]'
                )}
              />
            </button>
          </div>
        )}
      </Section>

      {/* ── Validation Section ── */}
      {(isTextType || isNumberType || field.type === 'select') && (
        <Section title="Validation" icon={<List className="h-3 w-3" />}>
          {isTextType && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">Min Length</label>
                  <Input
                    type="number"
                    value={field.validation?.minLength ?? ''}
                    onChange={(e) =>
                      onChange({
                        validation: {
                          ...field.validation,
                          minLength: e.target.value ? Number(e.target.value) : undefined,
                        },
                      })
                    }
                    className="h-7 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">Max Length</label>
                  <Input
                    type="number"
                    value={field.validation?.maxLength ?? ''}
                    onChange={(e) =>
                      onChange({
                        validation: {
                          ...field.validation,
                          maxLength: e.target.value ? Number(e.target.value) : undefined,
                        },
                      })
                    }
                    className="h-7 text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">Regex Pattern</label>
                <Input
                  value={field.validation?.pattern || ''}
                  onChange={(e) =>
                    onChange({
                      validation: {
                        ...field.validation,
                        pattern: e.target.value || undefined,
                      },
                    })
                  }
                  placeholder="e.g. ^[a-zA-Z]+$"
                  className="h-7 text-xs font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">Error Message</label>
                <Input
                  value={field.validation?.message || ''}
                  onChange={(e) =>
                    onChange({
                      validation: {
                        ...field.validation,
                        message: e.target.value || undefined,
                      },
                    })
                  }
                  placeholder="Custom error message"
                  className="h-7 text-xs"
                />
              </div>
            </>
          )}
          {isNumberType && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">Min</label>
                  <Input
                    type="number"
                    value={field.min ?? ''}
                    onChange={(e) =>
                      onChange({ min: e.target.value ? Number(e.target.value) : undefined })
                    }
                    className="h-7 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">Max</label>
                  <Input
                    type="number"
                    value={field.max ?? ''}
                    onChange={(e) =>
                      onChange({ max: e.target.value ? Number(e.target.value) : undefined })
                    }
                    className="h-7 text-xs"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-muted-foreground">Step</label>
                <Input
                  type="number"
                  step="any"
                  value={field.step ?? ''}
                  onChange={(e) =>
                    onChange({ step: e.target.value ? Number(e.target.value) : undefined })
                  }
                  className="h-7 text-xs"
                />
              </div>
            </>
          )}
        </Section>
      )}

      {/* ── Styling Section ── */}
      <Section title="Styling" icon={<Palette className="h-3 w-3" />}>
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground">Width</label>
          <div className="flex gap-1">
            {WIDTH_OPTIONS.map((w) => (
              <button
                key={w.value}
                onClick={() => onChange({ widthStyle: w.value })}
                className={cn(
                  'flex-1 py-1 rounded text-[10px] border transition-colors',
                  (field.widthStyle === w.value || (!field.widthStyle && w.value === 'full'))
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border/50 text-muted-foreground hover:border-primary/30'
                )}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">BG Color</label>
            <div className="flex items-center gap-1">
              <Input
                value={field.bgColor || ''}
                onChange={(e) => onChange({ bgColor: e.target.value })}
                placeholder="#fff"
                className="h-7 text-xs flex-1"
              />
              {field.type === 'color' && (
                <Input
                  type="color"
                  value={field.bgColor || '#ffffff'}
                  onChange={(e) => onChange({ bgColor: e.target.value })}
                  className="h-7 w-8 p-0.5 border"
                />
              )}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] text-muted-foreground">Text Color</label>
            <Input
              value={field.textColor || ''}
              onChange={(e) => onChange({ textColor: e.target.value })}
              placeholder="#000"
              className="h-7 text-xs"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-[10px] font-medium text-muted-foreground">Show Border</label>
          <button
            onClick={() => onChange({ border: !field.border })}
            className={cn(
              'relative inline-flex h-4 w-7 items-center rounded-full transition-colors shrink-0',
              field.border ? 'bg-primary' : 'bg-muted'
            )}
          >
            <span
              className={cn(
                'inline-block h-3 w-3 rounded-full bg-white shadow-sm transition-transform',
                field.border ? 'translate-x-[14px]' : 'translate-x-[2px]'
              )}
            />
          </button>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">Border Radius</label>
          <select
            value={field.borderRadius || 'md'}
            onChange={(e) => onChange({ borderRadius: e.target.value as BorderRadius })}
            className="flex h-7 w-full rounded-md border border-input bg-transparent px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {BORDER_RADIUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground">Shadow</label>
          <div className="flex gap-1 flex-wrap">
            {SHADOW_OPTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => onChange({ shadow: s.value })}
                className={cn(
                  'px-2 py-1 rounded text-[10px] border transition-colors',
                  (field.shadow === s.value || (!field.shadow && s.value === 'none'))
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border/50 text-muted-foreground hover:border-primary/30'
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* ── Animation Section ── */}
      <Section title="Animation" icon={<Sliders className="h-3 w-3" />}>
        <div className="flex gap-1 flex-wrap">
          {ANIMATION_OPTIONS.map((a) => (
            <button
              key={a.value}
              onClick={() => onChange({ animation: a.value })}
              className={cn(
                'px-2 py-1 rounded text-[10px] border transition-colors',
                (field.animation === a.value || (!field.animation && a.value === 'none'))
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border/50 text-muted-foreground hover:border-primary/30'
              )}
            >
              {a.label}
            </button>
          ))}
        </div>
      </Section>

      {/* ── Advanced Section ── */}
      <Section title="Advanced" icon={<Settings2 className="h-3 w-3" />} defaultOpen={false}>
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground">Default Value</label>
          <Input
            value={typeof field.defaultValue === 'string' || typeof field.defaultValue === 'number' ? String(field.defaultValue) : ''}
            onChange={(e) => onChange({ defaultValue: e.target.value })}
            placeholder="Default value"
            className="h-7 text-xs"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground">Custom CSS Class</label>
          <Input
            value={field.cssClass || ''}
            onChange={(e) => onChange({ cssClass: e.target.value })}
            placeholder="my-custom-class"
            className="h-7 text-xs font-mono"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-medium text-muted-foreground">Help Text</label>
          <textarea
            value={field.helpText || ''}
            onChange={(e) => onChange({ helpText: e.target.value })}
            placeholder="Additional information for users..."
            className="flex min-h-[50px] w-full rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
          />
        </div>
      </Section>

      {/* ── Delete ── */}
      <div className="pt-1">
        <Button
          variant="destructive"
          size="sm"
          className="w-full gap-1.5 text-xs h-7"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Remove Field
        </Button>
      </div>
    </div>
  );
}

// ── Properties Panel ──

export default function PropertiesPanel() {
  const { activeApp, selectedFieldId, selectField, updateField, removeField } =
    useAppStore();

  const selectedField = activeApp?.fields.find((f) => f.id === selectedFieldId);

  const handleChange = useCallback(
    (updates: Partial<FieldSchema>) => {
      if (selectedFieldId) {
        updateField(selectedFieldId, updates);
      }
    },
    [selectedFieldId, updateField]
  );

  const handleRemove = useCallback(() => {
    if (selectedFieldId) {
      removeField(selectedFieldId);
    }
  }, [selectedFieldId, removeField]);

  return (
    <aside className="w-72 border-l border-border/50 bg-card/50 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 shrink-0">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Properties
          </h3>
        </div>
        {selectedFieldId && (
          <button
            onClick={() => selectField(null)}
            className="flex items-center justify-center h-6 w-6 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {selectedField ? (
          <FieldEditor
            key={selectedField.id}
            field={selectedField}
            onChange={handleChange}
            onRemove={handleRemove}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center mb-4 animate-pulse">
              <Settings2 className="h-7 w-7 text-primary/50" />
            </div>
            <h4 className="text-sm font-medium mb-1">No field selected</h4>
            <p className="text-xs text-muted-foreground max-w-[180px] leading-relaxed">
              Click on a field in the canvas to edit its properties here.
            </p>
            <div className="mt-4 flex gap-2 text-[10px] text-muted-foreground/50">
              <span className="px-2 py-1 rounded bg-muted/50">Label</span>
              <span className="px-2 py-1 rounded bg-muted/50">Validation</span>
              <span className="px-2 py-1 rounded bg-muted/50">Style</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
