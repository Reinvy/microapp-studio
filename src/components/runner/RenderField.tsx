'use client';

import { useCallback } from 'react';
import type { FieldSchema } from '@/types/schema';
import { cn } from '@/lib/utils';

interface RenderFieldProps {
  field: FieldSchema;
  value: unknown;
  error?: string | null;
  onChange: (fieldId: string, value: unknown) => void;
}

export default function RenderField({ field, value, error, onChange }: RenderFieldProps) {
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

  const inputClasses = cn(
    'flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors',
    'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
    'placeholder:text-muted-foreground',
    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
    'disabled:cursor-not-allowed disabled:opacity-50',
    error ? 'border-destructive focus-visible:ring-destructive' : 'border-input'
  );

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
              "bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQiIGhlaWdodD0iMTQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjYTFhMWFhIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+PHBvbHlsaW5lIHBvaW50cz0iNiA5IDEyIDE1IDE4IDkiLz48L3N2Zz4=')]"
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
              className="h-4 w-4 rounded border-input bg-transparent text-primary focus:ring-primary/30 focus:ring-2 accent-primary"
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
            className={cn(inputClasses, 'min-h-[60px] resize-y py-2')}
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
                'file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:bg-primary/10 file:text-primary file:text-xs file:font-medium hover:file:bg-primary/20'
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
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-sm
                [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{field.min ?? 0}</span>
              <span className="font-medium text-foreground">{String(value ?? field.min ?? 0)}</span>
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
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                value ? 'bg-primary' : 'bg-muted'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform',
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

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label
          htmlFor={field.id}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {field.label}
          {field.required && (
            <span className="text-destructive ml-1">*</span>
          )}
        </label>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {field.type}
        </span>
      </div>
      {renderInput()}
      {error && (
        <p className="text-xs text-destructive mt-1 flex items-center gap-1">
          <span className="inline-block w-1 h-1 rounded-full bg-destructive shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
