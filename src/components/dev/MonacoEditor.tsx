'use client';

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { Play, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { executeCode } from '@/engine/evaluator';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MonacoEditorInner = dynamic(
  () => import('@monaco-editor/react').then((mod) => mod.default),
  { ssr: false }
);

interface MonacoEditorProps {
  code: string;
  onChange: (code: string) => void;
  height?: string | number;
  language?: string;
  testContext?: Record<string, unknown>;
}

export default function MonacoEditor({
  code,
  onChange,
  height = 400,
  language = 'javascript',
  testContext,
}: MonacoEditorProps) {
  const [testResult, setTestResult] = useState<{
    result: unknown;
    error: string | null;
  } | null>(null);
  const [testing, setTesting] = useState(false);

  const handleEditorMount = useCallback((editor: unknown) => {
    const ed = editor as any;
    if (ed?.updateOptions) {
      ed.updateOptions({
        minimap: { enabled: true },
        fontSize: 13,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        wordWrap: 'on',
        padding: { top: 8 },
      });
    }
  }, []);

  const handleRunTest = useCallback(() => {
    setTesting(true);
    setTestResult(null);

    setTimeout(() => {
      const context = testContext || { input: 'test' };
      const result = executeCode(code, context);
      setTestResult(result);
      setTesting(false);
    }, 100);
  }, [code, testContext]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRunTest();
      }
    },
    [handleRunTest]
  );

  return (
    <div className="flex flex-col h-full overflow-hidden clay-card rounded-lg overflow-hidden" onKeyDown={handleKeyDown}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-clay-border/30 bg-clay-cream/40">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--clay-foreground)' }}>
            {language === 'javascript' ? 'JavaScript' : language}
          </span>
          <span className="text-[10px]" style={{ color: 'var(--clay-muted)' }}>
            {code.split('\n').length} lines
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleRunTest}
            disabled={testing}
            className="flex items-center gap-1.5 h-8 px-3 rounded-xl text-[11px] font-medium clay-button bg-clay-purple/40 hover:bg-clay-purple/60 transition-all disabled:opacity-50"
            style={{ color: 'var(--clay-foreground)' }}
          >
            {testing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Play className="h-3 w-3 fill-current" />
            )}
            Run Test
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0 clay-inset" style={{ height: typeof height === 'number' ? height : parseInt(height) }}>
        <MonacoEditorInner
          height="100%"
          language={language}
          value={code}
          onChange={(val: string | undefined) => onChange(val || '')}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: true },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            padding: { top: 8 },
          }}
        />
      </div>

      {/* Result panel */}
      {testResult !== null && (
        <div
          className={cn(
            'px-3 py-2.5 border-t flex items-start gap-2 text-xs',
            testResult.error
              ? 'border-clay-rose/30 bg-clay-rose/10'
              : 'border-clay-green/30 bg-clay-green/10'
          )}
          style={{ color: 'var(--clay-foreground)' }}
        >
          {testResult.error ? (
            <>
              <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: '#FFD0D0' }} />
              <div>
                <span className="font-medium">Error: </span>
                {testResult.error}
              </div>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: '#C5F0D5' }} />
              <div>
                <span className="font-medium">Result: </span>
                <code className="clay-sm bg-white/60 px-1.5 py-0.5 rounded-lg font-mono text-[11px]" style={{ color: 'var(--clay-foreground)' }}>
                  {typeof testResult.result === 'object'
                    ? JSON.stringify(testResult.result, null, 2)
                    : String(testResult.result)}
                </code>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
