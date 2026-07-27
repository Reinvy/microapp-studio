/**
 * Form validation helpers for MicroApp Studio.
 */

/** Validate micro-app name (title) */
export function validateAppName(name: string): string | null {
  if (!name) return 'App name is required';
  if (name.length < 2) return 'App name must be at least 2 characters';
  if (name.length > 100) return 'App name must be at most 100 characters';
  if (!/^[a-zA-Z0-9\s\-_'’"“”!?,.()]+$/.test(name)) {
    return 'App name contains invalid characters';
  }
  return null;
}

/** Validate a form field label */
export function validateFieldLabel(label: string): string | null {
  if (!label) return 'Label is required';
  if (label.length < 1) return 'Label must be at least 1 character';
  if (label.length > 50) return 'Label must be at most 50 characters';
  if (!/^[a-zA-Z0-9\s\-_'’"“”!?,:()]+$/.test(label)) {
    return 'Label contains invalid characters';
  }
  return null;
}

/** Validate an AI prompt */
export function validatePrompt(prompt: string): string | null {
  if (!prompt) return 'Prompt is required';
  if (prompt.length < 10) return 'Prompt must be at least 10 characters';
  if (prompt.length > 2000) return 'Prompt must be at most 2,000 characters';
  return null;
}
