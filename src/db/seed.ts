'use client';

import { microAppRepo } from './microAppRepo';
import { contentRepo, type SiteContent } from './contentRepo';
import type { AppSchema, FieldSchema } from '@/types/schema';
import { pastelPalette } from '@/lib/claymorphism';

// ─── Generator helpers ───

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

const pastelColors = [...pastelPalette];

const buttonVariants = ['primary', 'secondary', 'outline', 'ghost', 'danger'] as const;

const imagePool = [
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop',
];

const appTemplatePool = [
  {
    name: 'Customer Feedback Form',
    description: 'A clay-styled feedback form with rating, color picker, and submit button.',
    prompt: 'Create a feedback form with rating, color picker, and submit button.',
  },
  {
    name: 'Pizza Order Builder',
    description: 'Custom pizza order with toppings, size, and quantity selectors.',
    prompt: 'Create a pizza order form with toppings selection, size picker, and order button.',
  },
  {
    name: 'Daily Mood Tracker',
    description: 'Track your mood daily with emoji ratings, journal entry, and color themes.',
    prompt: 'Create a mood tracker with emoji rating, journal text, and date picker.',
  },
  {
    name: 'Color Palette Explorer',
    description: 'Explore and save custom color palettes with claymorphism preview.',
    prompt: 'Create a color palette explorer with color pickers, hex input, and save functionality.',
  },
  {
    name: 'Trivia Quiz Master',
    description: 'A fun trivia quiz with multiple choice, score tracking, and timer.',
    prompt: 'Create a trivia quiz app with multiple choice questions, score, and timer.',
  },
  {
    name: 'Event RSVP Guestbook',
    description: 'Collect RSVPs and guest notes for your next clay-themed event.',
    prompt: 'Create an event RSVP form with guest name, email, attendance select, and note field.',
  },
  {
    name: 'Pet Adoption Survey',
    description: 'Match families with pets using preference selects and a cute rating widget.',
    prompt: 'Create a pet adoption survey with pet type select, lifestyle toggles, and rating.',
  },
];

/** Deterministic pick from a pool based on the app index (stable across re-seeds). */
function pickFrom<T>(pool: readonly T[], index: number, salt = 0): T {
  return pool[(index * 7 + salt * 3) % pool.length];
}

// ─── Field generators ───

function headingField(id: string, label: string, level: string, content: string): FieldSchema {
  return {
    id,
    type: 'heading',
    label,
    content,
    headingLevel: level as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6',
    level: level as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6',
    textColor: '#4A3F35',
    alignment: 'center',
    style: { borderRadius: 'none', shadow: 'none' },
  };
}

function paragraphField(id: string, label: string, content: string): FieldSchema {
  return {
    id,
    type: 'paragraph',
    label,
    content,
    textColor: '#4A3F35',
    alignment: 'left',
    style: { borderRadius: 'none', shadow: 'none' },
  };
}

function imageField(id: string, label: string, src: string, alt: string): FieldSchema {
  return {
    id,
    type: 'image',
    label,
    src,
    alt,
    aspectRatio: '16:9',
    borderRadius: 'xl',
    shadow: 'md',
    style: { borderRadius: 'xl', shadow: 'md' },
  };
}

function buttonField(id: string, label: string, variant: string): FieldSchema {
  return {
    id,
    type: 'button',
    label,
    variant: variant as 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger',
    action: 'submit',
    actionType: 'submit',
    size: 'md',
    borderRadius: '2xl',
    style: { borderRadius: '2xl', size: 'md' },
  };
}

function colorField(id: string, label: string, defaultColor: string): FieldSchema {
  return {
    id,
    type: 'color',
    label,
    defaultValue: defaultColor,
    color: defaultColor,
    style: { borderRadius: 'lg' },
  };
}

function ratingField(id: string, label: string): FieldSchema {
  return {
    id,
    type: 'rating',
    label,
    defaultValue: 3,
    min: 1,
    max: 5,
    step: 1,
    style: { borderRadius: 'lg' },
  };
}

function textField(id: string, label: string, placeholder: string): FieldSchema {
  return {
    id,
    type: 'text',
    label,
    placeholder,
    required: true,
    style: { borderRadius: 'lg' },
  };
}

function selectField(id: string, label: string, options: string[]): FieldSchema {
  return {
    id,
    type: 'select',
    label,
    options,
    placeholder: `Select ${label.toLowerCase()}...`,
    style: { borderRadius: 'lg' },
  };
}

function numberField(id: string, label: string, min: number, max: number): FieldSchema {
  return {
    id,
    type: 'number',
    label,
    min,
    max,
    step: 1,
    defaultValue: min,
    style: { borderRadius: 'lg' },
  };
}

function toggleField(id: string, label: string): FieldSchema {
  return {
    id,
    type: 'toggle',
    label,
    defaultValue: false,
    style: { borderRadius: 'lg' },
  };
}

function emailField(id: string, label: string, placeholder: string): FieldSchema {
  return {
    id,
    type: 'email',
    label,
    placeholder,
    required: true,
    validation: { pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$', message: 'Enter a valid email address' },
    style: { borderRadius: 'lg' },
  };
}

function phoneField(id: string, label: string, placeholder: string): FieldSchema {
  return {
    id,
    type: 'phone',
    label,
    placeholder,
    required: true,
    style: { borderRadius: 'lg' },
  };
}

function urlField(id: string, label: string, placeholder: string): FieldSchema {
  return {
    id,
    type: 'url',
    label,
    placeholder,
    style: { borderRadius: 'lg' },
  };
}

function dateField(id: string, label: string): FieldSchema {
  return {
    id,
    type: 'date',
    label,
    required: true,
    style: { borderRadius: 'lg' },
  };
}

function textareaField(id: string, label: string, placeholder: string): FieldSchema {
  return {
    id,
    type: 'textarea',
    label,
    placeholder,
    required: false,
    style: { borderRadius: 'lg' },
  };
}

function checkboxField(id: string, label: string): FieldSchema {
  return {
    id,
    type: 'checkbox',
    label,
    defaultValue: false,
    style: { borderRadius: 'lg' },
  };
}

function sliderField(id: string, label: string, min: number, max: number): FieldSchema {
  return {
    id,
    type: 'slider',
    label,
    min,
    max,
    step: 1,
    defaultValue: Math.round((min + max) / 2),
    style: { borderRadius: 'lg' },
  };
}

function fileField(id: string, label: string): FieldSchema {
  return {
    id,
    type: 'file',
    label,
    required: false,
    style: { borderRadius: 'lg' },
  };
}

function dividerField(id: string): FieldSchema {
  return {
    id,
    type: 'divider',
    label: 'Divider',
    style: { borderRadius: 'none', shadow: 'none' },
  };
}

function spacerField(id: string): FieldSchema {
  return {
    id,
    type: 'spacer',
    label: 'Spacer',
    style: { borderRadius: 'none', shadow: 'none' },
  };
}

// ─── App generators ───

function createFeedbackApp(index: number): AppSchema {
  const now = Date.now();
  const tpl = pickFrom(appTemplatePool, index, 0);
  return {
    id: generateId(),
    name: tpl.name,
    description: tpl.description,
    prompt: tpl.prompt,
    fields: [
      headingField('fb-heading', 'Heading', 'h2', 'We value your feedback 💬'),
      paragraphField('fb-intro', 'Intro', 'Help us improve by sharing your thoughts below.'),
      textField('fb-name', 'Your Name', 'e.g. Alex'),
      ratingField('fb-rating', 'How would you rate us?'),
      colorField('fb-color', 'Favorite color theme', pickFrom(pastelColors, index, 1)),
      selectField('fb-category', 'Category', ['Bug Report', 'Feature Request', 'General Feedback', 'Praise']),
      buttonField('fb-submit', 'Submit Feedback', pickFrom(buttonVariants, index, 2)),
    ],
    logicNodes: [],
    layout: [],
    createdAt: now - 86400000,
    updatedAt: now,
    version: 1,
    settings: { layout: 'vertical', theme: 'clay' },
  };
}

function createPizzaOrderApp(index: number): AppSchema {
  const now = Date.now();
  const tpl = pickFrom(appTemplatePool, index, 1);
  return {
    id: generateId(),
    name: tpl.name,
    description: tpl.description,
    prompt: tpl.prompt,
    fields: [
      headingField('pz-heading', 'Heading', 'h2', 'Build your pizza 🍕'),
      imageField('pz-image', 'Pizza preview', pickFrom(imagePool, index, 1), 'Delicious pizza'),
      selectField('pz-size', 'Size', ['Small', 'Medium', 'Large', 'Extra Large']),
      selectField('pz-crust', 'Crust', ['Thin', 'Regular', 'Thick', 'Stuffed']),
      numberField('pz-quantity', 'Quantity', 1, 10),
      toggleField('pz-cheese', 'Extra Cheese'),
      toggleField('pz-pepperoni', 'Pepperoni'),
      toggleField('pz-mushroom', 'Mushrooms'),
      colorField('pz-color', 'Box color', pickFrom(pastelColors, index, 3)),
      buttonField('pz-order', 'Order Now', pickFrom(buttonVariants, index, 4)),
    ],
    logicNodes: [],
    layout: [],
    createdAt: now - 172800000,
    updatedAt: now,
    version: 1,
    settings: { layout: 'vertical', theme: 'clay' },
  };
}

function createMoodTrackerApp(index: number): AppSchema {
  const now = Date.now();
  const tpl = pickFrom(appTemplatePool, index, 2);
  return {
    id: generateId(),
    name: tpl.name,
    description: tpl.description,
    prompt: tpl.prompt,
    fields: [
      headingField('mt-heading', 'Heading', 'h3', 'How are you feeling today? 😊'),
      ratingField('mt-mood', 'Mood Rating'),
      colorField('mt-color', 'Mood Color', pickFrom(pastelColors, index, 5)),
      textField('mt-journal', 'Journal Entry', 'Write a few words about your day...'),
      selectField('mt-energy', 'Energy Level', ['Low', 'Medium', 'High', 'Very High']),
      numberField('mt-hours', 'Hours slept', 0, 24),
      toggleField('mt-exercise', 'Exercised today?'),
      toggleField('mt-social', 'Socialized today?'),
      paragraphField('mt-tip', 'Tip', 'Consistency is key! Tracking daily helps spot patterns.'),
      buttonField('mt-save', 'Save Entry', pickFrom(buttonVariants, index, 6)),
    ],
    logicNodes: [],
    layout: [],
    createdAt: now - 259200000,
    updatedAt: now,
    version: 1,
    settings: { layout: 'vertical', theme: 'clay' },
  };
}

function createColorPaletteApp(index: number): AppSchema {
  const now = Date.now();
  const tpl = pickFrom(appTemplatePool, index, 3);
  return {
    id: generateId(),
    name: tpl.name,
    description: tpl.description,
    prompt: tpl.prompt,
    fields: [
      headingField('cp-heading', 'Heading', 'h2', '🎨 Palette Explorer'),
      paragraphField('cp-intro', 'Intro', 'Mix and match colors to create your perfect palette.'),
      colorField('cp-primary', 'Primary Color', pickFrom(pastelColors, index, 7)),
      colorField('cp-secondary', 'Secondary Color', pickFrom(pastelColors, index, 8)),
      colorField('cp-accent', 'Accent Color', pickFrom(pastelColors, index, 9)),
      colorField('cp-background', 'Background Color', pickFrom(pastelColors, index, 10)),
      textField('cp-name', 'Palette Name', 'e.g. Sunset Dreams'),
      numberField('cp-votes', 'Votes', 0, 999),
      ratingField('cp-rating', 'Your Rating'),
      buttonField('cp-save', 'Save Palette', pickFrom(buttonVariants, index, 11)),
      buttonField('cp-reset', 'Reset', 'ghost'),
    ],
    logicNodes: [],
    layout: [],
    createdAt: now - 345600000,
    updatedAt: now,
    version: 1,
    settings: { layout: 'grid', theme: 'clay' },
  };
}

function createQuizApp(index: number): AppSchema {
  const now = Date.now();
  const tpl = pickFrom(appTemplatePool, index, 4);
  return {
    id: generateId(),
    name: tpl.name,
    description: tpl.description,
    prompt: tpl.prompt,
    fields: [
      headingField('qz-heading', 'Heading', 'h2', 'Trivia Time! 🧠'),
      imageField('qz-image', 'Quiz image', pickFrom(imagePool, index, 2), 'Quiz illustration'),
      paragraphField('qz-q1', 'Question 1', 'What is the capital of Indonesia?'),
      selectField('qz-a1', 'Answer 1', ['Jakarta', 'Bandung', 'Surabaya', 'Bali']),
      paragraphField('qz-q2', 'Question 2', 'Which planet is known as the Red Planet?'),
      selectField('qz-a2', 'Answer 2', ['Mars', 'Venus', 'Jupiter', 'Saturn']),
      numberField('qz-score', 'Your Score', 0, 100),
      ratingField('qz-rating', 'Rate this quiz'),
      colorField('qz-color', 'Theme Color', pickFrom(pastelColors, index, 12)),
      buttonField('qz-submit', 'Submit Answers', pickFrom(buttonVariants, index, 13)),
      buttonField('qz-restart', 'Restart', 'outline'),
    ],
    logicNodes: [],
    layout: [],
    createdAt: now - 432000000,
    updatedAt: now,
    version: 1,
    settings: { layout: 'vertical', theme: 'clay' },
  };
}

function createEventRsvpApp(index: number): AppSchema {
  const now = Date.now();
  const tpl = pickFrom(appTemplatePool, index, 5);
  return {
    id: generateId(),
    name: tpl.name,
    description: tpl.description,
    prompt: tpl.prompt,
    fields: [
      headingField('ev-heading', 'Heading', 'h2', 'See you at the clay jam! 🎉'),
      imageField('ev-image', 'Event flyer', pickFrom(imagePool, index, 3), 'Event flyer illustration'),
      textField('ev-guest', 'Guest Name', 'e.g. Sam'),
      emailField('ev-email', 'Email Address', 'you@example.com'),
      phoneField('ev-phone', 'Phone Number', '+62 812 3456 7890'),
      dateField('ev-date', 'Attendance Date'),
      selectField('ev-attendance', 'Attendance', ['Yes, count me in!', 'Maybe', "Can't make it"]),
      textareaField('ev-note', 'Guest Note', 'Anything the host should know...'),
      checkboxField('ev-plusone', 'Bringing a plus-one'),
      colorField('ev-color', 'Favorite pastel', pickFrom(pastelColors, index, 14)),
      buttonField('ev-submit', 'Send RSVP', pickFrom(buttonVariants, index, 15)),
    ],
    logicNodes: [],
    layout: [],
    createdAt: now - 518400000,
    updatedAt: now,
    version: 1,
    settings: { layout: 'vertical', theme: 'clay' },
  };
}

function createPetSurveyApp(index: number): AppSchema {
  const now = Date.now();
  const tpl = pickFrom(appTemplatePool, index, 6);
  return {
    id: generateId(),
    name: tpl.name,
    description: tpl.description,
    prompt: tpl.prompt,
    fields: [
      headingField('pt-heading', 'Heading', 'h2', 'Find your furry friend 🐾'),
      paragraphField('pt-intro', 'Intro', 'Tell us about your lifestyle so we can match you with the perfect pet.'),
      selectField('pt-pet', 'Preferred Pet', ['Dog', 'Cat', 'Rabbit', 'Bird', 'Hamster']),
      sliderField('pt-space', 'Living Space (1-10)', 1, 10),
      sliderField('pt-time', 'Time at Home (1-10)', 1, 10),
      checkboxField('pt-garden', 'Has a garden/yard'),
      checkboxField('pt-kids', 'Has children'),
      checkboxField('pt-pets', 'Has other pets'),
      ratingField('pt-commitment', 'Commitment Level'),
      textareaField('pt-notes', 'Anything else?', 'Share details about your home and routine...'),
      urlField('pt-portfolio', 'Pet Portfolio URL', 'https://...'),
      colorField('pt-collar', 'Collar Color', pickFrom(pastelColors, index, 16)),
      buttonField('pt-submit', 'Submit Survey', pickFrom(buttonVariants, index, 17)),
    ],
    logicNodes: [],
    layout: [],
    createdAt: now - 604800000,
    updatedAt: now,
    version: 1,
    settings: { layout: 'vertical', theme: 'clay' },
  };
}

function createBmiApp(index: number): AppSchema {
  const now = Date.now();
  return {
    id: generateId(),
    name: 'BMI Calculator',
    description: 'Calculate your Body Mass Index from height and weight with a live logic node.',
    prompt: 'Create a BMI calculator with height, weight inputs and a calculate button.',
    fields: [
      headingField('bm-heading', 'Heading', 'h2', 'BMI Calculator ⚖️'),
      paragraphField('bm-intro', 'Intro', 'Enter your height and weight to compute your Body Mass Index.'),
      numberField('bm-height', 'Height (cm)', 80, 250),
      numberField('bm-weight', 'Weight (kg)', 20, 300),
      sliderField('bm-activity', 'Activity Level', 1, 10),
      ratingField('bm-goal', 'Goal Commitment'),
      colorField('bm-color', 'Theme Color', pickFrom(pastelColors, index, 18)),
      buttonField('bm-calc', 'Calculate BMI', pickFrom(buttonVariants, index, 19)),
      buttonField('bm-reset', 'Reset', 'ghost'),
    ],
    logicNodes: [
      {
        id: 'bm-node',
        name: 'Compute BMI',
        code: 'return weight / Math.pow(height / 100, 2)',
        inputs: ['weight', 'height'],
        outputs: ['bmi'],
        version: 1,
      },
    ],
    layout: [],
    createdAt: now - 691200000,
    updatedAt: now,
    version: 1,
    settings: { layout: 'vertical', theme: 'clay' },
  };
}

function createTipApp(index: number): AppSchema {
  const now = Date.now();
  return {
    id: generateId(),
    name: 'Tip Calculator',
    description: 'Split-friendly tip & total calculator with a custom tip percentage slider.',
    prompt: 'Create a tip calculator with bill amount, tip percentage slider, and total output.',
    fields: [
      headingField('tp-heading', 'Heading', 'h2', 'Tip Calculator 💸'),
      paragraphField('tp-intro', 'Intro', 'Enter your bill amount and pick a tip percentage.'),
      numberField('tp-bill', 'Bill Amount ($)', 0, 10000),
      sliderField('tp-tip', 'Tip Percentage', 0, 30),
      toggleField('tp-round', 'Round up to nearest dollar'),
      colorField('tp-color', 'Theme Color', pickFrom(pastelColors, index, 20)),
      buttonField('tp-calc', 'Calculate Tip', pickFrom(buttonVariants, index, 21)),
    ],
    logicNodes: [
      {
        id: 'tp-tip-node',
        name: 'Compute Tip',
        code: 'return Math.round(bill * (tipPercent / 100) * 100) / 100',
        inputs: ['bill', 'tipPercent'],
        outputs: ['tip'],
        version: 1,
      },
      {
        id: 'tp-total-node',
        name: 'Compute Total',
        code: 'return Math.round((bill + tip) * 100) / 100',
        inputs: ['bill', 'tip'],
        outputs: ['total'],
        version: 1,
      },
    ],
    layout: [],
    createdAt: now - 777600000,
    updatedAt: now,
    version: 1,
    settings: { layout: 'vertical', theme: 'clay' },
  };
}

function createPortfolioApp(index: number): AppSchema {
  const now = Date.now();
  return {
    id: generateId(),
    name: 'Creative Portfolio Builder',
    description:
      'Showcase creative work with a project gallery, upload portfolio files, and collect feedback.',
    prompt:
      'Create a portfolio builder with project title, image, URL, file upload, divider, spacer, color picker, and rating.',
    fields: [
      headingField('pf-heading', 'Heading', 'h2', 'Showcase your work ✨'),
      imageField('pf-cover', 'Cover image', pickFrom(imagePool, index, 4), 'Portfolio cover illustration'),
      paragraphField('pf-intro', 'Intro', 'Add your best projects, upload supporting files, and collect ratings from visitors.'),
      dividerField('pf-divider'),
      textField('pf-project', 'Project Title', 'e.g. Clay Dashboard'),
      urlField('pf-link', 'Project Link', 'https://your-project.com'),
      fileField('pf-upload', 'Upload Portfolio (PDF)'),
      spacerField('pf-spacer'),
      colorField('pf-accent', 'Accent Color', pickFrom(pastelColors, index, 22)),
      ratingField('pf-rating', 'Rate this portfolio'),
      buttonField('pf-submit', 'Submit Portfolio', pickFrom(buttonVariants, index, 23)),
    ],
    logicNodes: [],
    layout: [],
    createdAt: now - 864000000,
    updatedAt: now,
    version: 1,
    settings: { layout: 'vertical', theme: 'clay' },
  };
}

// ─── Sample app list ───

const sampleApps: AppSchema[] = [
  createFeedbackApp(0),
  createPizzaOrderApp(1),
  createMoodTrackerApp(2),
  createColorPaletteApp(3),
  createQuizApp(4),
  createEventRsvpApp(5),
  createPetSurveyApp(6),
  createBmiApp(7),
  createTipApp(8),
  createPortfolioApp(9),
];

// ─── Content seed data (migrated from hardcoded component data) ───

const seedContent: SiteContent[] = [
  {
    id: 'nav-links',
    type: 'nav-links',
    data: [
      { label: 'Features', href: '#features' },
      { label: 'How It Works', href: '#how-it-works' },
      { label: 'Login', href: '/login' },
    ],
  },
  {
    id: 'footer-columns',
    type: 'footer-columns',
    data: [
      {
        title: 'Product',
        links: [
          { label: 'Features', href: '#features' },
          { label: 'Pricing', href: '#' },
          { label: 'Changelog', href: '#' },
          { label: 'Documentation', href: '#' },
        ],
      },
      {
        title: 'Features',
        links: [
          { label: 'AI Prompt Builder', href: '#features' },
          { label: 'Drag & Drop Editor', href: '#features' },
          { label: 'Custom JS Nodes', href: '#features' },
          { label: 'App Runner', href: '#features' },
        ],
      },
      {
        title: 'Resources',
        links: [
          { label: 'GitHub', href: '#' },
          { label: 'API Reference', href: '#' },
          { label: 'Templates', href: '#' },
          { label: 'Community', href: '#' },
        ],
      },
      {
        title: 'Company',
        links: [
          { label: 'About', href: '#' },
          { label: 'Blog', href: '#' },
          { label: 'Privacy', href: '#' },
          { label: 'Terms', href: '#' },
        ],
      },
    ],
  },
  {
    id: 'landing-features',
    type: 'landing-features',
    data: [
      { icon: 'Brain', title: 'AI Prompt Builder', description: 'Describe your app in plain English and watch the AI generate a complete form or interface automatically.' },
      { icon: 'Layout', title: 'Drag & Drop Editor', description: 'Visually arrange fields, reorder inputs, and customize layouts with an intuitive drag-and-drop canvas.' },
      { icon: 'Code2', title: 'Custom JS Nodes', description: 'Add custom JavaScript logic nodes for calculations, validations, and complex app behavior.' },
      { icon: 'Shield', title: 'Local-First Storage', description: 'Your data stays on your device with IndexedDB-backed persistence. Full privacy, zero cloud dependency.' },
      { icon: 'Play', title: 'App Runner', description: 'Run your micro-apps instantly in a clean, interactive preview. Test inputs, see outputs, iterate fast.' },
      { icon: 'Zap', title: 'Dev Playground', description: 'Live preview with Monaco editor, real-time schema validation, and instant feedback as you build.' },
    ],
  },
  {
    id: 'landing-steps',
    type: 'landing-steps',
    data: [
      { icon: 'Brain', title: 'Describe your app', description: 'Tell us what you want to build in plain language — "A BMI calculator" or "A todo list with categories".' },
      { icon: 'Layout', title: 'Customize with drag & drop', description: 'Fine-tune the generated fields, add logic nodes, and arrange the layout visually.' },
      { icon: 'Eye', title: 'Run & share', description: 'Launch your micro-app instantly, test it out, and share it with anyone via a unique link.' },
    ],
  },
  {
    id: 'landing-stats',
    type: 'landing-stats',
    data: [
      { icon: 'Copy', value: '50+', label: 'Templates' },
      { icon: 'Shield', value: '100%', label: 'Local-First' },
      { icon: 'Code2', value: 'Open', label: 'Source' },
      { icon: 'Star', value: 'MIT', label: 'License' },
    ],
  },
  {
    id: 'hero-content',
    type: 'hero-content',
    data: {
      badge: 'AI-Powered Micro-App Builder',
      titleLine1: 'Create',
      titleHighlight: 'Mini Apps',
      titleLine2: 'with AI Prompts',
      subtitle:
        'Build fully functional micro-apps by describing them in plain English. Drag, drop, and customize — no coding required.',
      primaryCta: { label: 'Get Started Free', href: '/register' },
      secondaryCta: { label: 'View Demo', href: '/login' },
    },
  },
  {
    id: 'landing-cta',
    type: 'landing-cta',
    data: {
      heading: 'Ready to build your',
      headingHighlight: 'first micro-app',
      subtitle:
        'Join users building everything from calculators to databases. No signup required to start — just describe and go.',
      primaryCta: { label: 'Get Started Free', href: '/register' },
      secondaryCta: { label: 'Sign In', href: '/login' },
    },
  },
  {
    id: 'landing-sections',
    type: 'landing-sections',
    data: {
      features: {
        title: 'Everything you need to build',
        highlight: 'micro-apps',
        subtitle:
          'From AI-powered generation to a fully interactive runtime — all in one beautiful studio.',
      },
      howItWorks: {
        title: 'How it',
        highlight: 'works',
        subtitle: 'Three simple steps to go from idea to running micro-app.',
      },
    },
  },
  {
    id: 'palette-categories',
    type: 'palette-categories',
    data: [
      { key: 'input', label: 'Input Fields' },
      { key: 'layout', label: 'Layout Elements' },
      { key: 'content', label: 'Rich Content' },
      { key: 'actions', label: 'Actions' },
    ],
  },
  {
    id: 'palette-fields',
    type: 'palette-fields',
    data: [
      { type: 'text', label: 'Text' },
      { type: 'number', label: 'Number' },
      { type: 'select', label: 'Select' },
      { type: 'checkbox', label: 'Checkbox' },
      { type: 'textarea', label: 'Textarea' },
      { type: 'date', label: 'Date' },
      { type: 'file', label: 'File' },
      { type: 'slider', label: 'Slider' },
      { type: 'toggle', label: 'Toggle' },
      { type: 'email', label: 'Email' },
      { type: 'phone', label: 'Phone' },
      { type: 'url', label: 'URL' },
      { type: 'color', label: 'Color' },
      { type: 'rating', label: 'Rating' },
      { type: 'heading', label: 'Heading' },
      { type: 'paragraph', label: 'Paragraph' },
      { type: 'divider', label: 'Divider' },
      { type: 'spacer', label: 'Spacer' },
      { type: 'image', label: 'Image' },
      { type: 'card', label: 'Card' },
      { type: 'button', label: 'Button' },
    ],
  },
];

/**
 * seedContentData — seeds nav links and footer columns into IndexedDB.
 * These were previously hardcoded in Navbar.tsx and Footer.tsx.
 */
async function seedContentData(): Promise<void> {
  for (const item of seedContent) {
    const exists = await contentRepo.exists(item.type);
    if (!exists) {
      await contentRepo.save(item);
      console.log(`[Seed] Content seeded: ${item.type}`);
    }
  }
}

/**
 * seedDatabase — Seeds the IndexedDB with sample micro-apps and site content.
 * Features varied claymorphism field types using the pastel palette (#4A3F35 text).
 * Safe to call multiple times — only seeds if DB is empty.
 */
export async function seedDatabase(): Promise<{ count: number; apps: AppSchema[] }> {
  try {
    // Also seed content data (nav, footer — migrated from hardcoded components)
    await seedContentData();

    // Check if app data already exists
    const existingCount = await microAppRepo.count();
    if (existingCount > 0) {
      console.log(`[Seed] DB already has ${existingCount} apps — skipping app seed.`);
      const existingApps = await microAppRepo.getAll();
      return { count: existingApps.length, apps: existingApps };
    }

    // Bulk save all sample apps
    await microAppRepo.bulkSave(sampleApps);
    console.log(`[Seed] Seeded ${sampleApps.length} sample apps successfully.`);
    return { count: sampleApps.length, apps: sampleApps };
  } catch (error) {
    console.error('[Seed] Failed to seed database:', error);
    return { count: 0, apps: [] };
  }
}
