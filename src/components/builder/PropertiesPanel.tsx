'use client';

import { useCallback, useState } from 'react';
import {
  Settings2,
  Trash2,
  Type,
  List,
  Sliders,
  Palette,
  ChevronDown,
  ChevronUp,
  Plus,
  X,
} from 'lucide-react';
import type { FieldType, FieldSchema, ButtonVariant, HeadingLevel, TextAlignment, WidthStyle, AnimationType, AspectRatio, BorderRadius, ShadowSize } from '@/types/schema';
import { useAppStore } from '@/store/appStore';
import { cn } from '@/lib/utils';
import { FieldTypeIcon, fieldLabels } from '@/lib/fieldMeta';
import { builderCopy } from '@/lib/builderCopy';
import { ClayToggle } from '@/components/ui/clay-toggle';

// ── Helpers ──

// Ordered field types for the type picker — labels come from fieldLabels and
// icons from FieldTypeIcon (fieldMeta is the single source of truth; this
// list only pins the picker order).
const FIELD_TYPE_ORDER: FieldType[] = [
  'text', 'number', 'select', 'checkbox', 'textarea', 'date', 'file',
  'slider', 'toggle', 'email', 'phone', 'url', 'color', 'rating',
  'heading', 'paragraph', 'divider', 'spacer', 'image', 'card', 'button',
];

const FIELD_TYPE_OPTIONS: { value: FieldType; label: string; icon: React.ReactNode }[] =
  FIELD_TYPE_ORDER.map((value) => ({
    value,
    label: fieldLabels[value] || value,
    icon: <FieldTypeIcon type={value} className="h-3.5 w-3.5" />,
  }));

// Option labels are centralized in builderCopy.properties.options — these
// arrays only pin the value order.
const { options: opt } = builderCopy.properties;

const HEADING_LEVELS: { value: HeadingLevel; label: string }[] = [
  { value: 'h1', label: opt.h1 },
  { value: 'h2', label: opt.h2 },
  { value: 'h3', label: opt.h3 },
  { value: 'h4', label: opt.h4 },
];

const ALIGNMENTS: { value: TextAlignment; label: string }[] = [
  { value: 'left', label: opt.left },
  { value: 'center', label: opt.center },
  { value: 'right', label: opt.right },
];

const BUTTON_VARIANTS: { value: ButtonVariant; label: string }[] = [
  { value: 'primary', label: opt.primary },
  { value: 'secondary', label: opt.secondary },
  { value: 'outline', label: opt.outline },
  { value: 'ghost', label: opt.ghost },
  { value: 'danger', label: opt.danger },
];

const WIDTH_OPTIONS: { value: WidthStyle; label: string }[] = [
  { value: 'full', label: opt.fullWidth },
  { value: 'half', label: opt.halfWidth },
  { value: 'auto', label: opt.auto },
];

const ANIMATION_OPTIONS: { value: AnimationType; label: string }[] = [
  { value: 'none', label: opt.none },
  { value: 'fade', label: opt.fadeIn },
  { value: 'slide', label: opt.slideIn },
  { value: 'bounce', label: opt.bounce },
  { value: 'pulse', label: opt.pulse },
];

const ASPECT_RATIO_OPTIONS: { value: AspectRatio | string; label: string }[] = [
  { value: 'auto', label: opt.auto },
  { value: 'square', label: opt.square },
  { value: '16:9', label: opt.widescreen },
  { value: '4:3', label: opt.standard },
];

const BORDER_RADIUS_OPTIONS: { value: BorderRadius; label: string }[] = [
  { value: 'none', label: opt.none },
  { value: 'sm', label: opt.small },
  { value: 'md', label: opt.medium },
  { value: 'lg', label: opt.large },
  { value: 'xl', label: opt.extraLarge },
  { value: '2xl', label: opt.xl2 },
  { value: 'full', label: opt.full },
];

const SHADOW_OPTIONS: { value: ShadowSize; label: string }[] = [
  { value: 'none', label: opt.noShadow },
  { value: 'sm', label: opt.small },
  { value: 'md', label: opt.medium },
  { value: 'lg', label: opt.large },
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

  const { labels, placeholders, sections } = builderCopy.properties;

  return (
    <div className="space-y-2.5">
      {/* ── Type Change ── */}
      <Section title={sections.fieldType} icon={<Settings2 className="h-3 w-3" />} defaultOpen={false}>
        <div className="grid grid-cols-4 gap-1.5">
          {FIELD_TYPE_OPTIONS.map((optItem) => (
            <button
              key={optItem.value}
              onClick={() => onChange({ type: optItem.value })}
              className={cn(
                'flex flex-col items-center gap-0.5 py-1.5 rounded-xl clay-sm text-[9px] transition-all',
                field.type === optItem.value
                  ? 'bg-clay-purple/30 shadow-[inset_4px_4px_8px_var(--clay-shadow-dark),inset_-4px_-4px_8px_var(--clay-shadow-light)]'
                  : 'bg-white/60 hover:bg-white hover:scale-105'
              )}
              style={{ color: field.type === optItem.value ? 'var(--clay-foreground)' : 'var(--clay-muted)' }}
              title={optItem.label}
            >
              {optItem.icon}
              <span className="truncate max-w-full">{optItem.label}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* ── Basic ── */}
      <Section title={sections.basic} icon={<Type className="h-3 w-3" />}>
        {/* Label */}
        <div className="space-y-1">
          <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>{labels.label}</label>
          <input
            value={field.label}
            onChange={(e) => onChange({ label: e.target.value })}
            placeholder={placeholders.fieldLabel}
            className="clay-input h-8 text-xs w-full px-3"
          />
        </div>

        {/* Placeholder - for input types */}
        {isInputType && field.type !== 'checkbox' && field.type !== 'toggle' && field.type !== 'color' && field.type !== 'rating' && (
          <div className="space-y-1">
            <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>{labels.placeholder}</label>
            <input
              value={field.placeholder || ''}
              onChange={(e) => onChange({ placeholder: e.target.value })}
              placeholder={placeholders.placeholderText}
              className="clay-input h-8 text-xs w-full px-3"
            />
          </div>
        )}

        {/* Required toggle */}
        {isInputType && (
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>{labels.required}</label>
            <ClayToggle
              checked={!!field.required}
              onChange={(v) => onChange({ required: v })}
              aria-label={labels.required}
            />
          </div>
        )}

        {/* Content text - for heading/paragraph */}
        {(field.type === 'heading' || field.type === 'paragraph') && (
          <div className="space-y-1">
            <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>{labels.contentText}</label>
            <input
              value={field.content || ''}
              onChange={(e) => onChange({ content: e.target.value })}
              placeholder={field.type === 'heading' ? placeholders.heading : placeholders.paragraph}
              className="clay-input h-8 text-xs w-full px-3"
            />
          </div>
        )}

        {/* Heading level */}
        {field.type === 'heading' && (
          <div className="space-y-1">
            <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>{labels.level}</label>
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
            <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>{labels.alignment}</label>
            <div className="flex gap-1">
              {ALIGNMENTS.map((a) => (
                <button
                  key={a.value}
                  onClick={() => onChange({ alignment: a.value })}
                  className={cn(
                    'flex-1 py-1 rounded-xl text-[10px] clay-sm transition-all',
                    (field.alignment === a.value || (!field.alignment && a.value === 'left'))
                      ? 'bg-clay-blue/40 shadow-[inset_4px_4px_8px_var(--clay-shadow-dark),inset_-4px_-4px_8px_var(--clay-shadow-light)]'
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
              <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>{labels.variant}</label>
              <div className="flex gap-1 flex-wrap">
                {BUTTON_VARIANTS.map((v) => (
                  <button
                    key={v.value}
                    onClick={() => onChange({ variant: v.value })}
                    className={cn(
                      'px-2 py-1 rounded-xl text-[10px] clay-sm transition-all',
                      (field.variant === v.value || (!field.variant && v.value === 'primary'))
                        ? 'bg-clay-purple/40 shadow-[inset_4px_4px_8px_var(--clay-shadow-dark),inset_-4px_-4px_8px_var(--clay-shadow-light)]'
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
              <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>{labels.actionType}</label>
              <select
                value={field.actionType || 'submit'}
                onChange={(e) => onChange({ actionType: e.target.value as 'submit' | 'reset' | 'link' })}
                className="clay-input h-8 w-full px-2 text-xs"
              >
                <option value="submit">{opt.submit}</option>
                <option value="reset">{opt.reset}</option>
                <option value="link">{opt.link}</option>
              </select>
            </div>
            {field.actionType === 'link' && (
              <div className="space-y-1">
                <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>{labels.url}</label>
                <input
                  value={field.href || ''}
                  onChange={(e) => onChange({ href: e.target.value })}
                  placeholder={placeholders.url}
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
              <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>{labels.imageUrl}</label>
              <input
                value={field.src || ''}
                onChange={(e) => onChange({ src: e.target.value })}
                placeholder={placeholders.imageUrl}
                className="clay-input h-8 text-xs w-full px-3"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>{labels.altText}</label>
              <input
                value={field.alt || ''}
                onChange={(e) => onChange({ alt: e.target.value })}
                placeholder={placeholders.imageAlt}
                className="clay-input h-8 text-xs w-full px-3"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>{labels.aspectRatio}</label>
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
            <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>{labels.options}</label>
            <div className="space-y-1 max-h-[120px] overflow-y-auto">
              {(field.options || []).map((optItem, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="flex-1 text-xs px-2 py-0.5 rounded clay-sm bg-clay-cream/80 truncate">{optItem}</span>
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
                placeholder={placeholders.addOption}
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
            <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>{labels.defaultValue}</label>
            <ClayToggle
              checked={!!field.defaultValue}
              onChange={(v) => onChange({ defaultValue: v })}
              activeClass="bg-clay-blue"
              aria-label={labels.defaultValue}
            />
          </div>
        )}
      </Section>

      {/* ── Validation Section ── */}
      {(isTextType || isNumberType || field.type === 'select') && (
        <Section title={sections.validation} icon={<List className="h-3 w-3" />}>
          {isTextType && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px]" style={{ color: 'var(--clay-muted)' }}>{labels.minLength}</label>
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
                  <label className="text-[10px]" style={{ color: 'var(--clay-muted)' }}>{labels.maxLength}</label>
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
                <label className="text-[10px]" style={{ color: 'var(--clay-muted)' }}>{labels.regexPattern}</label>
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
                  placeholder={placeholders.regex}
                  className="clay-input h-8 text-xs w-full px-3 font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px]" style={{ color: 'var(--clay-muted)' }}>{labels.errorMessage}</label>
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
                  placeholder={placeholders.errorMessage}
                  className="clay-input h-8 text-xs w-full px-3"
                />
              </div>
            </>
          )}
          {isNumberType && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px]" style={{ color: 'var(--clay-muted)' }}>{labels.min}</label>
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
                  <label className="text-[10px]" style={{ color: 'var(--clay-muted)' }}>{labels.max}</label>
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
                <label className="text-[10px]" style={{ color: 'var(--clay-muted)' }}>{labels.step}</label>
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
      <Section title={sections.styling} icon={<Palette className="h-3 w-3" />}>
        <div className="space-y-1">
          <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>{labels.width}</label>
          <div className="flex gap-1">
            {WIDTH_OPTIONS.map((w) => (
              <button
                key={w.value}
                onClick={() => onChange({ widthStyle: w.value })}
                className={cn(
                  'flex-1 py-1 rounded-xl text-[10px] clay-sm transition-all',
                  (field.widthStyle === w.value || (!field.widthStyle && w.value === 'full'))
                    ? 'bg-clay-blue/40 shadow-[inset_4px_4px_8px_var(--clay-shadow-dark),inset_-4px_-4px_8px_var(--clay-shadow-light)]'
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
            <label className="text-[10px]" style={{ color: 'var(--clay-muted)' }}>{labels.bgColor}</label>
            <div className="flex items-center gap-1">
              <input
                value={field.bgColor || ''}
                onChange={(e) => onChange({ bgColor: e.target.value })}
                placeholder={placeholders.bgColor}
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
            <label className="text-[10px]" style={{ color: 'var(--clay-muted)' }}>{labels.textColor}</label>
            <input
              value={field.textColor || ''}
              onChange={(e) => onChange({ textColor: e.target.value })}
              placeholder={placeholders.textColor}
              className="clay-input h-8 text-xs w-full px-2"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>{labels.showBorder}</label>
          <ClayToggle
            checked={!!field.border}
            onChange={(v) => onChange({ border: v })}
            aria-label={labels.showBorder}
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px]" style={{ color: 'var(--clay-muted)' }}>{labels.borderRadius}</label>
          <select
            value={field.borderRadius || 'md'}
            onChange={(e) => onChange({ borderRadius: e.target.value as BorderRadius })}
            className="clay-input h-8 w-full px-2 text-xs"
          >
            {BORDER_RADIUS_OPTIONS.map((optItem) => (
              <option key={optItem.value} value={optItem.value}>{optItem.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px]" style={{ color: 'var(--clay-muted)' }}>{labels.shadow}</label>
          <div className="flex gap-1 flex-wrap">
            {SHADOW_OPTIONS.map((s) => (
              <button
                key={s.value}
                onClick={() => onChange({ shadow: s.value })}
                className={cn(
                  'px-2 py-1 rounded-xl text-[10px] clay-sm transition-all',
                  (field.shadow === s.value || (!field.shadow && s.value === 'none'))
                    ? 'bg-clay-purple/40 shadow-[inset_4px_4px_8px_var(--clay-shadow-dark),inset_-4px_-4px_8px_var(--clay-shadow-light)]'
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
      <Section title={sections.animation} icon={<Sliders className="h-3 w-3" />}>
        <div className="flex gap-1 flex-wrap">
          {ANIMATION_OPTIONS.map((a) => (
            <button
              key={a.value}
              onClick={() => onChange({ animation: a.value })}
              className={cn(
                'px-2 py-1 rounded-xl text-[10px] clay-sm transition-all',
                (field.animation === a.value || (!field.animation && a.value === 'none'))
                  ? 'bg-clay-yellow/40 shadow-[inset_4px_4px_8px_var(--clay-shadow-dark),inset_-4px_-4px_8px_var(--clay-shadow-light)]'
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
      <Section title={sections.advanced} icon={<Settings2 className="h-3 w-3" />} defaultOpen={false}>
        <div className="space-y-1">
          <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>{labels.defaultValue}</label>
          <input
            value={typeof field.defaultValue === 'string' || typeof field.defaultValue === 'number' ? String(field.defaultValue) : ''}
            onChange={(e) => onChange({ defaultValue: e.target.value })}
            placeholder={placeholders.defaultValue}
            className="clay-input h-8 text-xs w-full px-3"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>{labels.customCssClass}</label>
          <input
            value={field.cssClass || ''}
            onChange={(e) => onChange({ cssClass: e.target.value })}
            placeholder={placeholders.cssClass}
            className="clay-input h-8 text-xs w-full px-3 font-mono"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-medium" style={{ color: 'var(--clay-muted)' }}>{labels.helpText}</label>
          <textarea
            value={field.helpText || ''}
            onChange={(e) => onChange({ helpText: e.target.value })}
            placeholder={placeholders.helpText}
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
          {builderCopy.properties.removeField}
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

  const { properties } = builderCopy;

  return (
    <aside className="w-full md:w-72 clay-sidebar flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-clay-border/40 shrink-0">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4" style={{ color: 'var(--clay-muted)' }} />
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--clay-foreground)' }}>
            {properties.panelTitle}
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
            <h4 className="text-sm font-medium mb-1" style={{ color: 'var(--clay-foreground)' }}>{properties.noSelectionTitle}</h4>
            <p className="text-xs max-w-[180px] leading-relaxed" style={{ color: 'var(--clay-muted)' }}>
              {properties.noSelectionHint}
            </p>
            <div className="mt-4 flex gap-2 text-[10px]" style={{ color: 'var(--clay-muted)' }}>
              {properties.hintChips.map((chip) => (
                <span key={chip} className="px-2 py-1 rounded-xl clay-sm bg-clay-peach/30">{chip}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
