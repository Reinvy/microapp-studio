/**
 * promptToSchema.ts — Prompt-to-Schema Parser
 *
 * Converts natural language text prompts into an AppSchema structure
 * using keyword matching and pattern recognition (runs entirely in-browser,
 * no AI API calls).
 */

import { FieldSchema, FieldType, ParsedSchema } from '@/types/schema';
import { generateId } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Pattern definitions
// ---------------------------------------------------------------------------

interface PatternDef {
  keywords: string[];
  build: (prompt: string) => { fields: FieldSchema[]; name: string; desc: string };
}

function lowerWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function hasSomeKeywords(text: string, keywords: string[]): boolean {
  const words = lowerWords(text);
  return keywords.some((kw) => words.includes(kw));
}

// ---------------------------------------------------------------------------
// Pattern builders
// ---------------------------------------------------------------------------

const PATTERNS: PatternDef[] = [
  {
    // Calculator / compute
    keywords: ['calculator', 'calculate', 'compute', 'arithmetic', 'math'],
    build: (prompt) => ({
      name: guessName(prompt, 'Calculator'),
      desc: guessDescription(prompt, 'A calculator app'),
      fields: buildCalculatorFields(prompt),
    }),
  },
  {
    // Form / registration / signup
    keywords: ['form', 'register', 'signup', 'sign up', 'registration', 'contact'],
    build: (prompt) => ({
      name: guessName(prompt, 'Form'),
      desc: guessDescription(prompt, 'A data entry form'),
      fields: buildFormFields(prompt),
    }),
  },
  {
    // Todo / task / list
    keywords: ['todo', 'task', 'list', 'checklist', 'reminder'],
    build: (prompt) => ({
      name: guessName(prompt, 'Task List'),
      desc: guessDescription(prompt, 'A simple task or todo list'),
      fields: buildTodoFields(prompt),
    }),
  },
  {
    // Survey / poll / quiz
    keywords: ['survey', 'poll', 'quiz', 'questionnaire', 'feedback', 'multiple choice'],
    build: (prompt) => ({
      name: guessName(prompt, 'Survey'),
      desc: guessDescription(prompt, 'A survey or quiz'),
      fields: buildSurveyFields(prompt),
    }),
  },
  {
    // Budget / finance / expense
    keywords: ['budget', 'finance', 'expense', 'financial', 'money', 'cost', 'spend'],
    build: (prompt) => ({
      name: guessName(prompt, 'Budget Tracker'),
      desc: guessDescription(prompt, 'A budget or expense tracker'),
      fields: buildBudgetFields(prompt),
    }),
  },
  {
    // Counter / clicker / timer
    keywords: ['counter', 'clicker', 'timer', 'countdown', 'stopwatch'],
    build: (prompt) => ({
      name: guessName(prompt, 'Counter'),
      desc: guessDescription(prompt, 'A counter or timer app'),
      fields: buildCounterFields(prompt),
    }),
  },
  {
    // Validator / validate / check
    keywords: ['validator', 'validate', 'check', 'verify', 'validation'],
    build: (prompt) => ({
      name: guessName(prompt, 'Validator'),
      desc: guessDescription(prompt, 'An input validation tool'),
      fields: buildValidatorFields(prompt),
    }),
  },
  {
    // Journal / diary / log / habit tracker
    keywords: ['journal', 'diary', 'log', 'habit', 'tracker', 'daily', 'mood', 'reflection', 'entry', 'gratitude'],
    build: (prompt) => ({
      name: guessName(prompt, 'Journal'),
      desc: guessDescription(prompt, 'A personal journal or daily log'),
      fields: buildJournalFields(prompt),
    }),
  },
  {
    // Appointment / booking / reservation / scheduler
    keywords: ['appointment', 'book', 'booking', 'reservation', 'schedule', 'meeting', 'slot', 'calendar', 'event', 'scheduler', 'timeslot', 'agenda', 'planner', 'check-in', 'checkin'],
    build: (prompt) => ({
      name: guessName(prompt, 'Scheduler'),
      desc: guessDescription(prompt, 'An appointment or booking scheduler'),
      fields: buildBookingFields(prompt),
    }),
  },
  {
    // Generator / converter / transformer
    keywords: ['generator', 'generate', 'converter', 'convert', 'transformer', 'transform', 'maker', 'creator', 'builder', 'produce', 'create', 'password generator', 'qr code', 'color palette', 'unit converter', 'text transform'],
    build: (prompt) => ({
      name: guessName(prompt, 'Generator'),
      desc: guessDescription(prompt, 'A generator or converter tool'),
      fields: buildGeneratorFields(prompt),
    }),
  },
];

// ---------------------------------------------------------------------------
// Generic / fallback detection
// ---------------------------------------------------------------------------

function fallbackBuild(prompt: string): { fields: FieldSchema[]; name: string; desc: string } {
  const fields: FieldSchema[] = [];
  const words = lowerWords(prompt);

  // Detect field types from keywords in the prompt
  const numberWords = ['number', 'count', 'amount', 'age', 'price', 'quantity', 'score', 'rating', 'total', 'percent', 'weight', 'height', 'distance', 'temperature'];
  const selectWords = ['choose', 'pick', 'select', 'option', 'category', 'type', 'status', 'priority', 'level', 'size', 'color', 'gender'];
  const checkboxWords = ['agree', 'accept', 'confirm', 'toggle', 'enable', 'active', 'complete', 'done'];
  const dateWords = ['date', 'day', 'birthday', 'deadline', 'schedule'];
  const textareaWords = ['comment', 'description', 'message', 'notes', 'details', 'feedback', 'review', 'bio'];

  let hasNumber = false;
  let hasSelect = false;
  let hasCheckbox = false;
  let hasDate = false;
  let hasTextarea = false;

  for (const w of words) {
    if (!hasNumber && numberWords.includes(w)) hasNumber = true;
    if (!hasSelect && selectWords.includes(w)) hasSelect = true;
    if (!hasCheckbox && checkboxWords.includes(w)) hasCheckbox = true;
    if (!hasDate && dateWords.includes(w)) hasDate = true;
    if (!hasTextarea && textareaWords.includes(w)) hasTextarea = true;
  }

  // Always include at least a text field
  fields.push({
    id: generateId(),
    type: 'text',
    label: extractFieldLabel(prompt, 'text', 'Name'),
    placeholder: `Enter your ${extractFieldLabel(prompt, 'text', 'name').toLowerCase()}`,
    required: true,
  });

  if (hasNumber) {
    fields.push({
      id: generateId(),
      type: 'number',
      label: extractFieldLabel(prompt, 'number', 'Number'),
      placeholder: 'Enter a number',
      required: false,
    });
  }

  if (hasSelect) {
    const label = extractFieldLabel(prompt, 'select', 'Option');
    fields.push({
      id: generateId(),
      type: 'select',
      label,
      options: generateOptions(label),
      required: false,
    });
  }

  if (hasCheckbox) {
    fields.push({
      id: generateId(),
      type: 'checkbox',
      label: extractFieldLabel(prompt, 'checkbox', 'I agree'),
      required: false,
    });
  }

  if (hasDate) {
    fields.push({
      id: generateId(),
      type: 'date',
      label: extractFieldLabel(prompt, 'date', 'Date'),
      required: false,
    });
  }

  if (hasTextarea) {
    fields.push({
      id: generateId(),
      type: 'textarea',
      label: extractFieldLabel(prompt, 'textarea', 'Details'),
      placeholder: 'Enter details...',
      required: false,
    });
  }

  // Cap at 4 fields for fallback
  while (fields.length > 4) {
    // Remove non-text fields that aren't first
    const idx = fields.findIndex((f, i) => i > 0 && f.type !== 'text');
    if (idx > 0) fields.splice(idx, 1);
    else fields.pop();
  }

  return {
    name: guessName(prompt, 'Micro App'),
    desc: guessDescription(prompt, prompt),
    fields,
  };
}

// ---------------------------------------------------------------------------
// Individual pattern builders
// ---------------------------------------------------------------------------

function buildCalculatorFields(prompt: string): FieldSchema[] {
  const words = lowerWords(prompt);

  const labels = extractNumberLabels(prompt);
  const fieldCount = Math.min(Math.max(countNumericIndicators(words), 1), 3);

  const fields: FieldSchema[] = [];
  for (let i = 0; i < fieldCount; i++) {
    fields.push({
      id: generateId(),
      type: 'number',
      label: labels[i] || `Value ${i + 1}`,
      placeholder: 'Enter a number',
      required: true,
      min: undefined,
      max: undefined,
      step: 0.01,
    });
  }

  // Add a select for operation type if we detect that
  if (hasSomeKeywords(prompt, ['operate', 'operation', 'convert', 'transform'])) {
    fields.push({
      id: generateId(),
      type: 'select',
      label: 'Operation',
      options: ['Add', 'Subtract', 'Multiply', 'Divide', 'Average'],
      required: true,
    });
  }

  return fields;
}

function buildFormFields(prompt: string): FieldSchema[] {
  const words = lowerWords(prompt);

  const fields: FieldSchema[] = [];

  // Detect common form fields
  if (hasSomeKeywords(prompt, ['name', 'full name', 'username'])) {
    fields.push({
      id: generateId(),
      type: 'text',
      label: 'Full Name',
      placeholder: 'Enter your full name',
      required: true,
    });
  }

  if (hasSomeKeywords(prompt, ['email', 'e-mail'])) {
    fields.push({
      id: generateId(),
      type: 'text',
      label: 'Email',
      placeholder: 'you@example.com',
      required: true,
      validation: {
        pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
        message: 'Please enter a valid email address',
      },
    });
  }

  if (hasSomeKeywords(prompt, ['password', 'pass', 'secret'])) {
    fields.push({
      id: generateId(),
      type: 'text',
      label: 'Password',
      placeholder: 'Enter password',
      required: true,
      validation: {
        minLength: 6,
        message: 'Password must be at least 6 characters',
      },
    });
  }

  if (hasSomeKeywords(prompt, ['phone', 'tel', 'mobile', 'cell'])) {
    fields.push({
      id: generateId(),
      type: 'text',
      label: 'Phone Number',
      placeholder: 'Enter phone number',
      required: false,
    });
  }

  if (hasSomeKeywords(prompt, ['address', 'street', 'location'])) {
    fields.push({
      id: generateId(),
      type: 'text',
      label: 'Address',
      placeholder: 'Enter your address',
      required: false,
    });
  }

  if (hasSomeKeywords(prompt, ['age', 'birth', 'year'])) {
    fields.push({
      id: generateId(),
      type: 'number',
      label: 'Age',
      placeholder: 'Enter your age',
      required: false,
      min: 0,
      max: 150,
    });
  }

  if (hasSomeKeywords(prompt, ['date', 'birthday', 'dob'])) {
    fields.push({
      id: generateId(),
      type: 'date',
      label: 'Date of Birth',
      required: false,
    });
  }

  if (hasSomeKeywords(prompt, ['gender', 'sex'])) {
    fields.push({
      id: generateId(),
      type: 'select',
      label: 'Gender',
      options: ['Male', 'Female', 'Other', 'Prefer not to say'],
      required: false,
    });
  }

  if (hasSomeKeywords(prompt, ['country', 'city', 'state', 'region'])) {
    fields.push({
      id: generateId(),
      type: 'text',
      label: 'Country / City',
      placeholder: 'Enter your location',
      required: false,
    });
  }

  if (hasSomeKeywords(prompt, ['comment', 'message', 'feedback', 'notes'])) {
    fields.push({
      id: generateId(),
      type: 'textarea',
      label: 'Message',
      placeholder: 'Enter your message...',
      required: false,
    });
  }

  if (hasSomeKeywords(prompt, ['agree', 'terms', 'condition', 'accept'])) {
    fields.push({
      id: generateId(),
      type: 'checkbox',
      label: 'I agree to the terms and conditions',
      required: true,
    });
  }

  // Fallback: ensure at least 2 fields
  if (fields.length < 2) {
    fields.push({
      id: generateId(),
      type: 'text',
      label: 'Name',
      placeholder: 'Enter your name',
      required: true,
    });
    fields.push({
      id: generateId(),
      type: 'text',
      label: 'Email',
      placeholder: 'you@example.com',
      required: true,
      validation: {
        pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
        message: 'Please enter a valid email address',
      },
    });
  }

  return fields;
}

function buildTodoFields(prompt: string): FieldSchema[] {
  const fields: FieldSchema[] = [
    {
      id: generateId(),
      type: 'text',
      label: 'Task Title',
      placeholder: 'What needs to be done?',
      required: true,
    },
  ];

  if (hasSomeKeywords(prompt, ['description', 'notes', 'detail'])) {
    fields.push({
      id: generateId(),
      type: 'textarea',
      label: 'Description',
      placeholder: 'Add details...',
      required: false,
    });
  }

  fields.push({
    id: generateId(),
    type: 'checkbox',
    label: 'Completed',
    defaultValue: false,
    required: false,
  });

  if (hasSomeKeywords(prompt, ['priority', 'important', 'urgent'])) {
    fields.push({
      id: generateId(),
      type: 'select',
      label: 'Priority',
      options: ['Low', 'Medium', 'High', 'Urgent'],
      required: true,
    });
  }

  if (hasSomeKeywords(prompt, ['date', 'due', 'deadline'])) {
    fields.push({
      id: generateId(),
      type: 'date',
      label: 'Due Date',
      required: false,
    });
  }

  return fields;
}

function buildSurveyFields(prompt: string): FieldSchema[] {
  const fields: FieldSchema[] = [];

  // Extract potential question topics
  const topics = extractTopics(prompt);

  if (topics.length > 0) {
    for (const topic of topics.slice(0, 4)) {
      fields.push({
        id: generateId(),
        type: 'select',
        label: topic,
        options: ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'],
        required: true,
      });
    }
  } else {
    // Default survey fields
    fields.push({
      id: generateId(),
      type: 'select',
      label: 'Satisfaction',
      options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Unsatisfied', 'Very Unsatisfied'],
      required: true,
    });
    fields.push({
      id: generateId(),
      type: 'select',
      label: 'Would you recommend us?',
      options: ['Yes', 'No', 'Maybe'],
      required: true,
    });
  }

  if (hasSomeKeywords(prompt, ['comment', 'feedback', 'suggestion', 'open-ended'])) {
    fields.push({
      id: generateId(),
      type: 'textarea',
      label: 'Additional Comments',
      placeholder: 'Any other thoughts?',
      required: false,
    });
  }

  if (hasSomeKeywords(prompt, ['rating', 'star', 'score'])) {
    fields.push({
      id: generateId(),
      type: 'number',
      label: 'Rating',
      min: 1,
      max: 5,
      step: 1,
      defaultValue: 3,
      required: true,
    });
  }

  return fields;
}

function buildBudgetFields(prompt: string): FieldSchema[] {
  const fields: FieldSchema[] = [
    {
      id: generateId(),
      type: 'text',
      label: 'Item Name',
      placeholder: 'What is this for?',
      required: true,
    },
    {
      id: generateId(),
      type: 'number',
      label: 'Amount',
      placeholder: '0.00',
      required: true,
      min: 0,
      step: 0.01,
    },
  ];

  if (hasSomeKeywords(prompt, ['category', 'type', 'kind'])) {
    fields.push({
      id: generateId(),
      type: 'select',
      label: 'Category',
      options: ['Food', 'Transport', 'Housing', 'Utilities', 'Entertainment', 'Health', 'Other'],
      required: true,
    });
  }

  if (hasSomeKeywords(prompt, ['date', 'day', 'when'])) {
    fields.push({
      id: generateId(),
      type: 'date',
      label: 'Date',
      required: false,
    });
  }

  if (hasSomeKeywords(prompt, ['income', 'earning', 'revenue'])) {
    fields.push({
      id: generateId(),
      type: 'select',
      label: 'Type',
      options: ['Expense', 'Income'],
      required: true,
    });
  }

  if (hasSomeKeywords(prompt, ['note', 'description', 'comment'])) {
    fields.push({
      id: generateId(),
      type: 'textarea',
      label: 'Notes',
      placeholder: 'Optional notes...',
      required: false,
    });
  }

  return fields;
}

function buildCounterFields(prompt: string): FieldSchema[] {
  const fields: FieldSchema[] = [
    {
      id: generateId(),
      type: 'number',
      label: 'Count',
      defaultValue: 0,
      min: 0,
      step: 1,
      required: true,
    },
  ];

  if (hasSomeKeywords(prompt, ['min', 'minimum', 'start'])) {
    fields.push({
      id: generateId(),
      type: 'number',
      label: 'Minimum Value',
      defaultValue: 0,
      step: 1,
      required: false,
    });
  }

  if (hasSomeKeywords(prompt, ['max', 'maximum', 'limit', 'cap'])) {
    fields.push({
      id: generateId(),
      type: 'number',
      label: 'Maximum Value',
      defaultValue: 100,
      step: 1,
      required: false,
    });
  }

  if (hasSomeKeywords(prompt, ['step', 'increment'])) {
    fields.push({
      id: generateId(),
      type: 'number',
      label: 'Step Size',
      defaultValue: 1,
      min: 1,
      step: 1,
      required: false,
    });
  }

  if (hasSomeKeywords(prompt, ['label', 'name', 'title'])) {
    fields.push({
      id: generateId(),
      type: 'text',
      label: 'Display Label',
      placeholder: 'Counter label',
      defaultValue: 'Count',
      required: false,
    });
  }

  return fields;
}

function buildValidatorFields(prompt: string): FieldSchema[] {
  const fields: FieldSchema[] = [];

  if (hasSomeKeywords(prompt, ['email', 'e-mail'])) {
    fields.push({
      id: generateId(),
      type: 'text',
      label: 'Email',
      placeholder: 'you@example.com',
      required: true,
      validation: {
        pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
        message: 'Please enter a valid email address',
      },
    });
  }

  if (hasSomeKeywords(prompt, ['phone', 'tel', 'mobile'])) {
    fields.push({
      id: generateId(),
      type: 'text',
      label: 'Phone Number',
      placeholder: '+1 (555) 000-0000',
      required: true,
      validation: {
        pattern: '^[\\d\\s\\+\\(\\)\\-]{7,}$',
        message: 'Please enter a valid phone number',
      },
    });
  }

  if (hasSomeKeywords(prompt, ['url', 'website', 'link', 'web'])) {
    fields.push({
      id: generateId(),
      type: 'text',
      label: 'URL',
      placeholder: 'https://example.com',
      required: true,
      validation: {
        pattern: '^https?://[\\w\\-]+(\\.[\\w\\-]+)+[/#?]?.*$',
        message: 'Please enter a valid URL starting with http:// or https://',
      },
    });
  }

  if (hasSomeKeywords(prompt, ['zip', 'postal', 'postcode'])) {
    fields.push({
      id: generateId(),
      type: 'text',
      label: 'ZIP / Postal Code',
      placeholder: '12345 or 12345-6789',
      required: true,
      validation: {
        pattern: '^[\\d]{5}(-[\\d]{4})?$',
        message: 'Please enter a valid ZIP code (e.g., 12345 or 12345-6789)',
      },
    });
  }

  if (hasSomeKeywords(prompt, ['number', 'numeric', 'digit'])) {
    fields.push({
      id: generateId(),
      type: 'number',
      label: 'Number Input',
      placeholder: 'Enter a number',
      required: true,
      min: undefined,
      max: undefined,
      validation: {
        minLength: undefined,
        maxLength: undefined,
      },
    });
  }

  if (hasSomeKeywords(prompt, ['date', 'birth', 'dob'])) {
    fields.push({
      id: generateId(),
      type: 'date',
      label: 'Date',
      required: true,
    });
  }

  if (hasSomeKeywords(prompt, ['password', 'pass'])) {
    fields.push({
      id: generateId(),
      type: 'text',
      label: 'Password',
      placeholder: 'Enter password',
      required: true,
      validation: {
        minLength: 8,
        maxLength: 64,
        message: 'Password must be 8-64 characters',
      },
    });
  }

  // Fallback: basic text validator
  if (fields.length === 0) {
    fields.push({
      id: generateId(),
      type: 'text',
      label: 'Input',
      placeholder: 'Enter text to validate',
      required: true,
    });
    fields.push({
      id: generateId(),
      type: 'number',
      label: 'Number',
      placeholder: 'Enter a number',
      required: false,
    });
  }

  return fields;
}

function buildJournalFields(prompt: string): FieldSchema[] {
  const fields: FieldSchema[] = [];

  // Core journal entry fields
  if (hasSomeKeywords(prompt, ['mood', 'feeling', 'emotion', 'happy', 'sad'])) {
    fields.push({
      id: generateId(),
      type: 'select',
      label: 'Mood',
      options: ['😊 Happy', '😐 Neutral', '😢 Sad', '😡 Angry', '😴 Tired', '🤗 Grateful'],
      required: true,
    });
  }

  if (hasSomeKeywords(prompt, ['gratitude', 'thankful', 'grateful', 'blessing'])) {
    fields.push({
      id: generateId(),
      type: 'textarea',
      label: 'Gratitude Entry',
      placeholder: 'What are you grateful for today?',
      required: true,
    });
  }

  fields.push({
    id: generateId(),
    type: 'textarea',
    label: 'Journal Entry',
    placeholder: 'Write your thoughts...',
    required: true,
  });

  if (hasSomeKeywords(prompt, ['habit', 'tracker', 'daily'])) {
    fields.push({
      id: generateId(),
      type: 'checkbox',
      label: 'Did you complete your habit today?',
      required: false,
    });
  }

  if (hasSomeKeywords(prompt, ['rate', 'rating', 'score', 'scale'])) {
    fields.push({
      id: generateId(),
      type: 'number',
      label: 'Daily Rating',
      min: 1,
      max: 10,
      step: 1,
      defaultValue: 5,
      required: false,
    });
  }

  if (hasSomeKeywords(prompt, ['energy', 'productivity', 'focus'])) {
    fields.push({
      id: generateId(),
      type: 'select',
      label: 'Energy Level',
      options: ['💪 High', '👍 Moderate', '👎 Low', '🛌 Exhausted'],
      required: false,
    });
  }

  if (hasSomeKeywords(prompt, ['sleep', 'rest', 'hours'])) {
    fields.push({
      id: generateId(),
      type: 'number',
      label: 'Sleep (hours)',
      min: 0,
      max: 24,
      step: 0.5,
      defaultValue: 7,
      required: false,
    });
  }

  if (hasSomeKeywords(prompt, ['exercise', 'workout', 'fitness', 'run', 'walk'])) {
    fields.push({
      id: generateId(),
      type: 'select',
      label: 'Exercise Today',
      options: ['None', 'Light (15-30 min)', 'Moderate (30-60 min)', 'Intense (60+ min)'],
      required: false,
    });
  }

  if (hasSomeKeywords(prompt, ['tag', 'label', 'category', 'topic'])) {
    fields.push({
      id: generateId(),
      type: 'text',
      label: 'Tags',
      placeholder: 'e.g., personal, work, health',
      required: false,
    });
  }

  // Always include a date field for journal entries
  fields.push({
    id: generateId(),
    type: 'date',
    label: 'Date',
    required: true,
  });

  return fields;
}

/**
 * Build fields for a booking / appointment / scheduler app.
 */
function buildBookingFields(prompt: string): FieldSchema[] {
  const fields: FieldSchema[] = [];

  // Core booking fields
  fields.push({
    id: generateId(),
    type: 'text',
    label: 'Name',
    placeholder: 'Enter your name',
    required: true,
  });

  if (hasSomeKeywords(prompt, ['email', 'e-mail', 'contact'])) {
    fields.push({
      id: generateId(),
      type: 'text',
      label: 'Email',
      placeholder: 'you@example.com',
      required: true,
    });
  }

  if (hasSomeKeywords(prompt, ['phone', 'tel', 'mobile', 'whatsapp'])) {
    fields.push({
      id: generateId(),
      type: 'text',
      label: 'Phone',
      placeholder: 'Enter phone number',
      required: true,
    });
  }

  if (hasSomeKeywords(prompt, ['date', 'day', 'when', 'availability'])) {
    fields.push({
      id: generateId(),
      type: 'date',
      label: 'Preferred Date',
      required: true,
    });
  }

  if (hasSomeKeywords(prompt, ['time', 'slot', 'hour', 'time slot'])) {
    fields.push({
      id: generateId(),
      type: 'select',
      label: 'Preferred Time',
      options: generateTimeSlots(),
      required: true,
    });
  }

  if (hasSomeKeywords(prompt, ['service', 'treatment', 'type', 'kind'])) {
    fields.push({
      id: generateId(),
      type: 'select',
      label: 'Service Type',
      options: ['Consultation', 'General Checkup', 'Follow-up', 'Custom'],
      required: true,
    });
  }

  if (hasSomeKeywords(prompt, ['people', 'guest', 'person', 'party', 'group', 'attendee'])) {
    fields.push({
      id: generateId(),
      type: 'number',
      label: 'Number of People',
      min: 1,
      max: 50,
      step: 1,
      defaultValue: 1,
      required: true,
    });
  }

  if (hasSomeKeywords(prompt, ['note', 'note', 'special', 'request', 'comment'])) {
    fields.push({
      id: generateId(),
      type: 'textarea',
      label: 'Special Requests',
      placeholder: 'Any special requests or notes...',
      required: false,
    });
  }

  // Ensure at least 2 fields
  while (fields.length < 2) {
    fields.push({
      id: generateId(),
      type: 'text',
      label: 'Details',
      placeholder: 'Enter details',
      required: false,
    });
  }

  return fields;
}

/** Generate common time slot options for bookings */
function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 8; h <= 17; h++) {
    slots.push(`${h.toString().padStart(2, '0')}:00`);
    slots.push(`${h.toString().padStart(2, '0')}:30`);
  }
  return slots;
}

function buildGeneratorFields(prompt: string): FieldSchema[] {
  const fields: FieldSchema[] = [];

  // Detect generator / converter subtype
  if (hasSomeKeywords(prompt, ['qr', 'barcode', 'code', 'scan'])) {
    fields.push({
      id: generateId(),
      type: 'text',
      label: 'Content',
      placeholder: 'Enter text or URL for QR code',
      required: true,
    });
  } else if (hasSomeKeywords(prompt, ['password', 'pass', 'secure', 'random'])) {
    fields.push({
      id: generateId(),
      type: 'number',
      label: 'Length',
      defaultValue: 16,
      min: 4,
      max: 128,
      step: 1,
      required: true,
    });
    fields.push({
      id: generateId(),
      type: 'checkbox',
      label: 'Include Uppercase',
      defaultValue: true,
      required: false,
    });
    fields.push({
      id: generateId(),
      type: 'checkbox',
      label: 'Include Numbers',
      defaultValue: true,
      required: false,
    });
    fields.push({
      id: generateId(),
      type: 'checkbox',
      label: 'Include Symbols',
      defaultValue: false,
      required: false,
    });
  } else if (hasSomeKeywords(prompt, ['color', 'colour', 'hex', 'rgb', 'palette', 'theme'])) {
    fields.push({
      id: generateId(),
      type: 'text',
      label: 'Base Color',
      placeholder: '#ff6b6b or a color name',
      required: true,
    });
    fields.push({
      id: generateId(),
      type: 'select',
      label: 'Palette Type',
      options: ['Complementary', 'Analogous', 'Triadic', 'Monochromatic', 'Shades'],
      required: true,
    });
  } else if (hasSomeKeywords(prompt, ['unit', 'measurement', 'metric', 'imperial', 'length', 'weight', 'temperature', 'currency'])) {
    fields.push({
      id: generateId(),
      type: 'number',
      label: 'Value',
      placeholder: 'Enter value to convert',
      required: true,
      step: 0.01,
    });
    fields.push({
      id: generateId(),
      type: 'text',
      label: 'From Unit',
      placeholder: 'e.g., meters, kg, USD, °C',
      required: true,
    });
    fields.push({
      id: generateId(),
      type: 'text',
      label: 'To Unit',
      placeholder: 'e.g., feet, lbs, EUR, °F',
      required: true,
    });
  } else {
    // Generic generator / transformer fields
    fields.push({
      id: generateId(),
      type: 'text',
      label: 'Input Value',
      placeholder: 'Enter input to transform',
      required: true,
    });
    fields.push({
      id: generateId(),
      type: 'select',
      label: 'Output Format',
      options: ['Plain Text', 'JSON', 'Base64', 'Uppercase', 'Lowercase', 'Reversed'],
      required: true,
    });
  }

  // Ensure at least 1 field for QR/pre-filled cases
  if (fields.length === 0) {
    fields.push({
      id: generateId(),
      type: 'text',
      label: 'Input Value',
      placeholder: 'Enter input to transform',
      required: true,
    });
  }

  return fields;
}

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/** Extract a field label from the prompt for a given field type */
function extractFieldLabel(prompt: string, type: FieldType, fallback: string): string {
  const words = lowerWords(prompt);

  // Common mappings from keywords to labels
  const labelMap: Record<string, string> = {
    name: 'Name',
    email: 'Email',
    age: 'Age',
    address: 'Address',
    phone: 'Phone',
    date: 'Date',
    comment: 'Comment',
    message: 'Message',
    feedback: 'Feedback',
    rating: 'Rating',
    title: 'Title',
    description: 'Description',
    amount: 'Amount',
    quantity: 'Quantity',
    price: 'Price',
    score: 'Score',
    count: 'Count',
    status: 'Status',
    category: 'Category',
    type: 'Type',
    priority: 'Priority',
    color: 'Color',
    size: 'Size',
    notes: 'Notes',
    details: 'Details',
  };

  // Try to find a matching label from the prompt
  for (const [keyword, label] of Object.entries(labelMap)) {
    if (words.includes(keyword)) {
      return label;
    }
  }

  // Try to extract any capitalized words or phrases from the prompt
  const match = prompt.match(/\b([A-Z][a-z]+)\b/g);
  if (match && match.length > 0) {
    return match[0];
  }

  return fallback;
}

/** Extract number-related field labels from prompt */
function extractNumberLabels(prompt: string): string[] {
  const words = lowerWords(prompt);
  const labels: string[] = [];

  const labelOrder = ['price', 'quantity', 'amount', 'count', 'score', 'value', 'total', 'number', 'weight', 'height', 'distance', 'temperature'];

  for (const lbl of labelOrder) {
    if (words.includes(lbl)) {
      labels.push(lbl.charAt(0).toUpperCase() + lbl.slice(1));
    }
  }

  return labels;
}

/** Count how many numeric-related words are in the word list */
function countNumericIndicators(words: string[]): number {
  const indicators = ['number', 'value', 'amount', 'price', 'quantity', 'count', 'cost', 'total', 'score', 'rating', 'size', 'weight', 'height', 'width', 'length', 'age'];
  return words.filter((w) => indicators.includes(w)).length;
}

/** Extract potential survey topics from prompt */
function extractTopics(prompt: string): string[] {
  // Look for phrases after common topic-introducing words
  const topicMarkers = ['about', 'regarding', 'on', 'for', 'like', 'such as'];

  const words = prompt.split(/[,\n;.?!]+/).map((s) => s.trim()).filter(Boolean);

  const topics: string[] = [];
  for (const phrase of words) {
    const lower = phrase.toLowerCase();
    // Check if phrase starts with a topic marker
    for (const marker of topicMarkers) {
      if (lower.startsWith(marker) && phrase.length > marker.length + 3) {
        const topic = phrase.substring(marker.length).trim();
        if (topic.length > 2) {
          // Capitalize first letter
          topics.push(topic.charAt(0).toUpperCase() + topic.slice(1));
        }
      }
    }
  }

  return topics;
}

/** Generate sensible options for a select field based on its label */
function generateOptions(label: string): string[] {
  const lower = label.toLowerCase();

  if (lower.includes('gender') || lower.includes('sex')) {
    return ['Male', 'Female', 'Other'];
  }
  if (lower.includes('priority') || lower.includes('importance')) {
    return ['Low', 'Medium', 'High', 'Urgent'];
  }
  if (lower.includes('status')) {
    return ['Pending', 'In Progress', 'Completed', 'Cancelled'];
  }
  if (lower.includes('category') || lower.includes('type')) {
    return ['Category A', 'Category B', 'Category C', 'Other'];
  }
  if (lower.includes('color') || lower.includes('colour')) {
    return ['Red', 'Blue', 'Green', 'Yellow', 'Black', 'White'];
  }
  if (lower.includes('size')) {
    return ['XS', 'S', 'M', 'L', 'XL'];
  }
  if (lower.includes('rating') || lower.includes('score')) {
    return ['1', '2', '3', '4', '5'];
  }
  if (lower.includes('satisfaction')) {
    return ['Very Satisfied', 'Satisfied', 'Neutral', 'Unsatisfied'];
  }
  if (lower.includes('frequency') || lower.includes('how often')) {
    return ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'];
  }
  if (lower.includes('agreement') || lower.includes('agree')) {
    return ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];
  }

  return ['Option 1', 'Option 2', 'Option 3'];
}

/** Guess an app name from the prompt */
function guessName(prompt: string, fallback: string): string {
  // Try to extract the first meaningful noun phrase
  const clean = prompt.trim();
  if (clean.length <= 40) {
    // Use the prompt itself, capitalized
    return clean.charAt(0).toUpperCase() + clean.slice(1).replace(/[^a-zA-Z0-9\s]/g, '');
  }

  // Try to find the first sentence
  const firstSentence = clean.split(/[.!?\n]/).find((s) => s.trim().length > 0);
  if (firstSentence) {
    const words = firstSentence.trim().split(/\s+/);
    // Take first 4 meaningful words
    const filtered = words.filter((w) => !['a', 'an', 'the', 'of', 'in', 'on', 'for', 'to', 'with', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'need', 'dare', 'ought', 'used', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'].includes(w.toLowerCase()));
    if (filtered.length >= 2) {
      return filtered.slice(0, 4).join(' ').trim();
    }
    return filtered[0] || fallback;
  }

  return fallback;
}

/** Guess a description from the prompt */
function guessDescription(prompt: string, fallback: string): string {
  // For long prompts, take the first sentence
  const sentences = prompt.split(/[.!?\n]/).filter((s) => s.trim().length > 0);
  if (sentences.length > 0) {
    const first = sentences[0].trim();
    if (first.length > 10 && first.length <= 200) return first;
    if (first.length > 200) return first.substring(0, 197) + '...';
  }
  return prompt.length > 0 ? prompt : fallback;
}

// ---------------------------------------------------------------------------
// PromptParser class
// ---------------------------------------------------------------------------

export class PromptParser {
  /**
   * Parse a natural language prompt into a structured ParsedSchema.
   */
  parse(prompt: string): ParsedSchema {
    if (!prompt || prompt.trim().length === 0) {
      return {
        appName: 'New Micro App',
        description: 'A micro app',
        fields: [
          {
            id: generateId(),
            type: 'text',
            label: 'Input',
            placeholder: 'Enter a value',
            required: false,
          },
        ],
      };
    }

    const trimmed = prompt.trim();

    // Try each pattern in order
    for (const pattern of PATTERNS) {
      if (hasSomeKeywords(trimmed, pattern.keywords)) {
        const result = pattern.build(trimmed);
        return {
          appName: result.name,
          description: result.desc,
          fields: result.fields,
        };
      }
    }

    // Fallback to generic detection
    const fallback = fallbackBuild(trimmed);
    return {
      appName: fallback.name,
      description: fallback.desc,
      fields: fallback.fields,
    };
  }
}

/**
 * Convenience function: parse a prompt into a ParsedSchema.
 */
export default function parsePrompt(prompt: string): ParsedSchema {
  const parser = new PromptParser();
  return parser.parse(prompt);
}
