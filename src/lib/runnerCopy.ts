/**
 * runnerCopy — centralized UI copy for the app runner.
 *
 * Mirrors `builderCopy`: the runner is tool chrome (like a design app), not
 * site content, so its labels live in a config module rather than the content
 * DB — a single source of truth so no component hardcodes its own strings,
 * and copy edits / future i18n touch exactly one file.
 */

export const runnerCopy = {
  /** Run page shell (loading / error states, top bar) */
  page: {
    dashboard: 'Dashboard',
    openInBuilder: 'Open in Builder',
    loadingApp: 'Loading app...',
    preparingRunner: 'Preparing runner...',
    noAppId: 'No app ID provided.',
    appNotFound: 'App not found. It may have been deleted.',
    loadFailed: 'Failed to load the app. Please try again.',
    errorTitle: 'App not found',
    errorGeneric: 'Something went wrong.',
    backToDashboard: 'Back to Dashboard',
    tryAgain: 'Try Again',
  },

  /** Live preview sidebar */
  preview: {
    title: 'Live Preview',
    copyValue: 'Copy value',
    currentValues: 'Current Values',
    copy: 'Copy',
    computedResults: 'Computed Results',
    issues: 'Issues',
    valid: 'valid',
    errShort: (n: number) => `${n} err`,
    valsShort: (n: number) => `${n} vals`,
    emptyJson: '{}',
    emptyValue: '-',
  },

  /** Fallback copy for rendered fields (RenderField) when a field has no
   *  label/content of its own — the field data is user-authored, so these are
   *  only the last-resort defaults. */
  field: {
    imageAlt: 'Image',
    buttonLabel: 'Button',
    tapToRate: 'Tap to rate',
    ratingValue: (n: number, max: number) => `${n}/${max}`,
    selectPlaceholder: (label: string) => `Select ${label}...`,
    emailPlaceholder: 'email@example.com',
    phonePlaceholder: '+1 (555) 000-0000',
    urlPlaceholder: 'https://example.com',
  },

  /** Runner form / results area */
  app: {
    shareTitle: 'Share this app',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit fullscreen',
    fieldsCount: (n: number) => `${n} field${n !== 1 ? 's' : ''}`,
    logicNodesCount: (n: number) => `${n} logic node${n !== 1 ? 's' : ''}`,
    issuesCount: (n: number) => `${n} issue${n !== 1 ? 's' : ''}`,
    emptyFields:
      'This app has no fields yet. Go to the builder to add some.',
    processing: 'Processing...',
    calculate: 'Calculate',
    submit: 'Submit',
    reset: 'Reset',
    success: 'Success',
    validationErrors: 'Validation Errors',
    allFieldsValid: 'All fields valid',
    errorsFound: (n: number) => `${n} error${n !== 1 ? 's' : ''} found`,
    export: 'Export',
    inputValues: 'Input Values',
    showFormatted: 'Show formatted',
    showRaw: 'Show raw',
    formSubmitted: 'Form submitted successfully!',
    allInputsValid: 'All inputs are valid.',
  },
} as const;
