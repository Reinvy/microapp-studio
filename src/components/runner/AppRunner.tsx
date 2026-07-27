'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Copy,
  Share2,
  Maximize2,
  Minimize2,
  Activity,
  Eye,
  EyeOff,
  Check,
  Download,
  Sparkles,
} from 'lucide-react';
import type { AppSchema, EngineResult } from '@/types/schema';
import { executeSchema } from '@/engine/schemaEngine';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import RenderField from './RenderField';

interface AppRunnerProps {
  app: AppSchema;
}

// ─── Live preview panel component ────────────────────────────────────────────

function LivePreview({
  values,
  app,
  liveResult,
  isVisible,
  onToggle,
}: {
  values: Record<string, unknown>;
  app: AppSchema;
  liveResult: EngineResult | null;
  isVisible: boolean;
  onToggle: () => void;
}) {
  const jsonPreview = useMemo(() => {
    try {
      return JSON.stringify(values, null, 2);
    } catch {
      return '{}';
    }
  }, [values]);

  const errorCount = liveResult?.errors.length || 0;

  return (
    <div
      className={cn(
        'rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-card overflow-hidden transition-all duration-300',
        'h-full flex flex-col'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/30 bg-muted/20">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
        >
          {isVisible ? (
            <Eye className="h-3.5 w-3.5 text-primary" />
          ) : (
            <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          Live Preview
        </button>
        <div className="flex items-center gap-2">
          {liveResult && (
            <Badge
              variant={errorCount > 0 ? 'destructive' : 'secondary'}
              className={cn(
                'text-[10px] px-1.5 py-0 h-4 gap-1',
                errorCount === 0 && 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
              )}
            >
              {errorCount > 0 ? (
                <XCircle className="h-2.5 w-2.5" />
              ) : (
                <CheckCircle2 className="h-2.5 w-2.5" />
              )}
              {errorCount > 0 ? `${errorCount} err` : 'valid'}
            </Badge>
          )}
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 font-mono">
            {Object.keys(values).length} vals
          </Badge>
        </div>
      </div>

      {/* Content */}
      {isVisible && (
        <div className="flex-1 overflow-auto p-3 space-y-3">
          {/* Live JSON */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Current Values
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(jsonPreview);
                }}
                className="text-[10px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
              >
                <Copy className="h-3 w-3" />
                Copy
              </button>
            </div>
            <pre className="text-[11px] font-mono leading-relaxed bg-muted/40 rounded-lg p-3 border border-border/30 overflow-x-auto whitespace-pre-wrap break-all max-h-48">
              {jsonPreview}
            </pre>
          </div>

          {/* Computed outputs */}
          {liveResult && Object.keys(liveResult.outputs).length > 0 && (
            <div>
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block mb-1.5">
                Computed Results
              </span>
              <div className="space-y-1">
                {Object.entries(liveResult.outputs).map(([key, val]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-2 rounded-lg bg-primary/5 border border-primary/10 group"
                  >
                    <span className="text-xs font-medium truncate mr-2">{key}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-mono bg-background/80 px-1.5 py-0.5 rounded border border-border/30 max-w-[120px] truncate">
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
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live errors inline */}
          {liveResult && errorCount > 0 && (
            <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <AlertCircle className="h-3 w-3 text-destructive" />
                <span className="text-xs font-medium text-destructive">Issues</span>
              </div>
              <ul className="space-y-0.5">
                {liveResult.errors.slice(0, 3).map((err, i) => (
                  <li
                    key={i}
                    className="text-[11px] text-destructive/80 flex items-start gap-1.5"
                  >
                    <span className="inline-block w-1 h-1 rounded-full bg-destructive/60 mt-1 shrink-0" />
                    {err}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main AppRunner component ───────────────────────────────────────────────

export default function AppRunner({ app }: AppRunnerProps) {
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [result, setResult] = useState<EngineResult | null>(null);
  const [running, setRunning] = useState(false);
  const [showLivePreview, setShowLivePreview] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [copiedShare, setCopiedShare] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);

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
      } else if (field.type === 'color') {
        initial[field.id] = field.color || '#6366f1';
      } else if (field.type === 'rating') {
        initial[field.id] = 0;
      } else {
        initial[field.id] = '';
      }
    }
    setValues(initial);
    setResult(null);
    setErrors({});
  }, [app.id, app.fields]);

  // Real-time live computation
  const liveResult = useMemo(() => {
    if (app.logicNodes && app.logicNodes.length > 0) {
      return executeSchema(app, values);
    }
    if (app.fields.length > 0) {
      // Still validate for errors
      return executeSchema(app, values);
    }
    return null;
  }, [app, values]);

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

      // Scroll to results
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }, 150);
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
      } else if (field.type === 'color') {
        initial[field.id] = field.color || '#6366f1';
      } else if (field.type === 'rating') {
        initial[field.id] = 0;
      } else {
        initial[field.id] = '';
      }
    }
    setValues(initial);
    setResult(null);
    setErrors({});
  }, [app.fields]);

  const handleShare = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    }).catch(() => {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2000);
    });
  }, []);

  const handleCopyValue = useCallback(async (val: unknown, id: string) => {
    try {
      await navigator.clipboard.writeText(String(val ?? ''));
    } catch {
      // fallback
    }
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setFullscreen(false);
    }
  }, []);

  const hasFields = app.fields.length > 0;
  const hasLogicNodes = (app.logicNodes?.length || 0) > 0;
  const outputEntries = result?.outputs
    ? Object.entries(result.outputs).filter(([_, v]) => v !== undefined)
    : [];

  return (
    <div className={cn(
      'min-h-screen bg-background',
      fullscreen && 'fixed inset-0 z-50 overflow-auto'
    )}>
      <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
        {/* ── App Header ──────────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight gradient-text">
                  {app.name}
                </h1>
                <Badge variant="outline" className="shrink-0 text-[10px] px-2 py-0.5 font-mono border-primary/20 text-primary/70">
                  v{app.version}
                </Badge>
              </div>
              {app.description && (
                <p className="text-sm text-muted-foreground mt-1.5 max-w-2xl">
                  {app.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={handleShare}
                title="Share this app"
              >
                {copiedShare ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Share2 className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={toggleFullscreen}
                title={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                {fullscreen ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 gap-1">
              <Sparkles className="h-2.5 w-2.5" />
              {app.fields.length} field{app.fields.length !== 1 ? 's' : ''}
            </Badge>
            {hasLogicNodes && (
              <Badge variant="secondary" className="text-[10px] px-2 py-0.5 gap-1">
                <Activity className="h-2.5 w-2.5" />
                {app.logicNodes.length} logic node{app.logicNodes.length !== 1 ? 's' : ''}
              </Badge>
            )}
            {liveResult && liveResult.errors.length > 0 && (
              <Badge variant="destructive" className="text-[10px] px-2 py-0.5 gap-1">
                <AlertCircle className="h-2.5 w-2.5" />
                {liveResult.errors.length} issue{liveResult.errors.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </div>

        {/* ── Main Layout: Form + Live Preview ───────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── Form Column ────────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            <Card className="border-border/40 shadow-card overflow-visible">
              <CardContent className="p-5 md:p-6">
                {/* Empty state */}
                {!hasFields && (
                  <div className="flex flex-col items-center justify-center py-16 rounded-xl border-2 border-dashed border-border/40 bg-muted/20">
                    <AlertCircle className="h-10 w-10 text-muted-foreground/40 mb-4" />
                    <p className="text-sm text-muted-foreground text-center max-w-xs">
                      This app has no fields yet. Go to the builder to add some.
                    </p>
                  </div>
                )}

                {/* Fields */}
                {hasFields && (
                  <div className="space-y-5">
                    {app.fields.map((field, idx) => (
                      <div
                        key={field.id}
                        className={cn(
                          'rounded-xl border border-border/40 bg-card p-4 md:p-5',
                          'shadow-sm hover:shadow-card transition-all duration-300',
                          'animate-slide-up',
                          field.style?.borderRadius ? getFieldBorderRadius(field.style) : 'rounded-xl',
                          field.style?.bgColor ? '' : 'bg-card',
                          getFieldShadow(field.style),
                        )}
                        style={{
                          animationDelay: `${idx * 40}ms`,
                          animationFillMode: 'backwards',
                          backgroundColor: field.style?.bgColor,
                          ...(field.style?.border ? { border: '1px solid var(--border)' } : {}),
                        }}
                      >
                        <RenderField
                          field={field}
                          value={values[field.id]}
                          error={errors[field.id]}
                          onChange={handleChange}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                {hasFields && (
                  <div className="flex items-center gap-3 pt-6 mt-2 border-t border-border/30">
                    <Button
                      onClick={handleSubmit}
                      disabled={running}
                      size="lg"
                      className="gap-2 min-w-[130px] relative overflow-hidden group"
                    >
                      {running ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 fill-current" />
                          <span>{hasLogicNodes ? 'Calculate' : 'Submit'}</span>
                        </>
                      )}
                      <div className={cn(
                        'absolute inset-0 bg-white/10 -translate-x-full group-hover:translate-x-0 transition-transform duration-500',
                        running ? 'hidden' : ''
                      )} />
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
              </CardContent>
            </Card>
          </div>

          {/* ── Live Preview (desktop: sidebar, mobile: below) ────────────── */}
          <div className="lg:w-[340px] xl:w-[380px] shrink-0">
            <div className="lg:sticky lg:top-24">
              <LivePreview
                values={values}
                app={app}
                liveResult={liveResult}
                isVisible={showLivePreview}
                onToggle={() => setShowLivePreview(!showLivePreview)}
              />
            </div>
          </div>
        </div>

        {/* ── Submit Results ────────────────────────────────────────────────── */}
        {(result || running) && (
          <div ref={resultRef} className="mt-8 animate-slide-up">
            <Card className="border-border/40 shadow-elevated overflow-hidden">
              <CardContent className="p-0">
                {/* Results header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/30 bg-muted/10">
                  <div className="flex items-center gap-2.5">
                    {result && result.errors.length > 0 ? (
                      <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                        <XCircle className="h-4 w-4 text-destructive" />
                      </div>
                    ) : result ? (
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-semibold">
                        {running ? 'Processing...' : result?.errors.length === 0 ? 'Success' : 'Validation Errors'}
                      </span>
                      {result && (
                        <span className={cn(
                          'text-[11px] ml-2',
                          result.errors.length === 0 ? 'text-emerald-600' : 'text-destructive'
                        )}>
                          {result.errors.length === 0
                            ? 'All fields valid'
                            : `${result.errors.length} error${result.errors.length !== 1 ? 's' : ''} found`}
                        </span>
                      )}
                    </div>
                  </div>
                  {result && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1.5 text-muted-foreground"
                      onClick={() => {
                        const text = JSON.stringify({
                          inputs: result.inputs,
                          outputs: result.outputs,
                          errors: result.errors,
                        }, null, 2);
                        navigator.clipboard.writeText(text);
                      }}
                    >
                      <Download className="h-3 w-3" />
                      Export
                    </Button>
                  )}
                </div>

                {/* Results body */}
                {result && (
                  <div className="px-5 py-4 space-y-4">
                    {/* Errors section */}
                    {result.errors.length > 0 && (
                      <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-4">
                        <ul className="space-y-1.5">
                          {result.errors.map((err, i) => (
                            <li
                              key={i}
                              className="text-xs text-destructive/90 flex items-start gap-2"
                            >
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-destructive/60 mt-1 shrink-0" />
                              {err}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Input summary */}
                    {result.inputs && Object.keys(result.inputs).length > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Input Values
                          </span>
                          <button
                            onClick={() => setShowRaw(!showRaw)}
                            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors font-medium"
                          >
                            {showRaw ? 'Show formatted' : 'Show raw'}
                          </button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {app.fields.map((field) => {
                            const val = result.inputs[field.id];
                            return (
                              <div
                                key={field.id}
                                className={cn(
                                  'flex items-center justify-between p-2.5 rounded-lg border border-border/30 bg-muted/20 group',
                                  'hover:border-border/60 hover:bg-muted/30 transition-all'
                                )}
                              >
                                <span className="text-xs text-muted-foreground truncate mr-3 font-medium">
                                  {field.label}
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="text-xs font-mono bg-background/80 px-2 py-0.5 rounded border border-border/20 truncate max-w-[140px]">
                                    {showRaw
                                      ? JSON.stringify(val)
                                      : String(val ?? '-')}
                                  </span>
                                  <button
                                    onClick={() => handleCopyValue(val, field.id)}
                                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all"
                                    title="Copy value"
                                  >
                                    {copiedId === field.id ? (
                                      <Check className="h-3 w-3 text-emerald-500" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Computed outputs */}
                    {outputEntries.length > 0 && (
                      <div>
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
                        <div className="grid gap-2 sm:grid-cols-2">
                          {outputEntries.map(([key, val]) => (
                            <div
                              key={key}
                              className={cn(
                                'flex items-center justify-between p-2.5 rounded-lg border border-primary/10 bg-primary/[0.03] group',
                                'hover:border-primary/20 hover:bg-primary/[0.05] transition-all'
                              )}
                            >
                              <span className="text-sm font-medium truncate mr-2">{key}</span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-xs font-mono bg-background/80 px-2 py-0.5 rounded border border-border/20 max-w-[140px] truncate">
                                  {typeof val === 'object'
                                    ? JSON.stringify(val)
                                    : String(val ?? '-')}
                                </span>
                                <button
                                  onClick={() => handleCopyValue(val, key)}
                                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all"
                                  title="Copy value"
                                >
                                  {copiedId === key ? (
                                    <Check className="h-3 w-3 text-emerald-500" />
                                  ) : (
                                    <Copy className="h-3 w-3" />
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Success with no outputs */}
                    {result.errors.length === 0 && outputEntries.length === 0 && (
                      <div className="flex flex-col items-center py-8 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-3">
                          <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                        </div>
                        <p className="text-sm font-medium text-foreground">Form submitted successfully!</p>
                        <p className="text-xs text-muted-foreground mt-1">All inputs are valid.</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Local helpers ───────────────────────────────────────────────────────────

function getFieldBorderRadius(style?: { borderRadius?: string }): string {
  if (!style?.borderRadius) return 'rounded-xl';
  const map: Record<string, string> = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full',
  };
  return map[style.borderRadius] || style.borderRadius;
}

function getFieldShadow(style?: { shadow?: string }): string {
  if (!style?.shadow) return '';
  const map: Record<string, string> = {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl',
    '2xl': 'shadow-2xl',
  };
  return map[style.shadow] || style.shadow;
}
