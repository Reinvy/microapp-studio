/**
 * builderCopy — centralized UI copy for the builder tool.
 *
 * The builder is tool chrome (like a design app), not site content, so its
 * labels live in a config module rather than the content DB — a single
 * source of truth so no component hardcodes its own strings, and copy
 * edits / future i18n touch exactly one file. Field-type labels and icons
 * are NOT duplicated here — they come from `fieldMeta` (fieldLabels /
 * fieldIcons), the existing single source of truth.
 */

export const builderCopy = {
  /** Bottom tab bar (mobile) + panel titles */
  tabs: {
    components: 'Components',
    canvas: 'Canvas',
    properties: 'Properties',
  },

  /** Builder top toolbar */
  toolbar: {
    backAria: 'Back to dashboard',
    untitled: 'Untitled',
    undoAria: 'Undo (not available yet)',
    redoAria: 'Redo (not available yet)',
    save: 'Save',
    saved: 'Saved!',
    run: 'Run',
  },

  /** Canvas surface */
  canvas: {
    noAppTitle: 'No app selected',
    noAppSubtitle: 'Select or create an app to start building.',
    fieldCount: (n: number) => `${n} field${n !== 1 ? 's' : ''}`,
    dragHint: 'Drag to reorder',
    zoomOutAria: 'Zoom out',
    zoomInAria: 'Zoom in',
    resetZoomAria: 'Reset zoom',
    clearAll: 'Clear all',
    clearAllConfirm: 'Click again to confirm',
    clearAllAria: 'Clear all fields',
    clearAllConfirmAria: 'Confirm clearing all fields',
    emptyTitle: 'Drop components here',
    emptySubtitle:
      'Drag fields from the palette on the left, or click a field type to add it to your app.',
    hintDrag: 'Drag & drop',
    hintClick: 'Click to add',
    hintReorder: 'Reorder',
    dragHandleAria: (label: string) => `Drag to reorder ${label}`,
    deleteAria: (label: string) => `Delete ${label}`,
    /** Fallback preview copy per field type (placeholder text shown on the canvas card) */
    preview: {
      heading: 'Heading',
      paragraph: 'Paragraph text...',
      button: 'Button',
      select: 'Select...',
      textarea: 'Enter text...',
      file: 'Choose file...',
      input: (type: string) => `Enter ${type}...`,
    },
  },

  /** Component palette sidebar */
  palette: {
    title: 'Components',
    categories: {
      input: 'Input Fields',
      layout: 'Layout Elements',
      content: 'Rich Content',
      actions: 'Actions',
    },
    addTitle: (label: string) => `Add ${label}`,
  },

  /** Builder page shell (loading / error states) */
  page: {
    errorTitle: 'Something went wrong',
    errorMessage: 'Failed to load the app. Please try again.',
    notFoundMessage: (id: string) => `App with ID "${id}" not found.`,
    backToDashboard: 'Back to Dashboard',
    tryAgain: 'Try Again',
    loadingApp: 'Loading app...',
    creatingApp: 'Creating new app...',
    untitledApp: 'Untitled App',
    newField: (name: string) => `New ${name}`,
  },
} as const;
