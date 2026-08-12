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
    /** Default content injected when a layout/content field is quick-added */
    quickAdd: {
      heading: 'Heading Text',
      paragraph: 'Paragraph text goes here...',
    },
  },

  /** Properties panel (field editor) — all labels, placeholders & option copy */
  properties: {
    panelTitle: 'Properties',
    noSelectionTitle: 'No field selected',
    noSelectionHint: 'Click on a field in the canvas to edit its properties here.',
    hintChips: ['Label', 'Validation', 'Style'],
    removeField: 'Remove Field',
    sections: {
      fieldType: 'Field Type',
      basic: 'Basic',
      validation: 'Validation',
      styling: 'Styling',
      animation: 'Animation',
      advanced: 'Advanced',
    },
    labels: {
      label: 'Label',
      placeholder: 'Placeholder',
      required: 'Required',
      contentText: 'Content Text',
      level: 'Level',
      alignment: 'Alignment',
      variant: 'Variant',
      actionType: 'Action Type',
      url: 'URL',
      imageUrl: 'Image URL',
      altText: 'Alt Text',
      aspectRatio: 'Aspect Ratio',
      options: 'Options',
      defaultValue: 'Default Value',
      minLength: 'Min Length',
      maxLength: 'Max Length',
      regexPattern: 'Regex Pattern',
      errorMessage: 'Error Message',
      min: 'Min',
      max: 'Max',
      step: 'Step',
      width: 'Width',
      bgColor: 'BG Color',
      textColor: 'Text Color',
      showBorder: 'Show Border',
      borderRadius: 'Border Radius',
      shadow: 'Shadow',
      customCssClass: 'Custom CSS Class',
      helpText: 'Help Text',
    },
    placeholders: {
      fieldLabel: 'Field label',
      placeholderText: 'Placeholder text',
      heading: 'Heading Text',
      paragraph: 'Paragraph text...',
      url: 'https://...',
      imageUrl: 'https://example.com/image.jpg',
      imageAlt: 'Describe the image',
      addOption: 'Add option...',
      regex: 'e.g. ^[a-zA-Z]+$',
      errorMessage: 'Custom error message',
      bgColor: '#fff',
      textColor: '#000',
      defaultValue: 'Default value',
      cssClass: 'my-custom-class',
      helpText: 'Additional information for users...',
    },
    options: {
      h1: 'H1 - Largest',
      h2: 'H2 - Large',
      h3: 'H3 - Medium',
      h4: 'H4 - Small',
      left: 'Left',
      center: 'Center',
      right: 'Right',
      primary: 'Primary',
      secondary: 'Secondary',
      outline: 'Outline',
      ghost: 'Ghost',
      danger: 'Danger',
      submit: 'Submit',
      reset: 'Reset',
      link: 'Link',
      auto: 'Auto',
      square: 'Square (1:1)',
      widescreen: 'Widescreen (16:9)',
      standard: 'Standard (4:3)',
      none: 'None',
      small: 'Small',
      medium: 'Medium',
      large: 'Large',
      extraLarge: 'Extra Large',
      xl2: '2XL',
      full: 'Full',
      noShadow: 'No Shadow',
      fadeIn: 'Fade In',
      slideIn: 'Slide In',
      bounce: 'Bounce',
      pulse: 'Pulse',
      fullWidth: 'Full Width',
      halfWidth: 'Half Width',
    },
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
