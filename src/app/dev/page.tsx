'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Code2,
  ArrowLeft,
  Save,
  Trash2,
  Play,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  Terminal,
  Book,
  Variable,
} from 'lucide-react';
import type { LogicNode } from '@/types/schema';
import { useAppStore } from '@/store/appStore';
import { executeCode } from '@/engine/evaluator';
import { generateId } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import MonacoEditor from '@/components/dev/MonacoEditor';
import { cn } from '@/lib/utils';

const DEFAULT_CODE = `// Custom JS Logic Node
// Use 'return' to output results.
// Inputs are available as variables.
//
// Example: Simple calculator
// return input1 + input2;

return inputs?.value1 + inputs?.value2;`;

const DEFAULT_TEST_INPUT = JSON.stringify({ value1: 10, value2: 20 }, null, 2);

export default function DevPage() {
  const router = useRouter();
  const { activeApp, addLogicNode, updateLogicNode, removeLogicNode } = useAppStore();

  const [code, setCode] = useState(DEFAULT_CODE);
  const [nodeName, setNodeName] = useState('My Custom Node');
  const [testInput, setTestInput] = useState(DEFAULT_TEST_INPUT);
  const [testResult, setTestResult] = useState<{
    result: unknown;
    error: string | null;
  } | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [inputNames, setInputNames] = useState<string[]>(['value1', 'value2']);
  const [outputNames, setOutputNames] = useState<string[]>(['result']);

  // Parse input names from test input
  useEffect(() => {
    try {
      const parsed = JSON.parse(testInput || '{}');
      const names = Object.keys(parsed);
      if (names.length > 0) {
        setInputNames(names);
      }
    } catch {
      // ignore parse errors
    }
  }, [testInput]);

  const handleRunTest = useCallback(() => {
    setTesting(true);
    setTestResult(null);

    setTimeout(() => {
      try {
        const context = JSON.parse(testInput || '{}');
        const result = executeCode(code, context);
        setTestResult(result);
      } catch (err) {
        setTestResult({
          result: undefined,
          error: err instanceof Error ? err.message : 'Failed to parse test input',
        });
      }
      setTesting(false);
    }, 100);
  }, [code, testInput]);

  const handleSaveNode = useCallback(() => {
    if (!activeApp) return;
    setSaving(true);

    const newNode: LogicNode = {
      id: generateId(),
      name: nodeName.trim() || 'Unnamed Node',
      code,
      inputs: inputNames,
      outputs: outputNames,
      version: 1,
    };

    addLogicNode(newNode);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [activeApp, nodeName, code, inputNames, outputNames, addLogicNode]);

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      removeLogicNode(nodeId);
    },
    [removeLogicNode]
  );

  const logicNodes = activeApp?.logicNodes || [];

  return (
    <div className="min-h-screen bg-clay-cream flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 clay-card rounded-none border-b border-clay-border/30">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/')}
              className="flex items-center justify-center h-9 w-9 rounded-full clay-sm bg-clay-peach/50 hover:bg-clay-peach/70 transition-all"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-4 w-4" style={{ color: '#5D4E37' }} />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-xl bg-clay-purple/30">
                <Code2 className="h-3.5 w-3.5" style={{ color: '#5D4E37' }} />
              </div>
              <span className="text-sm font-medium" style={{ color: '#5D4E37' }}>Dev Playground</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] px-3 py-0.5 rounded-full clay-sm bg-clay-yellow/30" style={{ color: '#5D4E37' }}>
              {logicNodes.length} saved node{logicNodes.length !== 1 ? 's' : ''}
            </span>
            {activeApp && (
              <button
                onClick={() => router.push(`/builder?id=${activeApp.id}`)}
                className="h-8 px-3 rounded-xl text-xs font-medium clay-sm bg-clay-blue/30 hover:bg-clay-blue/50 transition-all"
                style={{ color: '#5D4E37' }}
              >
                Back to Builder
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main editor section */}
        <div className="flex-1 flex flex-col overflow-hidden p-4 gap-4">
          {/* Node name */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <input
                value={nodeName}
                onChange={(e) => setNodeName(e.target.value)}
                placeholder="Node name"
                className="clay-input h-10 text-sm font-medium w-full px-4"
              />
            </div>
            <button
              onClick={handleSaveNode}
              disabled={!activeApp || saving}
              className="h-10 px-4 rounded-xl text-xs font-medium clay-button bg-clay-green/50 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              style={{ color: '#5D4E37' }}
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : saved ? (
                <CheckCircle2 className="h-3.5 w-3.5" style={{ color: '#5D4E37' }} />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {saved ? 'Saved!' : saving ? 'Saving...' : activeApp ? 'Save Node' : 'No App Selected'}
            </button>
          </div>

          {/* Editor */}
          <div className="flex-1 min-h-0">
            <MonacoEditor
              code={code}
              onChange={setCode}
              height="100%"
              testContext={(() => {
                try {
                  return JSON.parse(testInput || '{}');
                } catch {
                  return {};
                }
              })()}
            />
          </div>

          {/* Quick reference */}
          <div className="clay-sm bg-clay-yellow/20 p-3">
            <div className="flex items-start gap-3">
              <Book className="h-4 w-4 mt-0.5" style={{ color: '#B8A898' }} />
              <div className="text-xs space-y-1" style={{ color: '#5D4E37' }}>
                <p>
                  <strong>Inputs</strong> are available as variables:{' '}
                  {inputNames.map((name) => (
                    <code
                      key={name}
                      className="clay-sm px-1.5 py-0.5 text-[11px] font-mono bg-clay-cream"
                      style={{ color: '#5D4E37' }}
                    >
                      {name}
                    </code>
                  ))}
                </p>
                <p>Use <code className="clay-sm px-1.5 py-0.5 text-[11px] font-mono bg-clay-cream" style={{ color: '#5D4E37' }}>return</code> to output a value.</p>
                <p>Press <kbd className="clay-sm px-1.5 py-0.5 text-[11px] font-mono bg-clay-cream" style={{ color: '#5D4E37' }}>⌘+Enter</kbd> or <kbd className="clay-sm px-1.5 py-0.5 text-[11px] font-mono bg-clay-cream" style={{ color: '#5D4E37' }}>Ctrl+Enter</kbd> to run test.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <aside className="w-80 clay-card rounded-none rounded-l-2xl flex flex-col overflow-hidden" style={{ backgroundColor: '#FFFFFFF0' }}>
          {/* Test input panel */}
          <div className="border-b border-clay-border/30">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4" style={{ color: '#B8A898' }} />
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#5D4E37' }}>
                  Test Input
                </span>
              </div>
              <button
                onClick={handleRunTest}
                disabled={testing}
                className="h-8 px-3 rounded-xl text-[11px] font-medium clay-button bg-clay-purple/50 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                style={{ color: '#5D4E37' }}
              >
                {testing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Play className="h-3 w-3 fill-current" />
                )}
                Run
              </button>
            </div>
            <div className="px-4 pb-4">
              <textarea
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                className="w-full min-h-[120px] clay-input px-3 py-2 text-xs font-mono resize-none"
                placeholder='{"key": "value"}'
              />
            </div>
          </div>

          {/* Output */}
          <div className="border-b border-clay-border/30">
            <div className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <Variable className="h-4 w-4" style={{ color: '#B8A898' }} />
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#5D4E37' }}>
                  Output
                </span>
              </div>
              {testResult && (
                <span
                  className={cn(
                    'text-[9px] px-2 py-0.5 rounded-full clay-sm',
                    testResult.error ? 'bg-clay-rose/40' : 'bg-clay-green/40'
                  )}
                  style={{ color: '#5D4E37' }}
                >
                  {testResult.error ? 'Error' : 'Success'}
                </span>
              )}
            </div>
            <div className="px-4 pb-4">
              {testResult ? (
                <div
                  className={cn(
                    'w-full min-h-[60px] clay-sm px-3 py-2 text-xs font-mono',
                    testResult.error
                      ? 'bg-clay-rose/15'
                      : 'bg-clay-green/15'
                  )}
                  style={{ color: '#5D4E37' }}
                >
                  {testResult.error
                    ? testResult.error
                    : typeof testResult.result === 'object'
                    ? JSON.stringify(testResult.result, null, 2)
                    : String(testResult.result)}
                </div>
              ) : (
                <div className="w-full min-h-[60px] clay-inset bg-clay-cream/50 flex items-center justify-center">
                  <span className="text-[11px]" style={{ color: '#B8A898' }}>
                    Run a test to see output
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* IO Configuration */}
          <div className="px-4 py-3 border-b border-clay-border/30">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#5D4E37' }}>
                Output Names
              </span>
            </div>
            <input
              value={outputNames.join(', ')}
              onChange={(e) =>
                setOutputNames(
                  e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean)
                )
              }
              placeholder="result, total"
              className="clay-input h-8 text-xs font-mono w-full px-3"
            />
            <p className="text-[10px] mt-1" style={{ color: '#B8A898' }}>
              Comma-separated output variable names
            </p>
          </div>

          {/* Saved nodes */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium uppercase tracking-wider" style={{ color: '#5D4E37' }}>
                  Saved Nodes
                </span>
                <span className="text-[10px]" style={{ color: '#B8A898' }}>
                  {logicNodes.length}
                </span>
              </div>

              {logicNodes.length === 0 && (
                <div className="text-center py-8">
                  <Code2 className="h-6 w-6 mx-auto mb-2" style={{ color: '#B8A898' }} />
                  <p className="text-xs" style={{ color: '#B8A898' }}>
                    No saved nodes yet
                  </p>
                  <p className="text-[10px] mt-1" style={{ color: '#B8A898' }}>
                    Write code and click Save Node
                  </p>
                </div>
              )}

              <div className="space-y-2">
                {logicNodes.map((node) => (
                  <div key={node.id} className="clay-sm bg-clay-cream/60 p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium truncate" style={{ color: '#5D4E37' }}>
                            {node.name}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full clay-sm bg-clay-purple/20" style={{ color: '#5D4E37' }}>
                            v{node.version}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px]" style={{ color: '#B8A898' }}>
                            In: {node.inputs.join(', ') || 'none'}
                          </span>
                          <span className="text-[10px]" style={{ color: '#B8A898' }}>
                            Out: {node.outputs.join(', ') || 'none'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          className="flex items-center justify-center h-7 w-7 rounded-xl clay-sm bg-clay-blue/30 hover:bg-clay-blue/50 transition-all"
                          onClick={() => {
                            setCode(node.code);
                            setNodeName(node.name);
                            setInputNames(node.inputs);
                            setOutputNames(node.outputs);
                          }}
                          aria-label={`Load ${node.name} into editor`}
                        >
                          <Code2 className="h-3 w-3" style={{ color: '#5D4E37' }} />
                        </button>
                        <button
                          className="flex items-center justify-center h-7 w-7 rounded-xl clay-sm bg-clay-rose/30 hover:bg-clay-rose/50 transition-all"
                          onClick={() => handleDeleteNode(node.id)}
                          aria-label={`Delete ${node.name}`}
                        >
                          <Trash2 className="h-3 w-3" style={{ color: '#5D4E37' }} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
