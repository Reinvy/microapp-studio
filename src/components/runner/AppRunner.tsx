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
import { cn } from '@/lib/utils';
import { getFieldBorderRadius } from '@/lib/fieldStyles';
import { runnerCopy } from '@/lib/runnerCopy';
import RenderField from './RenderField';

interface AppRunnerProps {
  app: AppSchema;
}

// ─── Live preview panel component ────────────────────────────────────────────

/** Clay pill showing a value + copy button. Extracted so the live preview,
 *  input summary, and computed outputs render identical markup. */
function CopyValuePill({
  value,
  copied,
  onCopy,
  className,
}: {
  value: unknown;
  copied: boolean;
  onCopy: () => void;
  className?: string;
}) {
  const display =
    typeof value === 'object'
      ? JSON.stringify(value)
      : String(value ?? '-');
  return (
    <div className={cn('flex items-center gap-1.5 shrink-0', className)}>
      <span
        className="text-xs font-mono bg-white/80 px-2 py-0.5 rounded-lg clay-sm max-w-[140px] truncate"
        style={{ color: 'var(--clay-foreground)' }}
      >
        {display}
      </span>
      <button
        onClick={onCopy}
        // Visible on touch (no hover): only hide behind hover-reveal on md+ screens
        className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all clay-sm p-1 bg-clay-peach/30 hover:bg-clay-peach/50"
        style={{ color: 'var(--clay-foreground)' }}
        title={runnerCopy.preview.copyValue}
      >
        {copied ? (
          <Check className="h-3 w-3" style={{ color: 'var(--clay-foreground)' }} />
        ) : (
          <Copy className="h-3 w-3" style={{ color: 'var(--clay-foreground)' }} />
        )}
      </button>
    </div>
  );
}

function LivePreview({
  values,
  liveResult,
  isVisible,
  onToggle,
}: {
  values: Record<string, unknown>;
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
        'clay-card h-full flex flex-col overflow-hidden transition-all duration-300',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-clay-border/30 bg-clay-cream/40">
        <button
          onClick={onToggle}
          className="flex items-center gap-2 text-sm font-medium transition-colors"
          style={{ color: 'var(--clay-foreground)' }}
        >
          {isVisible ? (
            <Eye className="h-3.5 w-3.5" style={{ color: '#D5B8F5' }} />
          ) : (
            <EyeOff className="h-3.5 w-3.5" style={{ color: 'var(--clay-muted)' }} />
          )}
          {runnerCopy.preview.title}
        </button>
        <div className="flex items-center gap-2">
          {liveResult && (
            <span
              className={cn(
                'text-[10px] px-2 py-0.5 rounded-full clay-sm flex items-center gap-1',
                errorCount === 0 && 'bg-clay-green/40',
                errorCount > 0 && 'bg-clay-rose/40'
              )}
              style={{ color: 'var(--clay-foreground)' }}
            >
              {errorCount > 0 ? (
                <XCircle className="h-2.5 w-2.5" />
              ) : (
                <CheckCircle2 className="h-2.5 w-2.5" />
              )}
              {errorCount > 0 ? runnerCopy.preview.errShort(errorCount) : runnerCopy.preview.valid}
            </span>
          )}
          <span className="text-[9px] px-2 py-0.5 rounded-full clay-sm bg-clay-blue/20 font-mono" style={{ color: 'var(--clay-foreground)' }}>
            {runnerCopy.preview.valsShort(Object.keys(values).length)}
          </span>
        </div>
      </div>

      {/* Content */}
      {isVisible && (
        <div className="flex-1 overflow-auto p-3 space-y-3">
          {/* Live JSON */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--clay-muted)' }}>
                {runnerCopy.preview.currentValues}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(jsonPreview);
                }}
                className="text-[10px] transition-colors flex items-center gap-1 clay-sm px-2 py-0.5 bg-clay-peach/30 hover:bg-clay-peach/50"
                style={{ color: 'var(--clay-foreground)' }}
              >
                <Copy className="h-3 w-3" />
                {runnerCopy.preview.copy}
              </button>
            </div>
            <pre className="text-[11px] font-mono leading-relaxed clay-inset p-3 overflow-x-auto whitespace-pre-wrap break-all max-h-48" style={{ color: 'var(--clay-foreground)' }}>
              {jsonPreview}
            </pre>
          </div>

          {/* Computed outputs */}
          {liveResult && Object.keys(liveResult.outputs).length > 0 && (
            <div>
              <span className="text-[10px] font-medium uppercase tracking-wider block mb-1.5" style={{ color: 'var(--clay-muted)' }}>
                {runnerCopy.preview.computedResults}
              </span>
              <div className="space-y-1">
                {Object.entries(liveResult.outputs).map(([key, val]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between p-2 rounded-xl clay-sm bg-clay-purple/10 group"
                  >
                    <span className="text-xs font-medium truncate mr-2" style={{ color: 'var(--clay-foreground)' }}>{key}</span>
                    <CopyValuePill
                      value={val}
                      copied={false}
                      onCopy={() => {
                        navigator.clipboard.writeText(
                          String(val ?? '')
                        );
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live errors inline */}
          {liveResult && errorCount > 0 && (
            <div className="rounded-xl clay-sm bg-clay-rose/20 p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <AlertCircle className="h-3 w-3" style={{ color: 'var(--clay-foreground)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--clay-foreground)' }}>{runnerCopy.preview.issues}</span>
              </div>
              <ul className="space-y-0.5">
                {liveResult.errors.slice(0, 3).map((err, i) => (
                  <li
                    key={i}
                    className="text-[11px] flex items-start gap-1.5"
                    style={{ color: 'var(--clay-foreground)' }}
                  >
                    <span className="inline-block w-1 h-1 rounded-full bg-clay-rose/60 mt-1 shrink-0" />
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

// Build default values for every field — shared by the initial load and Reset
// so both code paths stay in sync when new field types are added.
function buildInitialValues(app: AppSchema): Record<string, unknown> {
  const initial: Record<string, unknown> = {};
  for (const field of app.fields) {
    if (field.defaultValue !== undefined) {
      initial[field.id] = field.defaultValue;
    } else if (field.type === 'checkbox' || field.type === 'toggle') {
      initial[field.id] = false;
    } else if (field.type === 'number' || field.type === 'slider') {
      initial[field.id] = field.min ?? 0;
    } else if (field.type === 'color') {
      initial[field.id] = field.color || '#D5B8F5';
    } else if (field.type === 'rating') {
      initial[field.id] = 0;
    } else {
      initial[field.id] = '';
    }
  }
  return initial;
}

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
    const initial = buildInitialValues(app);
    setValues(initial);
    setResult(null);
    setErrors({});
  }, [app]);

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
    const initial = buildInitialValues(app);
    setValues(initial);
    setResult(null);
    setErrors({});
  }, [app]);

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
    ? Object.entries(result.outputs).filter(([, v]) => v !== undefined)
    : [];

  return (
    <div className={cn(
      'min-h-screen bg-clay-cream',
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
                <span className="shrink-0 text-[10px] px-3 py-0.5 rounded-full clay-sm bg-clay-purple/20 font-mono" style={{ color: 'var(--clay-foreground)' }}>
                  v{app.version}
                </span>
              </div>
              {app.description && (
                <p className="text-sm mt-1.5 max-w-2xl" style={{ color: 'var(--clay-muted)' }}>
                  {app.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleShare}
                className="flex items-center justify-center h-9 w-9 rounded-2xl clay-sm bg-clay-blue/30 hover:bg-clay-blue/50 transition-all"
                title={runnerCopy.app.shareTitle}
                aria-label={runnerCopy.app.shareTitle}
              >
                {copiedShare ? (
                  <Check className="h-3.5 w-3.5" style={{ color: 'var(--clay-foreground)' }} />
                ) : (
                  <Share2 className="h-3.5 w-3.5" style={{ color: 'var(--clay-foreground)' }} />
                )}
              </button>
              <button
                onClick={toggleFullscreen}
                className="flex items-center justify-center h-9 w-9 rounded-2xl clay-sm bg-clay-peach/30 hover:bg-clay-peach/50 transition-all"
                title={fullscreen ? runnerCopy.app.exitFullscreen : runnerCopy.app.fullscreen}
                aria-label={fullscreen ? runnerCopy.app.exitFullscreen : runnerCopy.app.fullscreen}
              >
                {fullscreen ? (
                  <Minimize2 className="h-3.5 w-3.5" style={{ color: 'var(--clay-foreground)' }} />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" style={{ color: 'var(--clay-foreground)' }} />
                )}
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-[10px] px-3 py-0.5 rounded-full clay-sm bg-clay-yellow/30 flex items-center gap-1" style={{ color: 'var(--clay-foreground)' }}>
              <Sparkles className="h-2.5 w-2.5" />
              {runnerCopy.app.fieldsCount(app.fields.length)}
            </span>
            {hasLogicNodes && (
              <span className="text-[10px] px-3 py-0.5 rounded-full clay-sm bg-clay-blue/30 flex items-center gap-1" style={{ color: 'var(--clay-foreground)' }}>
                <Activity className="h-2.5 w-2.5" />
                {runnerCopy.app.logicNodesCount(app.logicNodes.length)}
              </span>
            )}
            {liveResult && liveResult.errors.length > 0 && (
              <span className="text-[10px] px-3 py-0.5 rounded-full clay-sm bg-clay-rose/40 flex items-center gap-1" style={{ color: 'var(--clay-foreground)' }}>
                <AlertCircle className="h-2.5 w-2.5" />
                {runnerCopy.app.issuesCount(liveResult.errors.length)}
              </span>
            )}
          </div>
        </div>

        {/* ── Main Layout: Form + Live Preview ───────────────────────────── */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* ── Form Column ────────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            <div className="clay-card overflow-visible p-5 md:p-6">
              {/* Empty state */}
              {!hasFields && (
                <div className="flex flex-col items-center justify-center py-16 clay-lg bg-clay-cream/60">
                  <AlertCircle className="h-10 w-10 mb-4" style={{ color: 'var(--clay-muted)' }} />
                  <p className="text-sm text-center max-w-xs" style={{ color: 'var(--clay-muted)' }}>
                    {runnerCopy.app.emptyFields}
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
                        'clay-sm bg-white p-4 md:p-5',
                        'animate-slide-up',
                        field.style?.borderRadius ? getFieldBorderRadius(field.style) : '',
                        field.style?.bgColor ? '' : 'bg-white',
                      )}
                      style={{
                        animationDelay: `${idx * 40}ms`,
                        animationFillMode: 'backwards',
                        backgroundColor: field.style?.bgColor || undefined,
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
                <div className="flex items-center gap-3 pt-6 mt-2 border-t border-clay-border/30">
                  <button
                    onClick={handleSubmit}
                    disabled={running}
                    className="flex items-center gap-2 min-w-[130px] h-11 px-6 text-sm font-medium clay-button bg-clay-purple disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ color: 'var(--clay-foreground)' }}
                  >
                    {running ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{runnerCopy.app.processing}</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 fill-current" />
                        <span>{hasLogicNodes ? runnerCopy.app.calculate : runnerCopy.app.submit}</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={running}
                    className="flex items-center gap-2 h-11 px-5 text-sm font-medium clay-button bg-clay-peach/50 hover:bg-clay-peach/70 disabled:opacity-60"
                    style={{ color: 'var(--clay-foreground)' }}
                  >
                    <RotateCcw className="h-4 w-4" />
                    {runnerCopy.app.reset}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Live Preview (desktop: sidebar, mobile: below) ────────────── */}
          <div className="lg:w-[340px] xl:w-[380px] shrink-0 lg:flex lg:flex-col">
            <div className="lg:sticky lg:top-24 lg:flex-1">
              <LivePreview
                values={values}
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
            <div className="clay-card overflow-hidden">
              <div className="p-0">
                {/* Results header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-clay-border/30 bg-clay-cream/40">
                  <div className="flex items-center gap-2.5">
                    {result && result.errors.length > 0 ? (
                      <div className="w-8 h-8 rounded-xl clay-sm bg-clay-rose/30 flex items-center justify-center">
                        <XCircle className="h-4 w-4" style={{ color: 'var(--clay-foreground)' }} />
                      </div>
                    ) : result ? (
                      <div className="w-8 h-8 rounded-xl clay-sm bg-clay-green/30 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4" style={{ color: 'var(--clay-foreground)' }} />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-xl clay-sm bg-clay-peach/30 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--clay-foreground)' }} />
                      </div>
                    )}
                    <div>
                      <span className="text-sm font-semibold" style={{ color: 'var(--clay-foreground)' }}>
                        {running
                          ? runnerCopy.app.processing
                          : result?.errors.length === 0
                            ? runnerCopy.app.success
                            : runnerCopy.app.validationErrors}
                      </span>
                      {result && (
                        <span className="text-[11px] ml-2" style={{ color: 'var(--clay-foreground)' }}>
                          {result.errors.length === 0
                            ? runnerCopy.app.allFieldsValid
                            : runnerCopy.app.errorsFound(result.errors.length)}
                        </span>
                      )}
                    </div>
                  </div>
                  {result && (
                    <button
                      onClick={() => {
                        const text = JSON.stringify({
                          inputs: result.inputs,
                          outputs: result.outputs,
                          errors: result.errors,
                        }, null, 2);
                        navigator.clipboard.writeText(text);
                      }}
                      className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-xs clay-sm bg-clay-blue/30 hover:bg-clay-blue/50 transition-all"
                      style={{ color: 'var(--clay-foreground)' }}
                    >
                      <Download className="h-3 w-3" />
                      {runnerCopy.app.export}
                    </button>
                  )}
                </div>

                {/* Results body */}
                {result && (
                  <div className="px-5 py-4 space-y-4">
                    {/* Errors section */}
                    {result.errors.length > 0 && (
                      <div className="rounded-xl clay-sm bg-clay-rose/15 p-4">
                        <ul className="space-y-1.5">
                          {result.errors.map((err, i) => (
                            <li
                              key={i}
                              className="text-xs flex items-start gap-2"
                              style={{ color: 'var(--clay-foreground)' }}
                            >
                              <span className="inline-block w-1.5 h-1.5 rounded-full bg-clay-rose/60 mt-1 shrink-0" />
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
                          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--clay-muted)' }}>
                            {runnerCopy.app.inputValues}
                          </span>
                          <button
                            onClick={() => setShowRaw(!showRaw)}
                            className="text-[10px] font-medium transition-colors clay-sm px-2 py-0.5 bg-clay-peach/30 hover:bg-clay-peach/50"
                            style={{ color: 'var(--clay-foreground)' }}
                          >
                            {showRaw ? runnerCopy.app.showFormatted : runnerCopy.app.showRaw}
                          </button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {app.fields.map((field) => {
                            const val = result.inputs[field.id];
                            return (
                              <div
                                key={field.id}
                                className={cn(
                                  'flex items-center justify-between p-2.5 rounded-xl clay-sm bg-clay-cream/60 group',
                                  'hover:bg-clay-cream/80 transition-all'
                                )}
                              >
                                <span className="text-xs truncate mr-3 font-medium" style={{ color: 'var(--clay-muted)' }}>
                                  {field.label}
                                </span>
                                <CopyValuePill
                                  value={showRaw ? JSON.stringify(val) : val}
                                  copied={copiedId === field.id}
                                  onCopy={() => handleCopyValue(val, field.id)}
                                />
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
                          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--clay-muted)' }}>
                            {runnerCopy.preview.computedResults}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full clay-sm bg-clay-purple/20" style={{ color: 'var(--clay-foreground)' }}>
                            {outputEntries.length}
                          </span>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {outputEntries.map(([key, val]) => (
                            <div
                              key={key}
                              className={cn(
                                'flex items-center justify-between p-2.5 rounded-xl clay-sm bg-clay-purple/5 group',
                                'hover:bg-clay-purple/10 transition-all'
                              )}
                            >
                              <span className="text-sm font-medium truncate mr-2" style={{ color: 'var(--clay-foreground)' }}>{key}</span>
                              <CopyValuePill
                                value={val}
                                copied={copiedId === key}
                                onCopy={() => handleCopyValue(val, key)}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Success with no outputs */}
                    {result.errors.length === 0 && outputEntries.length === 0 && (
                      <div className="flex flex-col items-center py-8 text-center">
                        <div className="w-14 h-14 rounded-full clay-sm bg-clay-green/30 flex items-center justify-center mb-3">
                          <CheckCircle2 className="h-7 w-7" style={{ color: 'var(--clay-foreground)' }} />
                        </div>
                        <p className="text-sm font-medium" style={{ color: 'var(--clay-foreground)' }}>{runnerCopy.app.formSubmitted}</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--clay-muted)' }}>{runnerCopy.app.allInputsValid}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Local helpers ───────────────────────────────────────────────────────────

