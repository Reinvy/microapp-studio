/**
 * schemaEngine.ts — Schema Execution Engine
 *
 * Takes an AppSchema + input values, validates fields, runs logic nodes,
 * and produces a complete EngineResult with inputs, outputs, and errors.
 */

import { AppSchema, EngineResult, FieldSchema } from '@/types/schema';
import { evaluateNode, evaluateNodeAsync } from './evaluator';

// ---------------------------------------------------------------------------
// Field validation
// ---------------------------------------------------------------------------

/**
 * Validate a single field value against its FieldSchema definition.
 *
 * Returns an error message string if validation fails, or `null` if valid.
 */
export function validateField(
  field: FieldSchema,
  value: unknown
): string | null {
  const label = field.label || field.id;

  // --- Required check ---
  if (field.required) {
    if (value === undefined || value === null) {
      return `${label} is required`;
    }

    if (typeof value === 'string' && value.trim().length === 0) {
      return `${label} is required`;
    }

    if (typeof value === 'number' && isNaN(value)) {
      return `${label} must be a valid number`;
    }

    // Checkbox/toggle: false is a valid value for required checkbox
    if (field.type === 'checkbox' || field.type === 'toggle') {
      if (value === false || value === 'false' || value === 0) {
        return `${label} must be checked`;
      }
    }
  }

  // If no value provided and not required, skip further validation
  if (value === undefined || value === null || value === '') {
    return null;
  }

  // --- Type-specific validation ---

  switch (field.type) {
    case 'text':
    case 'textarea': {
      const str = String(value);
      if (field.validation?.minLength !== undefined && str.length < field.validation.minLength) {
        return (
          field.validation.message ||
          `${label} must be at least ${field.validation.minLength} characters`
        );
      }
      if (field.validation?.maxLength !== undefined && str.length > field.validation.maxLength) {
        return (
          field.validation.message ||
          `${label} must be no more than ${field.validation.maxLength} characters`
        );
      }
      if (field.validation?.pattern) {
        try {
          const re = new RegExp(field.validation.pattern);
          if (!re.test(str)) {
            return (
              field.validation.message || `${label} has an invalid format`
            );
          }
        } catch {
          // If the regex is invalid, skip pattern validation
        }
      }
      break;
    }

    case 'number':
    case 'slider': {
      const num = Number(value);
      if (isNaN(num)) {
        return `${label} must be a valid number`;
      }
      if (field.min !== undefined && num < field.min) {
        return `${label} must be at least ${field.min}`;
      }
      if (field.max !== undefined && num > field.max) {
        return `${label} must be no more than ${field.max}`;
      }
      if (field.step !== undefined) {
        // Check if value is a multiple of step (with floating point tolerance)
        const remainder = Math.abs(num - (field.min ?? 0)) % Math.abs(field.step);
        if (remainder > 0.0001 && Math.abs(remainder - Math.abs(field.step)) > 0.0001) {
          return `${label} must be in increments of ${field.step}`;
        }
      }
      break;
    }

    case 'select': {
      const str = String(value);
      if (field.options && field.options.length > 0) {
        const matched = field.options.some(
          (opt) => opt.toLowerCase() === str.toLowerCase()
        );
        if (!matched) {
          return `${label} must be one of: ${field.options.join(', ')}`;
        }
      }
      break;
    }

    case 'date': {
      const str = String(value);
      // Accept various date formats
      const date = new Date(str);
      if (isNaN(date.getTime())) {
        return `${label} must be a valid date`;
      }
      break;
    }

    case 'checkbox':
    case 'toggle': {
      // Coerce to truthy/falsy — no further validation needed
      break;
    }

    case 'file': {
      // Files are validated at the point of selection; accept any truthy value
      if (!value) {
        return `${label} must be a valid file`;
      }
      break;
    }

    default:
      break;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Schema execution
// ---------------------------------------------------------------------------

/**
 * Execute an AppSchema with the given input values.
 *
 * Steps:
 * 1. Validate each field's input against its schema definition.
 * 2. Collect validated inputs into a running context.
 * 3. Execute each LogicNode in order, passing the current context.
 * 4. Merge node outputs back into the context.
 * 5. Return inputs, final outputs, and any errors.
 *
 * Fields not present in `values` use their defaultValue, or remain undefined.
 */
export function executeSchema(
  schema: AppSchema,
  values: Record<string, unknown>
): EngineResult {
  const inputs: Record<string, unknown> = {};
  const outputs: Record<string, unknown> = {};
  const errors: string[] = [];

  // --- Phase 1: Field validation ---
  for (const field of schema.fields) {
    let value = values[field.id];

    // Apply default value if not provided
    if (value === undefined || value === null || value === '') {
      if (field.defaultValue !== undefined) {
        value = field.defaultValue;
      }
    }

    // Validate
    const error = validateField(field, value);
    if (error) {
      errors.push(error);
    }

    // Store the (possibly defaulted) value regardless of validation
    inputs[field.id] = value ?? null;
  }

  // --- Phase 2: Logic node execution ---
  // Build a combined context from inputs and any computed outputs
  const context: Record<string, unknown> = { ...inputs, ...outputs };

  for (const node of schema.logicNodes) {
    // Build the node's input values from the current context
    const nodeInputs: Record<string, unknown> = {};
    for (const inputName of node.inputs) {
      nodeInputs[inputName] = context[inputName];
    }

    // Execute the node
    const { result, error } = evaluateNode(node, nodeInputs);

    if (error) {
      errors.push(`Error in node "${node.name || node.id}": ${error}`);
      // Continue execution of subsequent nodes
      continue;
    }

    // Map outputs: if the node declares output names, assign them by index
    // from the return value. If it declares a single output, the result IS
    // that output. If it declares multiple outputs, we expect an array or object.
    if (node.outputs.length > 0) {
      if (node.outputs.length === 1) {
        // Single output: result becomes the output value directly
        const outputName = node.outputs[0];
        outputs[outputName] = result;
        context[outputName] = result;
      } else if (Array.isArray(result)) {
        // Multiple outputs from an array result, positionally
        node.outputs.forEach((outputName, idx) => {
          const val = idx < (result as unknown[]).length ? (result as unknown[])[idx] : undefined;
          outputs[outputName] = val;
          context[outputName] = val;
        });
      } else if (typeof result === 'object' && result !== null) {
        // Multiple outputs from an object result, keyed by name
        const resultObj = result as Record<string, unknown>;
        for (const outputName of node.outputs) {
          const val = outputName in resultObj ? resultObj[outputName] : undefined;
          outputs[outputName] = val;
          context[outputName] = val;
        }
      } else {
        // Fallback: assign the same result to all declared outputs
        for (const outputName of node.outputs) {
          outputs[outputName] = result;
          context[outputName] = result;
        }
      }
    }
  }

  return { inputs, outputs, errors };
}

/**
 * Async variant of executeSchema — supports LogicNode code that uses
 * async/await internally.
 */
export async function executeSchemaAsync(
  schema: AppSchema,
  values: Record<string, unknown>
): Promise<EngineResult> {
  const inputs: Record<string, unknown> = {};
  const outputs: Record<string, unknown> = {};
  const errors: string[] = [];

  // --- Phase 1: Field validation (sync) ---
  for (const field of schema.fields) {
    let value = values[field.id];

    if (value === undefined || value === null || value === '') {
      if (field.defaultValue !== undefined) {
        value = field.defaultValue;
      }
    }

    const error = validateField(field, value);
    if (error) {
      errors.push(error);
    }

    inputs[field.id] = value ?? null;
  }

  // --- Phase 2: Async logic node execution ---
  const context: Record<string, unknown> = { ...inputs, ...outputs };

  for (const node of schema.logicNodes) {
    const nodeInputs: Record<string, unknown> = {};
    for (const inputName of node.inputs) {
      nodeInputs[inputName] = context[inputName];
    }

    const { result, error } = await evaluateNodeAsync(node, nodeInputs);

    if (error) {
      errors.push(`Error in node "${node.name || node.id}": ${error}`);
      continue;
    }

    if (node.outputs.length > 0) {
      if (node.outputs.length === 1) {
        const outputName = node.outputs[0];
        outputs[outputName] = result;
        context[outputName] = result;
      } else if (Array.isArray(result)) {
        node.outputs.forEach((outputName, idx) => {
          const val = idx < (result as unknown[]).length ? (result as unknown[])[idx] : undefined;
          outputs[outputName] = val;
          context[outputName] = val;
        });
      } else if (typeof result === 'object' && result !== null) {
        const resultObj = result as Record<string, unknown>;
        for (const outputName of node.outputs) {
          const val = outputName in resultObj ? resultObj[outputName] : undefined;
          outputs[outputName] = val;
          context[outputName] = val;
        }
      } else {
        for (const outputName of node.outputs) {
          outputs[outputName] = result;
          context[outputName] = result;
        }
      }
    }
  }

  return { inputs, outputs, errors };
}

/**
 * Quick validation for a set of field values against a schema.
 * Returns only the errors (or empty array if all valid).
 */
export function validateSchemaInputs(
  schema: AppSchema,
  values: Record<string, unknown>
): string[] {
  const errors: string[] = [];

  for (const field of schema.fields) {
    const error = validateField(field, values[field.id]);
    if (error) {
      errors.push(error);
    }
  }

  return errors;
}
