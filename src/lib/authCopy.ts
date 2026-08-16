/**
 * authCopy — centralized UI copy for the auth pages (login / register).
 *
 * Mirrors `builderCopy` / `runnerCopy` / `dashboardCopy`: form-logic copy
 * (validation messages, API-error fallbacks, ARIA labels) lives in a config
 * module so no page hardcodes its own strings. The user-visible labels and
 * placeholders stay DB-driven via contentRepo ('auth-copy') — validation
 * messages are tightly coupled to form rules, so they belong here, not in
 * the content DB.
 */

export const authCopy = {
  /** Client-side form validation messages (login + register rules). */
  validation: {
    nameRequired: 'Name is required',
    nameTooShort: 'Name must be at least 2 characters',
    emailRequired: 'Email is required',
    emailInvalid: 'Invalid email format',
    passwordRequired: 'Password is required',
    passwordTooShort: 'Password must be at least 6 characters',
    confirmMismatch: 'Passwords do not match',
    termsRequired: 'You must agree to the terms',
  },

  /** Fallback error strings surfaced when the auth API returns no message. */
  apiError: {
    loginFailed: 'Invalid credentials. Please try again.',
    registerFailed: 'Registration failed. Please try again.',
    unexpected: 'An unexpected error occurred. Please try again.',
  },

  /** ARIA / icon-button labels. */
  aria: {
    showPassword: 'Show password',
    hidePassword: 'Hide password',
  },
} as const;