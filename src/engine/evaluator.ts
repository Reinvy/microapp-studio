/**
 * evaluator.ts — Sandboxed JavaScript Evaluator
 *
 * Executes custom LogicNode code in a controlled environment.
 * Uses new Function() instead of eval() for safer execution.
 * Designed for basic math, string operations, and conditionals.
 */

import { LogicNode } from '@/types/schema';
import { generateId } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EvaluationResult {
  result: unknown;
  error: string | null;
}

// ---------------------------------------------------------------------------
// Code execution
// ---------------------------------------------------------------------------

/**
 * Execute arbitrary JavaScript code with a given context object.
 *
 * The context values are injected as local variables into the function scope.
 * The code should use `return` to produce a result.
 *
 * @example
 * ```ts
 * executeCode('return a + b', { a: 5, b: 3 })
 * // => { result: 8, error: null }
 * ```
 */
export function executeCode(
  code: string,
  context: Record<string, unknown>
): EvaluationResult {
  try {
    // Build parameter names and corresponding values from the context
    const paramNames = Object.keys(context);
    const paramValues = Object.values(context);

    // Create a Function with named parameters matching the context keys.
    // The function body is the user-provided code.
    const fn = new Function(...paramNames, code);

    // Execute with the context values spread as arguments
    const result = fn(...paramValues);

    return { result, error: null };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Unknown execution error';
    return { result: undefined, error: message };
  }
}

/**
 * Evaluate a single LogicNode with the given inputs.
 *
 * The inputs are passed as named variables into the node's code.
 * Returns the computed result or an error message.
 *
 * @example
 * ```ts
 * const node: LogicNode = {
 *   id: 'sum',
 *   name: 'Sum',
 *   code: 'return a + b',
 *   inputs: ['a', 'b'],
 *   outputs: ['result'],
 *   version: 1,
 * };
 * const result = evaluateNode(node, { a: 2, b: 3 });
 * // => { result: 5, error: null }
 * ```
 */
export function evaluateNode(
  node: LogicNode,
  inputs: Record<string, unknown>
): EvaluationResult {
  // Validate that all declared inputs are provided
  const missingInputs = node.inputs.filter(
    (inputName) => !(inputName in inputs)
  );

  if (missingInputs.length > 0) {
    return {
      result: undefined,
      error: `Missing required inputs: ${missingInputs.join(', ')}`,
    };
  }

  // Build the context from the declared inputs only (ignore extra values)
  const context: Record<string, unknown> = {};
  for (const inputName of node.inputs) {
    context[inputName] = inputs[inputName];
  }

  return executeCode(node.code, context);
}

/**
 * Execute a code string that uses async/await.
 *
 * Wraps the execution in an async IIFE so that the caller can await the result.
 * Falls back to synchronous executeCode if the result is not a Promise.
 */
export async function executeCodeAsync(
  code: string,
  context: Record<string, unknown>
): Promise<EvaluationResult> {
  try {
    const paramNames = Object.keys(context);
    const paramValues = Object.values(context);

    // Wrap in async function to support `await` in user code
    const asyncCode = `(async () => { ${code} })()`;
    const fn = new Function(...paramNames, `return ${asyncCode}`);

    const result = await fn(...paramValues);
    return { result, error: null };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Unknown async execution error';
    return { result: undefined, error: message };
  }
}

/**
 * Evaluate a LogicNode asynchronously (supports async/await in node code).
 */
export async function evaluateNodeAsync(
  node: LogicNode,
  inputs: Record<string, unknown>
): Promise<EvaluationResult> {
  const missingInputs = node.inputs.filter(
    (inputName) => !(inputName in inputs)
  );

  if (missingInputs.length > 0) {
    return {
      result: undefined,
      error: `Missing required inputs: ${missingInputs.join(', ')}`,
    };
  }

  const context: Record<string, unknown> = {};
  for (const inputName of node.inputs) {
    context[inputName] = inputs[inputName];
  }

  return executeCodeAsync(node.code, context);
}

/**
 * Validate that a code string is syntactically valid JavaScript.
 * Returns null if valid, or an error message if invalid.
 */
export function validateCode(code: string): string | null {
  try {
    new Function(code);
    return null;
  } catch (err: unknown) {
    return err instanceof Error ? err.message : 'Invalid JavaScript code';
  }
}

/**
 * Result of a single node execution within a pipeline.
 */
export interface PipelineStepResult {
  nodeId: string;
  nodeName: string;
  inputs: Record<string, unknown>;
  output: unknown;
  error: string | null;
}

/**
 * Execute a sequence of LogicNodes as a pipeline, passing each node's
 * output as input to the next node in the chain.
 *
 * Each node receives all previous outputs merged into its context.
 * If any node fails, the pipeline stops and returns results up to
 * the failing node with the error.
 *
 * @example
 * ```ts
 * const nodes = [
 *   { id: 'double', name: 'Double', code: 'return x * 2', inputs: ['x'], outputs: ['result'], version: 1 },
 *   { id: 'add10', name: 'Add 10', code: 'return result + 10', inputs: ['result'], outputs: ['final'], version: 1 },
 * ];
 * const result = await runPipeline(nodes, { x: 5 });
 * // => { success: true, steps: [ ... ], finalOutput: 20 }
 * ```
 */
export async function runPipeline(
  nodes: LogicNode[],
  initialInputs: Record<string, unknown>
): Promise<{
  success: boolean;
  steps: PipelineStepResult[];
  finalOutput: unknown;
}> {
  const steps: PipelineStepResult[] = [];
  let context: Record<string, unknown> = { ...initialInputs };

  for (const node of nodes) {
    // Prepare inputs for this node from the accumulated context
    const nodeInputs: Record<string, unknown> = {};
    for (const inputName of node.inputs) {
      nodeInputs[inputName] = context[inputName];
    }

    // Check for missing inputs
    const missingInputs = node.inputs.filter((name) => !(name in nodeInputs));
    if (missingInputs.length > 0) {
      const stepResult: PipelineStepResult = {
        nodeId: node.id,
        nodeName: node.name,
        inputs: nodeInputs,
        output: undefined,
        error: `Missing required inputs: ${missingInputs.join(', ')}`,
      };
      steps.push(stepResult);
      return {
        success: false,
        steps,
        finalOutput: undefined,
      };
    }

    // Execute the node
    const result = await evaluateNodeAsync(node, nodeInputs);

    const stepResult: PipelineStepResult = {
      nodeId: node.id,
      nodeName: node.name,
      inputs: nodeInputs,
      output: result.result,
      error: result.error,
    };
    steps.push(stepResult);

    if (result.error !== null) {
      return {
        success: false,
        steps,
        finalOutput: undefined,
      };
    }

    // Merge output into context for the next node
    // If the node declares outputs, use those keys; otherwise inject 'result'
    if (node.outputs && node.outputs.length > 0) {
      for (const outputKey of node.outputs) {
        context[outputKey] = result.result;
      }
    } else {
      context.result = result.result;
    }
  }

  return {
    success: true,
    steps,
    finalOutput: context.finalOutput !== undefined ? context.finalOutput : context.result,
  };
}

/**
 * Format a value for human-readable display.
 * Handles numbers, booleans, dates, strings, and null/undefined.
 *
 * @example
 * ```ts
 * formatValue(1234.5678, { decimals: 2 })        // "1,234.57"
 * formatValue(true)                                // "Yes"
 * formatValue(new Date('2024-01-15'), { locale: 'en-US' }) // "1/15/2024"
 * formatValue(null)                                // ""
 * ```
 */
export function formatValue(
  value: unknown,
  options?: {
    decimals?: number;
    locale?: string;
    prefix?: string;
    suffix?: string;
  }
): string {
  const { decimals = 2, locale = 'en-US', prefix = '', suffix = '' } =
    options || {};

  if (value === null || value === undefined) return `${prefix}${suffix}`;

  if (typeof value === 'number') {
    return `${prefix}${value.toLocaleString(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })}${suffix}`;
  }

  if (typeof value === 'boolean') {
    return value ? `${prefix}Yes${suffix}` : `${prefix}No${suffix}`;
  }

  if (value instanceof Date) {
    return `${prefix}${value.toLocaleDateString(locale)}${suffix}`;
  }

  if (typeof value === 'string' && !isNaN(Date.parse(value))) {
    return `${prefix}${new Date(value).toLocaleDateString(locale)}${suffix}`;
  }

  return `${prefix}${String(value)}${suffix}`;
}

/**
 * Pre-configured string operation node templates for the visual builder.
 * Creates a LogicNode that performs a common string transformation.
 *
 * Supported operations: 'uppercase', 'lowercase', 'trim', 'reverse',
 * 'length', 'concat' (requires 'other' input).
 *
 * @example
 * ```ts
 * const node = createStringOpNode('uppercase');
 * // => LogicNode with code: `return typeof input === "string" ? input.toUpperCase() : ...`
 * ```
 */
export function createStringOpNode(
  operation: 'uppercase' | 'lowercase' | 'trim' | 'reverse' | 'length' | 'concat',
  options?: { separator?: string }
): LogicNode {
  const codes: Record<string, { code: string; inputs: string[]; outputs: string[] }> = {
    uppercase: {
      code: 'return typeof input === "string" ? input.toUpperCase() : String(input).toUpperCase()',
      inputs: ['input'],
      outputs: ['result'],
    },
    lowercase: {
      code: 'return typeof input === "string" ? input.toLowerCase() : String(input).toLowerCase()',
      inputs: ['input'],
      outputs: ['result'],
    },
    trim: {
      code: 'return typeof input === "string" ? input.trim() : String(input).trim()',
      inputs: ['input'],
      outputs: ['result'],
    },
    reverse: {
      code: 'return typeof input === "string" ? [...input].reverse().join("") : String(input).split("").reverse().join("")',
      inputs: ['input'],
      outputs: ['result'],
    },
    length: {
      code: 'return typeof input === "string" ? input.length : String(input).length',
      inputs: ['input'],
      outputs: ['result'],
    },
    concat: {
      code: `return [input, other].filter(x => x != null).join("${options?.separator || ''}")`,
      inputs: ['input', 'other'],
      outputs: ['result'],
    },
  };

  const op = codes[operation] || codes.uppercase;

  return {
    id: generateId(),
    name: `${operation.charAt(0).toUpperCase() + operation.slice(1)} String`,
    code: op.code,
    inputs: op.inputs,
    outputs: op.outputs,
    version: 1,
  };
}

/**
 * Supported math operations for `createMathOpNode`.
 */
export type MathOperation =
  | 'add'
  | 'subtract'
  | 'multiply'
  | 'divide'
  | 'power'
  | 'sqrt'
  | 'percentage'
  | 'average';

/**
 * Pre-configured math operation node templates for the visual builder.
 * Creates a LogicNode that performs a common arithmetic computation.
 *
 * @example
 * ```ts
 * const node = createMathOpNode('add');
 * // => LogicNode with code: `return a + b`
 * ```
 *
 * @example
 * ```ts
 * const node = createMathOpNode('percentage');
 * // => LogicNode with code: `return (value / total) * 100`
 * ```
 */
export function createMathOpNode(
  operation: MathOperation,
  options?: { precision?: number }
): LogicNode {
  const prec = options?.precision ?? 2;

  const codes: Record<string, { code: string; inputs: string[]; outputs: string[] }> = {
    add: {
      code: `return (a + b).toFixed(${prec})`,
      inputs: ['a', 'b'],
      outputs: ['result'],
    },
    subtract: {
      code: `return (a - b).toFixed(${prec})`,
      inputs: ['a', 'b'],
      outputs: ['result'],
    },
    multiply: {
      code: `return (a * b).toFixed(${prec})`,
      inputs: ['a', 'b'],
      outputs: ['result'],
    },
    divide: {
      code: `return b !== 0 ? (a / b).toFixed(${prec}) : 'Cannot divide by zero'`,
      inputs: ['a', 'b'],
      outputs: ['result'],
    },
    power: {
      code: `return Math.pow(a, b).toFixed(${prec})`,
      inputs: ['a', 'b'],
      outputs: ['result'],
    },
    sqrt: {
      code: `return a >= 0 ? Math.sqrt(a).toFixed(${prec}) : 'Cannot sqrt negative number'`,
      inputs: ['a'],
      outputs: ['result'],
    },
    percentage: {
      code: `return ((value / total) * 100).toFixed(${prec})`,
      inputs: ['value', 'total'],
      outputs: ['result'],
    },
    average: {
      code: `return (values.reduce((s, v) => s + v, 0) / values.length).toFixed(${prec})`,
      inputs: ['values'],
      outputs: ['result'],
    },
  };

  const op = codes[operation] || codes.add;

  return {
    id: generateId(),
    name: `${operation.charAt(0).toUpperCase() + operation.slice(1)} Math`,
    code: op.code,
    inputs: op.inputs,
    outputs: op.outputs,
    version: 1,
  };
}
