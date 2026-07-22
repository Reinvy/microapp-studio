'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Copy,
} from 'lucide-react';
import type { AppSchema, EngineResult } from '@/types/schema';
import { executeSchema } from '@/engine/schemaEngine';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import RenderField from './RenderField';

interface AppRunnerProps {
  app: AppSchema;
}

export default function AppRunner({ app }: AppRunnerProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<EngineResult | null>(null);
  const [running, setRunning] = useState(false);
  const [showOutput, setShowOutput] = useState(true);
  const [showRaw, setShowRaw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  // Initialize default values
  useEffect(() => {
    const initial: Record<string, unknown> = {};
    for (const field of app.fields) {
      if (field.defaultValue !== undefined) {
        initial[field.id] = field.defaultValue;
      } else if (field.type === 'checkbox' || field.type === 'toggle') {
        initial[field.id] = false;
      } else if (field.type === 'number' || field.type === 'slider') {
        initial[field.id] = field.min ?? 0;
      } else {
        initial[field.id] = '';
      }
    }
    setValues(initial);
    setResult(null);
    setErrors({});
  }, [app.id, app.fields]);

  const handleChange = useCallback(
    (fieldId: string, value: unknown) => {
      setValues((prev) => ({ ...prev, [fieldId]: value }));
      setErrors((prev) => ({ ...prev, [fieldId]: null }));
    },
    []
  );

  const handleSubmit = useCallback(() => {
    setRunning(true);
    setResult(null);

    // Run after a small delay for the UI to update
    setTimeout(() => {
      const engineResult = executeSchema(app, values);
      setResult(engineResult);

      // Map per-field errors
      const fieldErrors: Record<string, string | null> = {};
      for (const field of app.fields) {
        const fieldError = engineResult.errors.find((e) =>
          e.startsWith(field.label || field.id)
        );
        fieldErrors[field.id] = fieldError || null;
      }
      // Also store any non-field errors
      for (const err of engineResult.errors) {
        const matched = app.fields.some(
          (f) => err.startsWith(f.label || f.id)
        );
        if (!matched) {
          fieldErrors['_global'] = err;
        }
      }
      setErrors(fieldErrors);
      setRunning(false);
    }, 100);
  }, [app, values]);

  const handleReset = useCallback(() => {
    const initial: Record<string, unknown> = {};
    for (const field of app.fields) {
      if (field.defaultValue !== undefined) {
        initial[field.id] = field.defaultValue;
      } else if (field.type === 'checkbox' || field.type === 'toggle') {
        initial[field.id] = false;
      } else if (field.type === 'number' || field.type === 'slider') {
        initial[field.id] = field.min ?? 0;
      } else {
        initial[field.id] = '';
      }
    }
    setValues(initial);
    setResult(null);
    setErrors({});
  }, [app.fields]);

  const hasFields = app.fields.length > 0;
  const hasLogicNodes = (app.logicNodes?.length || 0) > 0;
  const outputEntries = result?.outputs
    ? Object.entries(result.outputs).filter(([_, v]) => v !== undefined)
    : [];

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* App header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{app.name}</h1>
            {app.description && (
              <p className="text-sm text-muted-foreground mt-1">{app.description}</p>
            )}
          </div>
          <Badge variant="outline" className="shrink-0">
            v{app.version}
          </Badge>
        </div>
        <div className="flex items-center gap-2 mt-3">
          <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
            {app.fields.length} field{app.fields.length !== 1 ? 's' : ''}
          </Badge>
          {(app.logicNodes?.length || 0) > 0 && (
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
              {app.logicNodes.length} logic node{app.logicNodes.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="space-y-6">
        {!hasFields && (
          <div className="flex flex-col items-center justify-center py-12 rounded-xl border-2 border-dashed border-border/50 bg-card/30">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              This app has no fields yet. Go to the builder to add some.
            </p>
          </div>
        )}

        <div className="space-y-5">
          {app.fields.map((field) => (
            <RenderField
              key={field.id}
              field={field}
              value={values[field.id]}
              error={errors[field.id]}
              onChange={handleChange}
            />
          ))}
        </div>

        {hasFields && (
          <div className="flex items-center gap-2 pt-2">
            <Button
              onClick={handleSubmit}
              disabled={running}
              className="gap-2"
              size="lg"
            >
              {running ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4 fill-current" />
              )}
              {hasLogicNodes ? 'Calculate' : 'Submit'}
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={running}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
          </div>
        )}
      </div>

      {/* Results */}
      {(result || running) && (
        <div className="mt-8 animate-slide-in">
          <button
            onClick={() => setShowOutput(!showOutput)}
            className="flex items-center justify-between w-full px-4 py-3 rounded-lg bg-card border border-border/50 hover:border-border transition-colors"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-semibold">Output</span>
              {result && (
                <span className="text-[11px] text-muted-foreground">
                  {result.errors.length > 0
                    ? `${result.errors.length} error${result.errors.length !== 1 ? 's' : ''}`
                    : 'All valid'}
                </span>
              )}
            </div>
            {showOutput ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {showOutput && (
            <div className="mt-2 space-y-3">
              {/* Errors */}
              {result && result.errors.length > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium text-destructive">
                      Validation Errors
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {result.errors.map((err, i) => (
                      <li
                        key={i}
                        className="text-xs text-destructive/80 flex items-start gap-2"
                      >
                        <span className="inline-block w-1 h-1 rounded-full bg-destructive/60 mt-1.5 shrink-0" />
                        {err}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Inputs summary */}
              {result && result.inputs && Object.keys(result.inputs).length > 0 && (
                <div className="rounded-lg border border-border/50 bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Input Values
                    </span>
                    <button
                      onClick={() => setShowRaw(!showRaw)}
                      className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showRaw ? 'Show formatted' : 'Show raw'}
                    </button>
                  </div>
                  <div className="space-y-2">
                    {app.fields.map((field) => {
                      const val = result.inputs[field.id];
                      return (
                        <div
                          key={field.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-muted-foreground truncate mr-4">
                            {field.label}
                          </span>
                          <span className="font-medium font-mono text-xs">
                            {showRaw
                              ? JSON.stringify(val)
                              : String(val ?? '-')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Computed outputs */}
              {outputEntries.length > 0 && (
                <div className="rounded-lg border border-border/50 bg-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Computed Results
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-[9px] px-1.5 py-0 h-4"
                    >
                      {outputEntries.length}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    {outputEntries.map(([key, val]) => (
                      <div
                        key={key}
                        className="flex items-center justify-between p-2 rounded-md bg-muted/50 group"
                      >
                        <span className="text-sm font-medium">{key}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono bg-background px-2 py-0.5 rounded border border-border/50">
                            {typeof val === 'object'
                              ? JSON.stringify(val)
                              : String(val ?? '-')}
                          </span>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(
                                String(val ?? '')
                              );
                            }}
                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result &&
                result.errors.length === 0 &&
                outputEntries.length === 0 && (
                  <div className="rounded-lg border border-border/50 bg-card p-6 text-center">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Form submitted successfully!
                    </p>
                  </div>
                )}

              {running && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
