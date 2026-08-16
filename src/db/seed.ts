'use client';

import { microAppRepo } from './microAppRepo';
import { contentRepo, type SiteContent, type AuthCopy } from './contentRepo';
import type { AppSchema, FieldSchema } from '@/types/schema';
import { pastelPalette } from '@/lib/claymorphism';
import { DEFAULT_PROMPT_TEMPLATES } from '@/lib/promptTemplates';

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
  'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=400&h=300&fit=crop',
  'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=400&h=300&fit=crop',
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
    required: false,
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
    required: false,
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
    required: false,
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
    required: false,
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
    required: false,
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
    required: false,
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
    required: false,
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
    required: false,
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
    required: false,
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
    required: false,
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
    required: false,
    defaultValue: false,
    style: { borderRadius: 'lg' },
  };
}

function sliderField(id: string, label: string, min: number, max: number): FieldSchema {
  return {
    id,
    type: 'slider',
    label,
    required: false,
    min,
    max,
    step: 1,
    defaultValue: Math.round((min + max) / 2),
    style: { borderRadius: 'lg' },
  };
}

function fileField(id: string, label: string, placeholder: string): FieldSchema {
  return {
    id,
    type: 'file',
    label,
    placeholder,
    required: true,
    style: { borderRadius: 'lg' },
  };
}

function dividerField(id: string, label: string): FieldSchema {
  return {
    id,
    type: 'divider',
    label,
    required: false,
    style: { borderRadius: 'none', shadow: 'none' },
  };
}

function spacerField(id: string, label: string, height: number): FieldSchema {
  return {
    id,
    type: 'spacer',
    label,
    required: false,
    min: height,
    style: { borderRadius: 'none', shadow: 'none' },
  };
}

function cardField(id: string, label: string, content: string): FieldSchema {
  return {
    id,
    type: 'card',
    label,
    required: false,
    content,
    bgColor: '#FFFFFFF5',
    borderRadius: '2xl',
    shadow: 'md',
    style: { borderRadius: '2xl', shadow: 'md', bgColor: '#FFFFFFF5' },
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

// ─── Sample app list ───

function createJobApplicationApp(index: number): AppSchema {
  const now = Date.now();
  return {
    id: generateId(),
    name: 'Job Application Form',
    description:
      'A polished job application with resume file upload, contact fields, position select, and a referral card.',
    prompt:
      'Create a job application form with resume file upload, contact fields, and position selection.',
    fields: [
      headingField('ja-heading', 'Heading', 'h2', 'Join the clay team 🧱'),
      paragraphField('ja-intro', 'Intro', 'Fill in your details below and attach your resume. We usually reply within a week.'),
      dividerField('ja-divider', 'Divider'),
      textField('ja-name', 'Full Name', 'e.g. Jordan Lee'),
      emailField('ja-email', 'Email Address', 'you@example.com'),
      phoneField('ja-phone', 'Phone Number', '+62 812 3456 7890'),
      fileField('ja-resume', 'Resume / CV', 'PDF or DOCX, max 5MB'),
      selectField('ja-position', 'Position', ['Frontend Engineer', 'Backend Engineer', 'Product Designer', 'QA Engineer', 'DevOps']),
      toggleField('ja-relocate', 'Willing to relocate?'),
      spacerField('ja-spacer', 'Spacer', 24),
      cardField('ja-card', 'Referral', 'Know someone at the company? Add their name below.'),
      textField('ja-referral', 'Referral Name', 'Optional'),
      colorField('ja-color', 'Favorite pastel', pickFrom(pastelColors, index, 22)),
      buttonField('ja-submit', 'Submit Application', pickFrom(buttonVariants, index, 23)),
    ],
    logicNodes: [],
    layout: [],
    createdAt: now - 864000000,
    updatedAt: now,
    version: 1,
    settings: { layout: 'vertical', theme: 'clay' },
  };
}

function createMealPlannerApp(index: number): AppSchema {
  const now = Date.now();
  return {
    id: generateId(),
    name: 'Weekly Meal Planner',
    description:
      'Plan weekly meals with meal type select, ingredient checkboxes, servings, spice level, and a rating.',
    prompt:
      'Create a weekly meal planner with meal type select, ingredient checklist, and servings number.',
    fields: [
      headingField('mp-heading', 'Heading', 'h2', 'Meal Planner 🥗'),
      imageField('mp-image', 'Inspiration', pickFrom(imagePool, index, 4), 'Healthy meal prep'),
      paragraphField('mp-intro', 'Intro', 'Pick a meal, choose your ingredients, and set servings for the week.'),
      dividerField('mp-divider', 'Divider'),
      selectField('mp-meal', 'Meal Type', ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert']),
      checkboxField('mp-proteins', 'Proteins'),
      checkboxField('mp-veggies', 'Veggies'),
      checkboxField('mp-carbs', 'Carbs / Grains'),
      checkboxField('mp-dairy', 'Dairy'),
      numberField('mp-servings', 'Servings', 1, 12),
      sliderField('mp-spice', 'Spice Level', 0, 5),
      spacerField('mp-spacer', 'Spacer', 16),
      ratingField('mp-rating', 'Rate this plan'),
      colorField('mp-color', 'Theme Color', pickFrom(pastelColors, index, 24)),
      buttonField('mp-save', 'Save Plan', pickFrom(buttonVariants, index, 25)),
    ],
    logicNodes: [],
    layout: [],
    createdAt: now - 950400000,
    updatedAt: now,
    version: 1,
    settings: { layout: 'vertical', theme: 'clay' },
  };
}

function createWorkoutLoggerApp(index: number): AppSchema {
  const now = Date.now();
  return {
    id: generateId(),
    name: 'Gym Workout Logger',
    description:
      'Log daily workouts with exercise select, sets/reps numbers, intensity slider, and a notes area — tabs layout.',
    prompt:
      'Create a gym workout logger with exercise select, sets and reps number fields, intensity slider, and notes textarea.',
    fields: [
      headingField('wl-heading', 'Heading', 'h1', '💪 Workout Logger'),
      paragraphField('wl-intro', 'Intro', "Record today's session — every rep counts."),
      dateField('wl-date', 'Workout Date'),
      selectField('wl-exercise', 'Exercise', ['Bench Press', 'Squat', 'Deadlift', 'Overhead Press', 'Pull-ups', 'Plank']),
      numberField('wl-sets', 'Sets', 1, 10),
      numberField('wl-reps', 'Reps', 1, 50),
      sliderField('wl-intensity', 'Intensity', 1, 10),
      toggleField('wl-completed', 'Completed?'),
      ratingField('wl-feel', 'How did it feel?'),
      textareaField('wl-notes', 'Notes', 'Form cues, energy level, anything else...'),
      colorField('wl-color', 'Theme Color', pickFrom(pastelColors, index, 26)),
      buttonField('wl-save', 'Log Workout', pickFrom(buttonVariants, index, 27)),
    ],
    logicNodes: [
      {
        id: 'wl-volume-node',
        name: 'Compute Volume',
        code: 'return sets * reps',
        inputs: ['sets', 'reps'],
        outputs: ['volume'],
        version: 1,
      },
    ],
    layout: [],
    createdAt: now - 1036800000,
    updatedAt: now,
    version: 1,
    settings: { layout: 'tabs', theme: 'clay' },
  };
}

function createTravelBookingApp(index: number): AppSchema {
  const now = Date.now();
  return {
    id: generateId(),
    name: 'Travel Booking Form',
    description:
      'Book a clay-style getaway with destination select, travel dates, guest count, and a trip notes area — grid layout.',
    prompt:
      'Create a travel booking form with destination select, departure date, return date, guest number, and special requests textarea.',
    fields: [
      headingField('tb-heading', 'Heading', 'h2', 'Plan your getaway ✈️'),
      imageField('tb-image', 'Destination preview', pickFrom(imagePool, index, 5), 'Tropical travel destination'),
      paragraphField('tb-intro', 'Intro', 'Tell us where you want to go — we will handle the rest.'),
      dividerField('tb-divider', 'Divider'),
      textField('tb-traveller', 'Traveller Name', 'e.g. Maya Putri'),
      emailField('tb-email', 'Email Address', 'you@example.com'),
      selectField('tb-destination', 'Destination', ['Bali', 'Tokyo', 'Paris', 'Raja Ampat', 'Swiss Alps']),
      dateField('tb-depart', 'Departure Date'),
      dateField('tb-return', 'Return Date'),
      numberField('tb-guests', 'Guests', 1, 12),
      toggleField('tb-insurance', 'Add travel insurance'),
      urlField('tb-social', 'Social / Blog URL', 'https://...'),
      textareaField('tb-notes', 'Special Requests', 'Dietary needs, seating, accessibility...'),
      colorField('tb-color', 'Accent Color', pickFrom(pastelColors, index, 28)),
      buttonField('tb-submit', 'Book Now', pickFrom(buttonVariants, index, 29)),
    ],
    logicNodes: [],
    layout: [],
    createdAt: now - 1123200000,
    updatedAt: now,
    version: 1,
    settings: { layout: 'grid', theme: 'clay' },
  };
}

function createHabitTrackerApp(index: number): AppSchema {
  const now = Date.now();
  return {
    id: generateId(),
    name: 'Daily Habit Tracker',
    description:
      'Track daily habits with checkboxes, a consistency slider, streak counter, and a motivational card.',
    prompt:
      'Create a daily habit tracker with habit checkboxes, consistency slider, streak number, and a motivational card.',
    fields: [
      headingField('ht-heading', 'Heading', 'h2', 'Build better habits 🌱'),
      cardField('ht-card', 'Daily Tip', 'Small wins compound. Pick 3 habits and stay consistent!'),
      textField('ht-habit', 'New Habit', 'e.g. Drink 2L water'),
      checkboxField('ht-habit1', 'Habit 1: Morning stretch'),
      checkboxField('ht-habit2', 'Habit 2: Read 10 pages'),
      checkboxField('ht-habit3', 'Habit 3: No sugar'),
      sliderField('ht-consistency', 'Consistency (1-10)', 1, 10),
      numberField('ht-streak', 'Current Streak (days)', 0, 365),
      ratingField('ht-mood', 'How focused were you?'),
      toggleField('ht-reminder', 'Enable daily reminder'),
      spacerField('ht-spacer', 'Spacer', 16),
      colorField('ht-color', 'Accent Color', pickFrom(pastelColors, index, 30)),
      buttonField('ht-save', 'Save Day', pickFrom(buttonVariants, index, 31)),
    ],
    logicNodes: [
      {
        id: 'ht-streak-node',
        name: 'Compute Streak Score',
        code: 'return Math.round(consistency * (streak + 1) * 100) / 100',
        inputs: ['consistency', 'streak'],
        outputs: ['score'],
        version: 1,
      },
    ],
    layout: [],
    createdAt: now - 1209600000,
    updatedAt: now,
    version: 1,
    settings: { layout: 'vertical', theme: 'clay' },
  };
}

function createNewsletterApp(index: number): AppSchema {
  const now = Date.now();
  return {
    id: generateId(),
    name: 'Newsletter Signup',
    description:
      'A simple clay-styled newsletter signup with name, email, topic select, and a consent checkbox.',
    prompt:
      'Create a newsletter signup form with name, email address, topic select, and consent checkbox.',
    fields: [
      headingField('nl-heading', 'Heading', 'h2', 'Stay in the loop 💌'),
      paragraphField('nl-intro', 'Intro', 'One clay-themed email a week. No spam, ever.'),
      textField('nl-name', 'Your Name', 'e.g. Dewi Lestari'),
      emailField('nl-email', 'Email Address', 'you@example.com'),
      selectField('nl-topic', 'Favorite Topic', ['Micro-App Tips', 'Design Systems', 'Product News', 'Community Spotlights']),
      selectField('nl-frequency', 'Frequency', ['Weekly', 'Bi-weekly', 'Monthly']),
      checkboxField('nl-consent', 'I agree to receive the newsletter'),
      colorField('nl-color', 'Theme Color', pickFrom(pastelColors, index, 32)),
      buttonField('nl-submit', 'Subscribe', pickFrom(buttonVariants, index, 33)),
      buttonField('nl-unsub', 'Unsubscribe', 'ghost'),
    ],
    logicNodes: [],
    layout: [],
    createdAt: now - 1296000000,
    updatedAt: now,
    version: 1,
    settings: { layout: 'vertical', theme: 'clay' },
  };
}

function createRestaurantReservationApp(index: number): AppSchema {
  const now = Date.now();
  return {
    id: generateId(),
    name: 'Restaurant Reservation',
    description:
      'Book a clay-styled table with party size, occasion select, dietary checkboxes, and a special requests area — grid layout.',
    prompt:
      'Create a restaurant reservation form with date, time slot select, party size number, dietary checkboxes, and special requests textarea.',
    fields: [
      headingField('rr-heading', 'Heading', 'h2', 'Reserve your table 🍽️'),
      imageField('rr-image', 'Restaurant preview', pickFrom(imagePool, index, 6), 'Cozy restaurant interior'),
      paragraphField('rr-intro', 'Intro', 'Pick a date and time — we will hold the table for 15 minutes.'),
      dividerField('rr-divider', 'Divider'),
      textField('rr-name', 'Name', 'e.g. Rina Wijaya'),
      emailField('rr-email', 'Email Address', 'you@example.com'),
      phoneField('rr-phone', 'Phone Number', '+62 812 3456 7890'),
      dateField('rr-date', 'Reservation Date'),
      selectField('rr-time', 'Time Slot', ['12:00', '13:00', '18:00', '19:00', '20:00']),
      numberField('rr-guests', 'Party Size', 1, 20),
      selectField('rr-occasion', 'Occasion', ['Casual', 'Birthday', 'Anniversary', 'Business', 'Date Night']),
      checkboxField('rr-veggie', 'Vegetarian options needed'),
      checkboxField('rr-vegan', 'Vegan options needed'),
      checkboxField('rr-gluten', 'Gluten-free options needed'),
      sliderField('rr-window', 'Arrival Flexibility (1-10)', 1, 10),
      toggleField('rr-highchair', 'Need a highchair'),
      ratingField('rr-priority', 'Party Importance'),
      textareaField('rr-notes', 'Special Requests', 'Allergies, seating preference, decorations...'),
      spacerField('rr-spacer', 'Spacer', 16),
      colorField('rr-color', 'Accent Color', pickFrom(pastelColors, index, 34)),
      buttonField('rr-submit', 'Reserve Table', pickFrom(buttonVariants, index, 35)),
    ],
    logicNodes: [
      {
        id: 'rr-cover-node',
        name: 'Compute Total Covers',
        code: 'return guests + (highchair ? 1 : 0)',
        inputs: ['guests', 'highchair'],
        outputs: ['totalCovers'],
        version: 1,
      },
    ],
    layout: [],
    createdAt: now - 1382400000,
    updatedAt: now,
    version: 1,
    settings: { layout: 'grid', theme: 'clay' },
  };
}

function createPlantCareApp(index: number): AppSchema {
  const now = Date.now();
  return {
    id: generateId(),
    name: 'Plant Care Tracker',
    description:
      'Track watering, sunlight, and plant health with a photo, care sliders, and a growth rating — card layout.',
    prompt:
      'Create a plant care tracker with plant photo, name text, watering frequency select, sunlight slider, and health rating.',
    fields: [
      headingField('pc-heading', 'Heading', 'h2', 'Nurture your green friends 🌿'),
      imageField('pc-image', 'Plant photo', pickFrom(imagePool, index, 7), 'Your plant'),
      textField('pc-name', 'Plant Name', 'e.g. Monstera Deliciosa'),
      selectField('pc-water', 'Watering', ['Daily', 'Every 2 days', 'Weekly', 'Bi-weekly']),
      sliderField('pc-sunlight', 'Sunlight (1-10)', 1, 10),
      sliderField('pc-humidity', 'Humidity (1-10)', 1, 10),
      ratingField('pc-health', 'Health Rating'),
      numberField('pc-age', 'Age (months)', 0, 120),
      checkboxField('pc-fertilized', 'Fertilized this month'),
      toggleField('pc-repot', 'Repot due'),
      textareaField('pc-notes', 'Care Notes', 'Leaf color, pests, growth...'),
      colorField('pc-pot', 'Pot Color', pickFrom(pastelColors, index, 36)),
      cardField('pc-tip', 'Care Tip', 'Most houseplants enjoy bright, indirect light and consistent moisture.'),
      buttonField('pc-save', 'Save Entry', pickFrom(buttonVariants, index, 37)),
    ],
    logicNodes: [
      {
        id: 'pc-care-node',
        name: 'Compute Care Score',
        code: 'return Math.round((sunlight + humidity + health) / 3 * 10) / 10',
        inputs: ['sunlight', 'humidity', 'health'],
        outputs: ['careScore'],
        version: 1,
      },
    ],
    layout: [],
    createdAt: now - 1468800000,
    updatedAt: now,
    version: 1,
    settings: { layout: 'vertical', theme: 'clay' },
  };
}

function createGiftRegistryApp(index: number): AppSchema {
  const now = Date.now();
  return {
    id: generateId(),
    name: 'Gift Registry',
    description:
      'Curate a wishlist with gift name, price range slider, priority rating, and a reserved toggle — tabs layout.',
    prompt:
      'Create a gift registry with gift name, category select, price slider, priority rating, and reserved checkbox.',
    fields: [
      headingField('gr-heading', 'Heading', 'h2', 'Wishlist & Gift Registry 🎁'),
      paragraphField('gr-intro', 'Intro', 'Add gifts you would love, and let friends claim them without spoiling surprises.'),
      textField('gr-name', 'Gift Name', 'e.g. Ceramic Pour-Over Set'),
      selectField('gr-category', 'Category', ['Home', 'Kitchen', 'Books', 'Tech', 'Hobby', 'Experience']),
      sliderField('gr-price', 'Price Range (1-10)', 1, 10),
      ratingField('gr-priority', 'Priority'),
      checkboxField('gr-reserved', 'Reserved by someone'),
      textField('gr-reserved-by', 'Reserved By', 'Optional — who claimed it?'),
      urlField('gr-link', 'Product Link', 'https://...'),
      textareaField('gr-notes', 'Notes', 'Size, color, or any details...'),
      colorField('gr-color', 'Accent Color', pickFrom(pastelColors, index, 38)),
      dividerField('gr-divider', 'Divider'),
      buttonField('gr-save', 'Add Gift', pickFrom(buttonVariants, index, 39)),
      buttonField('gr-clear', 'Clear', 'ghost'),
    ],
    logicNodes: [],
    layout: [],
    createdAt: now - 1555200000,
    updatedAt: now,
    version: 1,
    settings: { layout: 'tabs', theme: 'clay' },
  };
}

export const sampleApps: AppSchema[] = [
  createFeedbackApp(0),
  createPizzaOrderApp(1),
  createMoodTrackerApp(2),
  createColorPaletteApp(3),
  createQuizApp(4),
  createEventRsvpApp(5),
  createPetSurveyApp(6),
  createBmiApp(7),
  createTipApp(8),
  createJobApplicationApp(9),
  createMealPlannerApp(10),
  createWorkoutLoggerApp(11),
  createTravelBookingApp(12),
  createHabitTrackerApp(13),
  createNewsletterApp(14),
  createRestaurantReservationApp(15),
  createPlantCareApp(16),
  createGiftRegistryApp(17),
];

// ─── Content seed data (migrated from hardcoded component data) ───

export const seedContent: SiteContent[] = [
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
    id: 'hero-showcase',
    type: 'hero-showcase',
    data: {
      windowUrl: 'my-micro-app',
      leftTile: 'Preview your app',
      rightTile: 'Edit with AI',
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
    id: 'dashboard-empty',
    type: 'dashboard-empty',
    data: {
      emptyTitle: 'No apps yet',
      emptySubtitle:
        "Create your first micro-app with AI — describe what you want to build and we'll generate it for you.",
      ctaLabel: 'Create Your First App',
      noResultsTitle: 'No matching apps',
      noResultsSubtitle: 'Try a different search term or clear the filter.',
    },
  },
  {
    id: 'dashboard-config',
    type: 'dashboard-config',
    data: {
      searchPlaceholder: 'Search your apps...',
      searchDebounceMs: 300,
      sortOptions: [
        { value: { field: 'updatedAt', direction: 'desc' }, label: 'Newest Updated' },
        { value: { field: 'updatedAt', direction: 'asc' }, label: 'Oldest Updated' },
        { value: { field: 'createdAt', direction: 'desc' }, label: 'Newest Created' },
        { value: { field: 'createdAt', direction: 'asc' }, label: 'Oldest Created' },
        { value: { field: 'name', direction: 'asc' }, label: 'Name A–Z' },
        { value: { field: 'name', direction: 'desc' }, label: 'Name Z–A' },
      ],
      pageSizes: [12, 24, 48],
      progressiveInitialBatch: 6,
      progressiveBatchSize: 6,
    },
  },
  {
    id: 'dashboard-stats-copy',
    type: 'dashboard-stats-copy',
    data: {
      appsLabel: 'Apps',
      fieldsLabel: 'Fields',
      logicLabel: 'Logic',
      topTypeLabel: 'Top Type',
      weekTemplate: '+{count} this week',
      avgTemplate: 'Avg {count} per app',
      fieldCountTemplate: '{count} fields',
      noValue: '—',
    },
  },
  {
    id: 'app-card-copy',
    type: 'app-card-copy',
    data: {
      noDescription: 'No description',
      runLabel: 'Run',
      fieldSingular: 'field',
      fieldPlural: 'fields',
      nodeSingular: 'node',
      nodePlural: 'nodes',
      moreTemplate: '+{count} more',
    },
  },
  {
    id: 'new-app-dialog-copy',
    type: 'new-app-dialog-copy',
    data: {
      title: 'Create New App',
      subtitle: 'Describe what you want to build',
      nameLabel: 'App Name',
      namePlaceholder: 'My Calculator',
      promptLabel: 'Prompt (optional)',
      promptPlaceholder:
        'e.g. A discount calculator with price, discount %, and tax fields...',
      templatesLabel: 'Try an example',
      cancelLabel: 'Cancel',
      generateLabel: 'Generate',
      creatingLabel: 'Creating...',
    },
  },
  {
    id: 'import-dialog-copy',
    type: 'import-dialog-copy',
    data: {
      title: 'Import Backup',
      description:
        'Restore your micro apps from a JSON backup file. All data stays in your browser\'s IndexedDB — nothing is uploaded.',
      chooseFile: 'Choose a backup file',
      fileHint: '.json exported from MicroApp Studio',
      mergeTitle: 'Merge',
      mergeDescription: 'Keep existing apps, update matching ids',
      replaceTitle: 'Replace',
      replaceDescription: 'Wipe current apps, restore backup',
      noFileError: 'Select a backup JSON file first.',
      importError: 'Failed to import backup.',
      resultPrefix: 'Import complete — ',
      addedTemplate: '{count} added',
      updatedTemplate: '{count} updated',
      failedTemplate: '{count} failed',
      resultSuffix: '.',
      tipPrefix: 'Tip: use the ',
      tipHighlight: 'Export',
      tipSuffix: ' button on the dashboard to create backups.',
      cancelLabel: 'Cancel',
      importLabel: 'Import',
      importingLabel: 'Importing…',
    },
  },
  {
    id: 'recently-run-copy',
    type: 'recently-run-copy',
    data: {
      title: 'Recently Run',
      subtitle: 'Your latest app launches',
      emptyText: 'No runs yet — hit Run on any app card to start your trail.',
      chipLabel: 'Open',
      regionLabel: 'Recently run apps',
      viewAllLabel: 'View all',
    },
  },
  {
    // Full-trail browser copy for RunHistoryDialog — the paginated dialog
    // opened from the Recently Run strip's "View all" action. Editable
    // without a redeploy, with a built-in fallback in the component.
    id: 'run-history-dialog-copy',
    type: 'run-history-dialog-copy',
    data: {
      title: 'Run History',
      subtitle: 'Your full app-launch trail — newest first',
      emptyText: 'No runs yet — hit Run on any app card to start your trail.',
      openLabel: 'Open',
      regionLabel: 'Run history list',
      closeLabel: 'Close',
      clearLabel: 'Clear history',
      confirmClear: 'Clear the entire run history? This cannot be undone.',
      clearingLabel: 'Clearing…',
      prevAria: 'Previous page',
      nextAria: 'Next page',
      pageAria: 'Go to page {page}',
      jumpInputAria: 'Jump to page',
      goAria: 'Go to page {page}',
    },
  },
  {
    // Chip background palette for the Recently Run strip — previously
    // hardcoded in RecentlyRun.tsx. Full claymorphism pastel palette,
    // cycled per item; editable without a redeploy.
    id: 'recently-run-chips',
    type: 'recently-run-chips',
    data: ['#FFD5E5', '#C5E8F7', '#D5B8F5', '#FFF2C5', '#C5F0D5', '#FFE5D0'],
  },
  {
    id: 'auth-copy',
    type: 'auth-copy',
    data: {
      login: {
        title: 'Welcome back',
        subtitle: 'Sign in to continue building your apps.',
        emailLabel: 'Email',
        emailPlaceholder: 'you@example.com',
        passwordLabel: 'Password',
        passwordPlaceholder: 'Enter your password',
        forgotPassword: 'Forgot password?',
        submitLabel: 'Sign In',
        submittingLabel: 'Signing in...',
        socialDivider: 'Or continue with',
        googleLabel: 'Google',
        githubLabel: 'GitHub',
        bottomPrefix: "Don't have an account?",
        bottomCta: 'Sign up',
      },
      register: {
        title: 'Create an account',
        subtitle: 'Start building micro-apps in minutes.',
        nameLabel: 'Name',
        namePlaceholder: 'Your full name',
        emailLabel: 'Email',
        emailPlaceholder: 'you@example.com',
        passwordLabel: 'Password',
        passwordPlaceholder: 'At least 6 characters',
        confirmLabel: 'Confirm Password',
        confirmPlaceholder: 'Repeat your password',
        termsPrefix: 'I agree to the',
        termsLink: 'Terms of Service',
        termsAnd: 'and',
        privacyLink: 'Privacy Policy',
        submitLabel: 'Create account',
        submittingLabel: 'Creating account...',
        socialDivider: 'Or sign up with',
        googleLabel: 'Google',
        githubLabel: 'GitHub',
        bottomPrefix: 'Already have an account?',
        bottomCta: 'Sign in',
      },
    } satisfies AuthCopy,
  },
  {
    id: 'footer-brand',
    type: 'footer-brand',
    data: {
      brandName: 'MicroApp Studio',
      tagline:
        'Build, run, and share custom micro-apps with AI-powered prompts and a visual drag-and-drop builder.',
      socials: [
        { label: 'GitHub', href: '#' },
        { label: 'Twitter', href: '#' },
      ],
      copyright: '© {year} MicroApp Studio. All rights reserved. Built with care.',
    },
  },
  {
    id: 'prompt-templates',
    type: 'prompt-templates',
    data: DEFAULT_PROMPT_TEMPLATES,
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
