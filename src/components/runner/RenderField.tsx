'use client';

import { useCallback, useState } from 'react';
import type { FieldSchema, FieldStyleConfig } from '@/types/schema';
import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';

interface RenderFieldProps {
  field: FieldSchema;
  value: unknown;
  error?: string | null;
  onChange: (fieldId: string, value: unknown) => void;
}

// ─── Style helpers ───────────────────────────────────────────────────────────

function getSizeClasses(size?: 'sm' | 'md' | 'lg'): string {
  switch (size) {
    case 'sm': return 'h-8 text-xs';
    case 'lg': return 'h-12 text-base';
    default: return 'h-10 text-sm';
  }
}

function getInputPadding(size?: 'sm' | 'md' | 'lg'): string {
  switch (size) {
    case 'sm': return 'px-2.5 py-1';
    case 'lg': return 'px-4 py-3';
    default: return 'px-3 py-2';
  }
}

function getFieldBorderRadius(style?: FieldStyleConfig): string {
  if (!style?.borderRadius || style.borderRadius === 'none') return 'rounded-lg';
  const map: Record<string, string> = {
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full',
  };
  return map[style.borderRadius] || style.borderRadius;
}

function getFieldShadow(style?: FieldStyleConfig): string {
  if (!style?.shadow || style.shadow === 'none') return '';
  const map: Record<string, string> = {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  };
  return map[style.shadow] || style.shadow;
}

function getFieldAnimation(style?: FieldStyleConfig): string {
  if (!style?.animation || style.animation === 'none') return '';
  const map: Record<string, string> = {
    fade: 'animate-fade-in',
    slide: 'animate-slide-up',
    bounce: 'animate-slide-up',
    pulse: 'animate-fade-in',
  };
  return map[style.animation] || '';
}

function buildContainerStyle(field: FieldSchema): React.CSSProperties {
  const s: React.CSSProperties = {};
  if (field.style?.bgColor) s.backgroundColor = field.style.bgColor;
  else if (field.bgColor) s.backgroundColor = field.bgColor;
  if (field.style?.textColor) s.color = field.style.textColor;
  else if (field.textColor) s.color = field.textColor;
  if (field.width === 'full' || field.widthStyle === 'full') s.width = '100%';
  else if (field.width === 'half' || field.widthStyle === 'half') s.width = '50%';
  return s;
}

function buildLabelColor(field: FieldSchema): React.CSSProperties['color'] {
  return field.style?.textColor || field.textColor;
}

// ─── Input classes ───────────────────────────────────────────────────────────

function useInputClasses(field: FieldSchema, error?: string | null): string {
  return cn(
    'flex w-full rounded-md border bg-transparent shadow-sm transition-all duration-200',
    'placeholder:text-muted-foreground/60',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
    'disabled:cursor-not-allowed disabled:opacity-50',
    getSizeClasses(field.size),
    getInputPadding(field.size),
    error
      ? 'border-destructive focus-visible:ring-destructive/50'
      : 'border-input hover:border-primary/40 focus-visible:border-primary',
    getFieldBorderRadius(field.style)
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function RenderField({ field, value, error, onChange }: RenderFieldProps) {
  const [ratingHover, setRatingHover] = useState<number | null>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const target = e.target;
      let newValue: unknown;

      switch (field.type) {
        case 'number':
        case 'slider':
          newValue = target.value === '' ? '' : Number(target.value);
          break;
        case 'checkbox':
          newValue = (target as HTMLInputElement).checked;
          break;
        case 'toggle':
          newValue = (target as HTMLInputElement).checked;
          break;
        case 'file':
          newValue = (target as HTMLInputElement).files?.[0] || null;
          break;
        default:
          newValue = target.value;
      }

      onChange(field.id, newValue);
    },
    [field.id, field.type, onChange]
  );

  // ── Non-interactive fields ──────────────────────────────────────────────────

  if (field.type === 'heading') {
    const level = field.headingLevel || field.level || 'h2';
    const sizeMap: Record<string, string> = {
      h1: 'text-3xl font-bold tracking-tight',
      h2: 'text-2xl font-semibold tracking-tight',
      h3: 'text-xl font-semibold tracking-tight',
      h4: 'text-lg font-medium',
      h5: 'text-base font-medium',
      h6: 'text-sm font-medium',
    };
    const renderHeading = () => {
      const cls = cn(sizeMap[level] || sizeMap.h2, 'text-foreground');
      const style: React.CSSProperties = { ...buildContainerStyle(field) };
      const color = buildLabelColor(field);
      if (color) style.color = color;
      switch (level) {
        case 'h1': return <h1 className={cls} style={style}>{field.content || field.label}</h1>;
        case 'h2': return <h2 className={cls} style={style}>{field.content || field.label}</h2>;
        case 'h3': return <h3 className={cls} style={style}>{field.content || field.label}</h3>;
        case 'h4': return <h4 className={cls} style={style}>{field.content || field.label}</h4>;
        case 'h5': return <h5 className={cls} style={style}>{field.content || field.label}</h5>;
        case 'h6': return <h6 className={cls} style={style}>{field.content || field.label}</h6>;
        default: return <h2 className={cls} style={style}>{field.content || field.label}</h2>;
      }
    };
    return (
      <div className={cn('space-y-1', getFieldAnimation(field.style))}>
        {renderHeading()}
      </div>
    );
  }

  if (field.type === 'paragraph') {
    return (
      <div
        className={cn('space-y-1', getFieldAnimation(field.style))}
        style={buildContainerStyle(field)}
      >
        <p
          className={cn(
            'text-sm leading-relaxed',
            field.style?.textColor || field.textColor ? '' : 'text-muted-foreground'
          )}
          style={{ color: buildLabelColor(field) }}
        >
          {field.content || field.placeholder || field.label}
        </p>
      </div>
    );
  }

  if (field.type === 'divider' || field.type === 'spacer') {
    const isSpacer = field.type === 'spacer';
    return (
      <div
        className={cn(
          isSpacer ? 'py-4' : 'py-2',
          getFieldAnimation(field.style)
        )}
        style={buildContainerStyle(field)}
      >
        {isSpacer ? (
          <div className="w-full" style={{ height: field.min || 24 }} />
        ) : (
          <hr className={cn(
            'border-t',
            field.border === false ? 'border-transparent' : 'border-border/60'
          )} />
        )}
      </div>
    );
  }

  if (field.type === 'image') {
    return (
      <div
        className={cn('space-y-1', getFieldAnimation(field.style))}
        style={buildContainerStyle(field)}
      >
        {field.label && (
          <label
            className={cn('text-sm font-medium block mb-1', field.style?.textColor ? '' : 'text-foreground')}
            style={{ color: buildLabelColor(field) }}
          >
            {field.label}
          </label>
        )}
        <div
          className={cn(
            'overflow-hidden',
            getFieldBorderRadius(field.style),
            getFieldShadow(field.style),
            field.border !== false ? 'ring-1 ring-border/40' : ''
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={field.src || ''}
            alt={field.alt || field.label || 'Image'}
            className={cn(
              'w-full h-auto object-cover',
              field.aspectRatio === 'square' && 'aspect-square object-cover',
              field.aspectRatio === '16:9' && 'aspect-video object-cover',
              field.aspectRatio === '4:3' && 'aspect-[4/3] object-cover',
            )}
            style={{ maxHeight: 320 }}
          />
        </div>
        {field.alt && (
          <p className="text-xs text-muted-foreground mt-1">{field.alt}</p>
        )}
      </div>
    );
  }

  if (field.type === 'button') {
    const btnVariantMap: Record<string, string> = {
      primary: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
      secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/90',
      outline: 'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      danger: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
    };
    const btnSizeMap: Record<string, string> = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 text-sm',
      lg: 'h-12 px-6 text-base',
    };

    return (
      <div
        className={cn(getFieldAnimation(field.style))}
        style={buildContainerStyle(field)}
      >
        <button
          type={field.action === 'submit' || field.actionType === 'submit' ? 'submit' : 'button'}
          onClick={() => {
            if (field.action === 'reset' || field.actionType === 'reset') onChange(field.id, '');
            if (field.action === 'link' && field.href) window.open(field.href, '_blank');
          }}
          className={cn(
            'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:pointer-events-none disabled:opacity-50',
            btnVariantMap[field.variant || 'primary'],
            btnSizeMap[field.size || 'md'],
            getFieldBorderRadius(field.style),
            getFieldShadow(field.style),
            field.width === 'full' || field.widthStyle === 'full' ? 'w-full' : ''
          )}
          style={{
            backgroundColor: field.style?.bgColor || field.bgColor || undefined,
            color: field.style?.textColor || field.textColor || undefined,
            ...(field.border === false ? { border: 'none' as const } : {}),
          }}
        >
          {field.content || field.label || 'Button'}
        </button>
      </div>
    );
  }

  if (field.type === 'color') {
    const hexValue = (value as string) || field.color || '#6366f1';
    return (
      <div
        className={cn('space-y-1.5', getFieldAnimation(field.style))}
        style={buildContainerStyle(field)}
      >
        <div className="flex items-center justify-between">
          <label
            htmlFor={field.id}
            className="text-sm font-medium leading-none"
            style={{ color: buildLabelColor(field) }}
          >
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </label>
          <span className="text-[11px] font-mono text-muted-foreground">{hexValue}</span>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="h-10 w-10 rounded-xl border-2 border-border/60 shadow-sm shrink-0 ring-1 ring-inset ring-white/20"
            style={{ backgroundColor: hexValue }}
          />
          <input
            type="color"
            id={field.id}
            value={hexValue}
            onChange={(e) => onChange(field.id, e.target.value)}
            className={cn(
              'flex-1 h-10 rounded-lg border border-input bg-transparent px-1 py-1 shadow-sm transition-all duration-200',
              'hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'cursor-pointer',
              error ? 'border-destructive' : ''
            )}
          />
        </div>
        {error && (
          <p className="text-xs text-destructive mt-1 flex items-center gap-1 animate-fade-in">
            <span className="inline-block w-1 h-1 rounded-full bg-destructive shrink-0" />
            {error}
          </p>
        )}
      </div>
    );
  }

  if (field.type === 'rating') {
    const currentVal = (value as number) || 0;
    const displayVal = ratingHover !== null ? ratingHover : currentVal;
    return (
      <div
        className={cn('space-y-1.5', getFieldAnimation(field.style))}
        style={buildContainerStyle(field)}
      >
        <label
          htmlFor={field.id}
          className="text-sm font-medium leading-none block"
          style={{ color: buildLabelColor(field) }}
        >
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </label>
        <div className="flex items-center gap-0.5" id={field.id}>
          {[1, 2, 3, 4, 5].map((star) => {
            const filled = star <= displayVal;
            return (
              <button
                key={star}
                type="button"
                onClick={() => onChange(field.id, star === currentVal ? 0 : star)}
                onMouseEnter={() => setRatingHover(star)}
                onMouseLeave={() => setRatingHover(null)}
                className={cn(
                  'p-1 transition-all duration-150 rounded-md',
                  'hover:scale-110 active:scale-95',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                )}
                aria-label={`${star} star${star !== 1 ? 's' : ''}`}
              >
                <Star
                  className={cn(
                    'h-6 w-6 transition-all duration-150',
                    filled
                      ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
                      : 'text-muted-foreground/30 hover:text-muted-foreground/50'
                  )}
                  strokeWidth={filled ? 0 : 1.5}
                />
              </button>
            );
          })}
          <span className="ml-2 text-xs font-medium text-muted-foreground">
            {currentVal > 0 ? `${currentVal}/5` : 'Tap to rate'}
          </span>
        </div>
        {error && (
          <p className="text-xs text-destructive mt-1 flex items-center gap-1 animate-fade-in">
            <span className="inline-block w-1 h-1 rounded-full bg-destructive shrink-0" />
            {error}
          </p>
        )}
      </div>
    );
  }

  // ── Interactive input fields ───────────────────────────────────────────────

  const inputClasses = useInputClasses(field, error);

  const renderInput = () => {
    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            id={field.id}
            value={(value as string) ?? ''}
            onChange={handleChange}
            placeholder={field.placeholder}
            className={inputClasses}
          />
        );

      case 'email':
        return (
          <div className="relative">
            <input
              type="email"
              id={field.id}
              value={(value as string) ?? ''}
              onChange={handleChange}
              placeholder={field.placeholder || 'email@example.com'}
              className={cn(inputClasses, 'pl-9')}
              pattern={field.validation?.pattern}
              inputMode="email"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/40 pointer-events-none font-mono text-sm">
              @
            </span>
          </div>
        );

      case 'phone':
        return (
          <input
            type="tel"
            id={field.id}
            value={(value as string) ?? ''}
            onChange={handleChange}
            placeholder={field.placeholder || '+1 (555) 000-0000'}
            className={inputClasses}
            pattern={field.validation?.pattern || '[+]?[0-9\\s\\-()]{7,20}'}
            inputMode="tel"
          />
        );

      case 'url':
        return (
          <input
            type="url"
            id={field.id}
            value={(value as string) ?? ''}
            onChange={handleChange}
            placeholder={field.placeholder || 'https://example.com'}
            className={inputClasses}
            pattern={field.validation?.pattern}
            inputMode="url"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            id={field.id}
            value={(value as number | string) ?? ''}
            onChange={handleChange}
            placeholder={field.placeholder}
            min={field.min}
            max={field.max}
            step={field.step}
            className={inputClasses}
          />
        );

      case 'select':
        return (
          <select
            id={field.id}
            value={(value as string) ?? ''}
            onChange={handleChange}
            className={cn(
              inputClasses,
              'appearance-none cursor-pointer bg-no-repeat bg-[right_8px_center]',
              "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQiIGhlaWdodD0iMTQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYTFhMWFhIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBvbHlsaW5lIHBvaW50cz0iNiA5IDEyIDE1IDE4IDkiLz48L3N2Zz4=')]",
            )}
          >
            <option value="" disabled>
              {field.placeholder || `Select ${field.label}...`}
            </option>
            {(field.options || []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center gap-3 py-1">
            <input
              type="checkbox"
              id={field.id}
              checked={!!value}
              onChange={handleChange}
              className="h-4 w-4 rounded border-input bg-transparent text-primary focus:ring-primary/30 focus:ring-2 accent-primary cursor-pointer transition-all duration-200"
            />
            <label htmlFor={field.id} className="text-sm cursor-pointer select-none">
              {field.placeholder || field.label}
            </label>
          </div>
        );

      case 'textarea':
        return (
          <textarea
            id={field.id}
            value={(value as string) ?? ''}
            onChange={handleChange}
            placeholder={field.placeholder}
            rows={3}
            className={cn(inputClasses, 'min-h-[60px] resize-y')}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            id={field.id}
            value={(value as string) ?? ''}
            onChange={handleChange}
            className={inputClasses}
          />
        );

      case 'file':
        return (
          <div className="relative">
            <input
              type="file"
              id={field.id}
              onChange={handleChange}
              className={cn(
                inputClasses,
                'file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-primary/10 file:text-primary file:text-xs file:font-medium hover:file:bg-primary/20 file:transition-colors file:cursor-pointer cursor-pointer'
              )}
            />
          </div>
        );

      case 'slider':
        return (
          <div className="space-y-2">
            <input
              type="range"
              id={field.id}
              value={(value as number) ?? field.min ?? 0}
              onChange={handleChange}
              min={field.min ?? 0}
              max={field.max ?? 100}
              step={field.step ?? 1}
              className="w-full h-2 bg-muted rounded-full appearance-none cursor-pointer accent-primary
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md
                [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing
                [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:duration-150
                [&::-webkit-slider-thumb]:hover:scale-110"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{field.min ?? 0}</span>
              <span className="font-semibold text-foreground bg-muted/50 px-2 py-0.5 rounded-md text-sm">
                {String(value ?? field.min ?? 0)}
              </span>
              <span>{field.max ?? 100}</span>
            </div>
          </div>
        );

      case 'toggle':
        return (
          <div className="flex items-center gap-3 py-1">
            <button
              type="button"
              role="switch"
              id={field.id}
              aria-checked={!!value}
              onClick={() => onChange(field.id, !value)}
              className={cn(
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                value ? 'bg-primary' : 'bg-muted hover:bg-muted/80'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-md ring-0 transition-all duration-200',
                  value ? 'translate-x-4' : 'translate-x-0'
                )}
              />
            </button>
            <label
              htmlFor={field.id}
              className="text-sm cursor-pointer select-none"
              onClick={() => onChange(field.id, !value)}
            >
              {field.placeholder || field.label}
            </label>
          </div>
        );

      default:
        return (
          <input
            type="text"
            id={field.id}
            value={(value as string) ?? ''}
            onChange={handleChange}
            className={inputClasses}
            placeholder={field.placeholder}
          />
        );
    }
  };

  // ── Wrapper for interactive fields ──────────────────────────────────────────

  return (
    <div
      className={cn('space-y-1.5', getFieldAnimation(field.style))}
      style={buildContainerStyle(field)}
    >
      {(field.type !== 'checkbox' && field.type !== 'toggle') && (
        <div className="flex items-center justify-between">
          <label
            htmlFor={field.id}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            style={{ color: buildLabelColor(field) }}
          >
            {field.label}
            {field.required && (
              <span className="text-destructive ml-1">*</span>
            )}
          </label>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
            {field.type}
          </span>
        </div>
      )}
      {renderInput()}
      {field.helpText && !error && (
        <p className="text-[11px] text-muted-foreground/70 mt-1">{field.helpText}</p>
      )}
      {error && (
        <p className="text-xs text-destructive mt-1 flex items-center gap-1 animate-fade-in">
          <span className="inline-block w-1 h-1 rounded-full bg-destructive shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
