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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="flex items-center justify-between h-12 px-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary/10 text-primary">
                <Code2 className="h-3.5 w-3.5" />
              </div>
              <span className="text-sm font-medium">Dev Playground</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] h-5">
              {logicNodes.length} saved node{logicNodes.length !== 1 ? 's' : ''}
            </Badge>
            {activeApp && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1.5"
                onClick={() => router.push(`/builder?id=${activeApp.id}`)}
              >
                Back to Builder
              </Button>
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
              <Input
                value={nodeName}
                onChange={(e) => setNodeName(e.target.value)}
                placeholder="Node name"
                className="h-9 text-sm font-medium"
              />
            </div>
            <Button
              variant="default"
              size="sm"
              className="h-9 gap-1.5 text-xs shrink-0"
              onClick={handleSaveNode}
              disabled={!activeApp || saving}
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : saved ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {saved ? 'Saved!' : saving ? 'Saving...' : activeApp ? 'Save Node' : 'No App Selected'}
            </Button>
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
          <Card className="border-border/30">
            <CardContent className="p-3">
              <div className="flex items-start gap-3">
                <Book className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    <strong>Inputs</strong> are available as variables:{' '}
                    {inputNames.map((name) => (
                      <code
                        key={name}
                        className="bg-muted px-1 py-0.5 rounded text-[11px] font-mono"
                      >
                        {name}
                      </code>
                    ))}
                  </p>
                  <p>Use <code className="bg-muted px-1 py-0.5 rounded text-[11px] font-mono">return</code> to output a value.</p>
                  <p>Press <kbd className="bg-muted px-1 py-0.5 rounded text-[11px] font-mono">⌘+Enter</kbd> or <kbd className="bg-muted px-1 py-0.5 rounded text-[11px] font-mono">Ctrl+Enter</kbd> to run test.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <aside className="w-80 border-l border-border/50 bg-card/50 flex flex-col overflow-hidden">
          {/* Test input panel */}
          <div className="border-b border-border/50">
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Test Input
                </span>
              </div>
              <Button
                variant="default"
                size="sm"
                className="h-7 gap-1 text-[11px] px-2"
                onClick={handleRunTest}
                disabled={testing}
              >
                {testing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Play className="h-3 w-3 fill-current" />
                )}
                Run
              </Button>
            </div>
            <div className="px-3 pb-3">
              <textarea
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-xs font-mono shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                placeholder='{"key": "value"}'
              />
            </div>
          </div>

          {/* Output */}
          <div className="border-b border-border/50">
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2">
                <Variable className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Output
                </span>
              </div>
              {testResult && (
                <Badge
                  variant={testResult.error ? 'destructive' : 'secondary'}
                  className="text-[9px] h-4 px-1.5"
                >
                  {testResult.error ? 'Error' : 'Success'}
                </Badge>
              )}
            </div>
            <div className="px-3 pb-3">
              {testResult ? (
                <div
                  className={cn(
                    'w-full min-h-[60px] rounded-md border px-3 py-2 text-xs font-mono',
                    testResult.error
                      ? 'border-destructive/30 bg-destructive/5 text-destructive'
                      : 'border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400'
                  )}
                >
                  {testResult.error
                    ? testResult.error
                    : typeof testResult.result === 'object'
                    ? JSON.stringify(testResult.result, null, 2)
                    : String(testResult.result)}
                </div>
              ) : (
                <div className="w-full min-h-[60px] rounded-md border border-dashed border-border/30 bg-muted/20 flex items-center justify-center">
                  <span className="text-[11px] text-muted-foreground">
                    Run a test to see output
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* IO Configuration */}
          <div className="px-3 py-2 border-b border-border/50">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Output Names
              </span>
            </div>
            <Input
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
              className="h-7 text-xs font-mono"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Comma-separated output variable names
            </p>
          </div>

          {/* Saved nodes */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-3 py-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Saved Nodes
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {logicNodes.length}
                </span>
              </div>

              {logicNodes.length === 0 && (
                <div className="text-center py-8">
                  <Code2 className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">
                    No saved nodes yet
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Write code and click Save Node
                  </p>
                </div>
              )}

              <div className="space-y-2">
                {logicNodes.map((node) => (
                  <Card key={node.id} className="border-border/30">
                    <CardContent className="p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium truncate">
                              {node.name}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[9px] h-4 px-1 font-normal"
                            >
                              v{node.version}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] text-muted-foreground">
                              In: {node.inputs.join(', ') || 'none'}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              Out: {node.outputs.join(', ') || 'none'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground"
                            onClick={() => {
                              setCode(node.code);
                              setNodeName(node.name);
                              setInputNames(node.inputs);
                              setOutputNames(node.outputs);
                            }}
                          >
                            <Code2 className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteNode(node.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
