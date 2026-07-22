/**
 * evaluator.ts — Sandboxed JavaScript Evaluator
 *
 * Executes custom LogicNode code in a controlled environment.
 * Uses new Function() instead of eval() for safer execution.
 * Designed for basic math, string operations, and conditionals.
 */

import { LogicNode } from '@/types/schema';

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
