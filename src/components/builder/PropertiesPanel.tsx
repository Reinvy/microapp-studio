'use client';

import { useCallback } from 'react';
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
  X,
} from 'lucide-react';
import type { FieldType, FieldSchema } from '@/types/schema';
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
];

interface FieldEditorProps {
  field: FieldSchema;
  onChange: (updates: Partial<FieldSchema>) => void;
  onRemove: () => void;
}

function FieldEditor({ field, onChange, onRemove }: FieldEditorProps) {
  return (
    <div className="space-y-4">
      {/* Field type selector */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          Field Type
        </label>
        <div className="grid grid-cols-3 gap-1">
          {FIELD_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onChange({ type: opt.value })}
              className={cn(
                'flex flex-col items-center gap-1 py-2 rounded-md border text-[10px] transition-all',
                field.type === opt.value
                  ? 'border-primary bg-primary/10 text-primary shadow-sm'
                  : 'border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground'
              )}
            >
              {opt.icon}
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Label */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
          Label
        </label>
        <Input
          value={field.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Field label"
          className="h-8 text-sm"
        />
      </div>

      {/* Placeholder */}
      {(field.type === 'text' ||
        field.type === 'number' ||
        field.type === 'textarea') && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Placeholder
          </label>
          <Input
            value={field.placeholder || ''}
            onChange={(e) => onChange({ placeholder: e.target.value })}
            placeholder="Placeholder text"
            className="h-8 text-sm"
          />
        </div>
      )}

      {/* Required toggle */}
      <div className="flex items-center justify-between py-1">
        <label className="text-sm font-medium">Required</label>
        <button
          onClick={() => onChange({ required: !field.required })}
          className={cn(
            'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
            field.required ? 'bg-primary' : 'bg-muted'
          )}
        >
          <span
            className={cn(
              'inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform',
              field.required ? 'translate-x-[18px]' : 'translate-x-[3px]'
            )}
          />
        </button>
      </div>

      {/* Min/Max for number/slider */}
      {(field.type === 'number' || field.type === 'slider') && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Min
            </label>
            <Input
              type="number"
              value={field.min ?? ''}
              onChange={(e) =>
                onChange({ min: e.target.value ? Number(e.target.value) : undefined })
              }
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Max
            </label>
            <Input
              type="number"
              value={field.max ?? ''}
              onChange={(e) =>
                onChange({ max: e.target.value ? Number(e.target.value) : undefined })
              }
              className="h-8 text-sm"
            />
          </div>
        </div>
      )}

      {/* Step for number/slider */}
      {(field.type === 'number' || field.type === 'slider') && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Step
          </label>
          <Input
            type="number"
            step="any"
            value={field.step ?? ''}
            onChange={(e) =>
              onChange({ step: e.target.value ? Number(e.target.value) : undefined })
            }
            className="h-8 text-sm"
          />
        </div>
      )}

      {/* Options for select */}
      {field.type === 'select' && (
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
            Options <span className="font-normal normal-case">(one per line)</span>
          </label>
          <textarea
            className="flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
            placeholder="Option 1&#10;Option 2&#10;Option 3"
            value={(field.options || []).join('\n')}
            onChange={(e) =>
              onChange({
                options: e.target.value
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>
      )}

      {/* Default value for checkbox/toggle */}
      {(field.type === 'checkbox' || field.type === 'toggle') && (
        <div className="flex items-center justify-between py-1">
          <label className="text-sm font-medium">Default Value</label>
          <button
            onClick={() =>
              onChange({ defaultValue: !field.defaultValue })
            }
            className={cn(
              'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
              field.defaultValue ? 'bg-primary' : 'bg-muted'
            )}
          >
            <span
              className={cn(
                'inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform',
                field.defaultValue ? 'translate-x-[18px]' : 'translate-x-[3px]'
              )}
            />
          </button>
        </div>
      )}

      {/* Validation */}
      {(field.type === 'text' || field.type === 'textarea') && (
        <>
          <div className="border-t border-border/50 pt-3">
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
              Validation
            </label>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground">Min Length</label>
                  <Input
                    type="number"
                    value={field.validation?.minLength ?? ''}
                    onChange={(e) =>
                      onChange({
                        validation: {
                          ...field.validation,
                          minLength: e.target.value
                            ? Number(e.target.value)
                            : undefined,
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
                          maxLength: e.target.value
                            ? Number(e.target.value)
                            : undefined,
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
            </div>
          </div>
        </>
      )}

      {/* Delete button */}
      <div className="border-t border-border/50 pt-3">
        <Button
          variant="destructive"
          size="sm"
          className="w-full gap-1.5 text-xs h-8"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Remove Field
        </Button>
      </div>
    </div>
  );
}

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
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
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
      <div className="flex-1 overflow-y-auto p-4">
        {selectedField ? (
          <FieldEditor
            key={selectedField.id}
            field={selectedField}
            onChange={handleChange}
            onRemove={handleRemove}
          />
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
              <Settings2 className="h-6 w-6 text-muted-foreground" />
            </div>
            <h4 className="text-sm font-medium mb-1">No field selected</h4>
            <p className="text-xs text-muted-foreground max-w-[180px]">
              Click on a field in the canvas to edit its properties here.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
