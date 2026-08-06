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
    <div className="clay-sm bg-clay-cream/60 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-3 py-2.5 text-left text-xs font-medium uppercase tracking-wider hover:bg-clay-cream/80 transition-colors"
        style={{ color: 'var(--clay-foreground)' }}
      >
        {icon && <span style={{ color: 'var(--clay-muted)' }}>{icon}</span>}
        <span className="flex-1">{title}</span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
      {open && <div className="px-3 py-2.5 space-y-2.5 border-t border-clay-border/30">{children}</div>}
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
        <div className="grid grid-cols-4 gap-1.5">
          {FIELD_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange({ type: opt.value })}
              className={cn(
                'flex flex-col items-center gap-0.5 py-1.5 rounded-xl clay-sm text-[9px] transition-all',
                field.type === opt.value
                  ? 'bg-clay-purple/30 shadow-inner'
                  : 'bg-white/60 hover:bg-white hover:scale-105'
              )}
              style={{ color: field.type === opt.value ? 'var(--clay-foreground)' : 'var(--clay-muted)' }}
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
          <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>Label</label>
          <input
            value={field.label}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder="Field label"
            className="clay-input h-8 text-xs w-full px-3"
          />
        </div>

        {/* Placeholder - for input types */}
        {isInputType && field.type !== 'checkbox' && field.type !== 'toggle' && field.type !== 'color' && field.type !== 'rating' && (
          <div className="space-y-1">
            <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>Placeholder</label>
            <input
              value={field.placeholder || ''}
              onChange={(e) => onChange({ placeholder: e.target.value })}
              placeholder="Placeholder text"
              className="clay-input h-8 text-xs w-full px-3"
            />
          </div>
        )}

        {/* Required toggle */}
        {isInputType && (
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>Required</label>
            <button
              onClick={() => onChange({ required: !field.required })}
              className={cn(
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 clay-sm',
                field.required ? 'bg-clay-pink' : 'bg-clay-cream'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                  field.required ? 'translate-x-[18px]' : 'translate-x-[2px]'
                )}
              />
            </button>
          </div>
        )}

        {/* Content text - for heading/paragraph */}
        {(field.type === 'heading' || field.type === 'paragraph') && (
          <div className="space-y-1">
            <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>Content Text</label>
            <input
              value={field.content || ''}
              onChange={(e) => onChange({ content: e.target.value })}
              placeholder={field.type === 'heading' ? 'Heading Text' : 'Paragraph text...'}
              className="clay-input h-8 text-xs w-full px-3"
            />
          </div>
        )}

        {/* Heading level */}
        {field.type === 'heading' && (
          <div className="space-y-1">
            <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>Level</label>
            <select
              value={field.level || 'h2'}
              onChange={(e) => onChange({ level: e.target.value as HeadingLevel })}
              className="clay-input h-8 w-full px-2 text-xs"
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
            <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>Alignment</label>
            <div className="flex gap-1">
              {ALIGNMENTS.map((a) => (
                <button
                  key={a.value}
                  onClick={() => onChange({ alignment: a.value })}
                  className={cn(
                    'flex-1 py-1 rounded-xl text-[10px] clay-sm transition-all',
                    (field.alignment === a.value || (!field.alignment && a.value === 'left'))
                      ? 'bg-clay-blue/40 shadow-inner'
                      : 'bg-white/60 hover:bg-white'
                  )}
                  style={{ color: 'var(--clay-foreground)' }}
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
              <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>Variant</label>
              <div className="flex gap-1 flex-wrap">
                {BUTTON_VARIANTS.map((v) => (
                  <button
                    key={v.value}
                    onClick={() => onChange({ variant: v.value })}
                    className={cn(
                      'px-2 py-1 rounded-xl text-[10px] clay-sm transition-all',
                      (field.variant === v.value || (!field.variant && v.value === 'primary'))
                        ? 'bg-clay-purple/40 shadow-inner'
                        : 'bg-white/60 hover:bg-white'
                    )}
                    style={{ color: 'var(--clay-foreground)' }}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>Action Type</label>
              <select
                value={field.actionType || 'submit'}
                onChange={(e) => onChange({ actionType: e.target.value as 'submit' | 'reset' | 'link' })}
                className="clay-input h-8 w-full px-2 text-xs"
              >
                <option value="submit">Submit</option>
                <option value="reset">Reset</option>
                <option value="link">Link</option>
              </select>
            </div>
            {field.actionType === 'link' && (
              <div className="space-y-1">
                <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>URL</label>
                <input
                  value={field.href || ''}
                  onChange={(e) => onChange({ href: e.target.value })}
                  placeholder="https://..."
                  className="clay-input h-8 text-xs w-full px-3"
                />
              </div>
            )}
          </>
        )}

        {/* Image specific */}
        {field.type === 'image' && (
          <>
            <div className="space-y-1">
              <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>Image URL</label>
              <input
                value={field.src || ''}
                onChange={(e) => onChange({ src: e.target.value })}
                placeholder="https://example.com/image.jpg"
                className="clay-input h-8 text-xs w-full px-3"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>Alt Text</label>
              <input
                value={field.alt || ''}
                onChange={(e) => onChange({ alt: e.target.value })}
                placeholder="Describe the image"
                className="clay-input h-8 text-xs w-full px-3"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>Aspect Ratio</label>
              <select
                value={field.aspectRatio || 'auto'}
                onChange={(e) => onChange({ aspectRatio: e.target.value as AspectRatio })}
                className="clay-input h-8 w-full px-2 text-xs"
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
            <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>Options</label>
            <div className="space-y-1 max-h-[120px] overflow-y-auto">
              {(field.options || []).map((opt, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="flex-1 text-xs px-2 py-0.5 rounded clay-sm bg-clay-cream/80 truncate">{opt}</span>
                  <button
                    onClick={() => {
                      const newOpts = [...(field.options || [])];
                      newOpts.splice(i, 1);
                      onChange({ options: newOpts });
                    }}
                    className="flex items-center justify-center h-6 w-6 rounded-xl clay-sm bg-clay-rose/30 hover:bg-clay-rose/60 transition-all shrink-0"
                  >
                    <X className="h-3 w-3" style={{ color: 'var(--clay-foreground)' }} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <input
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                placeholder="Add option..."
                className="clay-input h-8 text-xs flex-1 px-3"
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
                className="flex items-center justify-center h-8 w-8 rounded-xl clay-sm bg-clay-blue/40 hover:bg-clay-blue/60 transition-all shrink-0"
              >
                <Plus className="h-3.5 w-3.5" style={{ color: 'var(--clay-foreground)' }} />
              </button>
            </div>
          </div>
        )}

        {/* Default value - checkbox/toggle */}
        {(field.type === 'checkbox' || field.type === 'toggle') && (
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>Default Value</label>
            <button
              onClick={() => onChange({ defaultValue: !field.defaultValue })}
              className={cn(
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 clay-sm',
                field.defaultValue ? 'bg-clay-blue' : 'bg-clay-cream'
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                  field.defaultValue ? 'translate-x-[18px]' : 'translate-x-[2px]'
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
                  <label className="text-[10px]" style={{ color: 'var(--clay-muted)' }}>Min Length</label>
                  <input
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
                    className="clay-input h-8 text-xs w-full px-3"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px]" style={{ color: 'var(--clay-muted)' }}>Max Length</label>
                  <input
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
                    className="clay-input h-8 text-xs w-full px-3"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px]" style={{ color: 'var(--clay-muted)' }}>Regex Pattern</label>
                <input
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
                  className="clay-input h-8 text-xs w-full px-3 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px]" style={{ color: 'var(--clay-muted)' }}>Error Message</label>
                <input
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
                  className="clay-input h-8 text-xs w-full px-3"
                />
              </div>
            </>
          )}
          {isNumberType && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px]" style={{ color: 'var(--clay-muted)' }}>Min</label>
                  <input
                    type="number"
                    value={field.min ?? ''}
                    onChange={(e) =>
                      onChange({ min: e.target.value ? Number(e.target.value) : undefined })
                    }
                    className="clay-input h-8 text-xs w-full px-3"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px]" style={{ color: 'var(--clay-muted)' }}>Max</label>
                  <input
                    type="number"
                    value={field.max ?? ''}
                    onChange={(e) =>
                      onChange({ max: e.target.value ? Number(e.target.value) : undefined })
                    }
                    className="clay-input h-8 text-xs w-full px-3"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px]" style={{ color: 'var(--clay-muted)' }}>Step</label>
                <input
                  type="number"
                  step="any"
                  value={field.step ?? ''}
                  onChange={(e) =>
                    onChange({ step: e.target.value ? Number(e.target.value) : undefined })
                  }
                  className="clay-input h-8 text-xs w-full px-3"
                />
              </div>
            </>
          )}
        </Section>
      )}

      {/* ── Styling Section ── */}
      <Section title="Styling" icon={<Palette className="h-3 w-3" />}>
        <div className="space-y-1">
          <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>Width</label>
          <div className="flex gap-1">
            {WIDTH_OPTIONS.map((w) => (
              <button
                key={w.value}
                onClick={() => onChange({ widthStyle: w.value })}
                className={cn(
                  'flex-1 py-1 rounded-xl text-[10px] clay-sm transition-all',
                  (field.widthStyle === w.value || (!field.widthStyle && w.value === 'full'))
                    ? 'bg-clay-blue/40 shadow-inner'
                    : 'bg-white/60 hover:bg-white'
                )}
                style={{ color: 'var(--clay-foreground)' }}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[10px]" style={{ color: 'var(--clay-muted)' }}>BG Color</label>
            <div className="flex items-center gap-1">
              <input
                value={field.bgColor || ''}
                onChange={(e) => onChange({ bgColor: e.target.value })}
                placeholder="#fff"
                className="clay-input h-8 text-xs flex-1 px-2"
              />
              {field.type === 'color' && (
                <input
                  type="color"
                  value={field.bgColor || '#ffffff'}
                  onChange={(e) => onChange({ bgColor: e.target.value })}
                  className="h-8 w-8 p-0.5 rounded-xl clay-sm"
                />
              )}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px]" style={{ color: 'var(--clay-muted)' }}>Text Color</label>
            <input
              value={field.textColor || ''}
              onChange={(e) => onChange({ textColor: e.target.value })}
              placeholder="#000"
              className="clay-input h-8 text-xs w-full px-2"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>Show Border</label>
          <button
            onClick={() => onChange({ border: !field.border })}
            className={cn(
              'relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0 clay-sm',
              field.border ? 'bg-clay-pink' : 'bg-clay-cream'
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                field.border ? 'translate-x-[18px]' : 'translate-x-[2px]'
              )}
            />
          </button>
        </div>

        <div className="space-y-1">
          <label className="text-[10px]" style={{ color: 'var(--clay-muted)' }}>Border Radius</label>
          <select
            value={field.borderRadius || 'md'}
            onChange={(e) => onChange({ borderRadius: e.target.value as BorderRadius })}
            className="clay-input h-8 w-full px-2 text-xs"
          >
            {BORDER_RADIUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px]" style={{ color: 'var(--clay-muted)' }}>Shadow</label>
          <div className="flex gap-1 flex-wrap">
            {SHADOW_OPTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => onChange({ shadow: s.value })}
                className={cn(
                  'px-2 py-1 rounded-xl text-[10px] clay-sm transition-all',
                  (field.shadow === s.value || (!field.shadow && s.value === 'none'))
                    ? 'bg-clay-purple/40 shadow-inner'
                    : 'bg-white/60 hover:bg-white'
                )}
                style={{ color: 'var(--clay-foreground)' }}
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
                'px-2 py-1 rounded-xl text-[10px] clay-sm transition-all',
                (field.animation === a.value || (!field.animation && a.value === 'none'))
                  ? 'bg-clay-yellow/40 shadow-inner'
                  : 'bg-white/60 hover:bg-white'
              )}
              style={{ color: 'var(--clay-foreground)' }}
            >
              {a.label}
            </button>
          ))}
        </div>
      </Section>

      {/* ── Advanced Section ── */}
      <Section title="Advanced" icon={<Settings2 className="h-3 w-3" />} defaultOpen={false}>
        <div className="space-y-1">
          <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>Default Value</label>
          <input
            value={typeof field.defaultValue === 'string' || typeof field.defaultValue === 'number' ? String(field.defaultValue) : ''}
            onChange={(e) => onChange({ defaultValue: e.target.value })}
            placeholder="Default value"
            className="clay-input h-8 text-xs w-full px-3"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>Custom CSS Class</label>
          <input
            value={field.cssClass || ''}
            onChange={(e) => onChange({ cssClass: e.target.value })}
            placeholder="my-custom-class"
            className="clay-input h-8 text-xs w-full px-3 font-mono"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>Help Text</label>
          <textarea
            value={field.helpText || ''}
            onChange={(e) => onChange({ helpText: e.target.value })}
            placeholder="Additional information for users..."
            className="clay-input min-h-[50px] w-full px-3 py-1.5 text-xs resize-none"
          />
        </div>
      </Section>

      {/* ── Delete ── */}
      <div className="pt-1">
        <button
          onClick={onRemove}
          className="w-full flex items-center justify-center gap-1.5 h-9 rounded-xl text-xs font-medium clay-sm bg-clay-rose/40 hover:bg-clay-rose/60 transition-all"
          style={{ color: 'var(--clay-foreground)' }}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Remove Field
        </button>
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
    <aside className="w-full md:w-72 clay-card rounded-none rounded-l-2xl flex flex-col h-full overflow-hidden" style={{ backgroundColor: '#FFFFFFF0' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-clay-border/40 shrink-0">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4" style={{ color: 'var(--clay-muted)' }} />
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--clay-foreground)' }}>
            Properties
          </h3>
        </div>
        {selectedFieldId && (
          <button
            onClick={() => selectField(null)}
            className="flex items-center justify-center h-7 w-7 rounded-xl clay-sm bg-clay-peach/40 hover:bg-clay-peach/60 transition-all"
          >
            <X className="h-3.5 w-3.5" style={{ color: 'var(--clay-foreground)' }} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {selectedField ? (
          <FieldEditor
            key={selectedField.id}
            field={selectedField}
            onChange={handleChange}
            onRemove={handleRemove}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full clay-lg bg-clay-yellow/30 flex items-center justify-center mb-4 animate-pulse-soft">
              <Settings2 className="h-7 w-7" style={{ color: '#D5B8F5' }} />
            </div>
            <h4 className="text-sm font-medium mb-1" style={{ color: 'var(--clay-foreground)' }}>No field selected</h4>
            <p className="text-xs max-w-[180px] leading-relaxed" style={{ color: 'var(--clay-muted)' }}>
              Click on a field in the canvas to edit its properties here.
            </p>
            <div className="mt-4 flex gap-2 text-[10px]" style={{ color: 'var(--clay-muted)' }}>
              <span className="px-2 py-1 rounded-xl clay-sm bg-clay-peach/30">Label</span>
              <span className="px-2 py-1 rounded-xl clay-sm bg-clay-blue/30">Validation</span>
              <span className="px-2 py-1 rounded-xl clay-sm bg-clay-purple/30">Style</span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
