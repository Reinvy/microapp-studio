/**
 * promptTemplates — pure, framework-free prompt template helpers.
 *
 * The NewAppDialog previously rendered only a hardcoded placeholder as the
 * "example prompt" hint. This module defines the canonical shape for
 * clickable prompt-suggestion templates and a sanitizer that validates
 * whatever comes out of IndexedDB, so a corrupt or hand-edited
 * `prompt-templates` record can never break the dialog — every invalid
 * entry falls back to a safe default.
 *
 * The DEFAULT_PROMPT_TEMPLATES values intentionally mirror the long-standing
 * hardcoded examples; the dialog starts from these and is then overridden at
 * runtime by the seeded `prompt-templates` content record.
 */

/** One clickable prompt suggestion shown in the New App dialog. */
export interface PromptTemplate {
  /** Short label shown on the chip. */
  label: string;
  /** Full prompt text inserted into the prompt textarea when clicked. */
  prompt: string;
  /** Clay pastel Tailwind bg class for the chip (v3 design system). */
  bgClass: string;
}

/** Claymorphism v3 pastel chip classes — no hardcoded hex in components. */
const PASTEL_CHIP_CLASSES = [
  'bg-[#FFD5E5]', // pink
  'bg-[#C5E8F7]', // blue
  'bg-[#D5B8F5]', // purple
  'bg-[#FFF2C5]', // yellow
  'bg-[#C5F0D5]', // green
  'bg-[#FFE5D0]', // peach
] as const;

/** Fallback templates — matches the long-standing hardcoded suggestions. */
export const DEFAULT_PROMPT_TEMPLATES: PromptTemplate[] = [
  {
    label: 'Discount calculator',
    prompt:
      'A discount calculator with price, discount percentage, and tax fields, plus a calculate button that shows the final total.',
    bgClass: PASTEL_CHIP_CLASSES[0],
  },
  {
    label: 'Event RSVP',
    prompt:
      'An event RSVP form with guest name, email, attendance select, plus-one checkbox, and a note textarea.',
    bgClass: PASTEL_CHIP_CLASSES[1],
  },
  {
    label: 'Mood tracker',
    prompt:
      'A daily mood tracker with an emoji rating, journal textarea, energy level select, and a save button.',
    bgClass: PASTEL_CHIP_CLASSES[2],
  },
  {
    label: 'Quiz',
    prompt:
      'A trivia quiz with multiple choice selects, a score number field, and a submit answers button.',
    bgClass: PASTEL_CHIP_CLASSES[3],
  },
  {
    label: 'Pet survey',
    prompt:
      'A pet adoption survey with preferred pet select, lifestyle toggles, living-space slider, and a rating widget.',
    bgClass: PASTEL_CHIP_CLASSES[4],
  },
  {
    label: 'BMI calculator',
    prompt:
      'A BMI calculator with height and weight number fields and a calculate button that computes the result.',
    bgClass: PASTEL_CHIP_CLASSES[5],
  },
];

/** Bounds applied by the sanitizer — keeps DB-provided templates sane. */
const MAX_TEMPLATES = 12;
const MAX_LABEL_LENGTH = 40;
const MAX_PROMPT_LENGTH = 500;

const VALID_CHIP_CLASSES = new Set<string>(PASTEL_CHIP_CLASSES);

/** Fallback chip class for DB entries that ship an unknown bgClass. */
const FALLBACK_CHIP_CLASS = PASTEL_CHIP_CLASSES[0];

/**
 * Sanitize an unknown value into a fully valid PromptTemplate[].
 *
 * Never throws and never returns partial data: every entry is validated
 * independently and dropped (not crash) when invalid; if nothing valid
 * remains, the defaults are returned. This is the single gate between
 * IndexedDB content and the New App dialog UI.
 */
export function sanitizePromptTemplates(raw: unknown): PromptTemplate[] {
  if (!Array.isArray(raw)) return DEFAULT_PROMPT_TEMPLATES;

  const valid = raw
    .filter((item): item is Record<string, unknown> =>
      typeof item === 'object' && item !== null
    )
    .map((item) => {
      const label =
        typeof item.label === 'string'
          ? item.label.trim().slice(0, MAX_LABEL_LENGTH)
          : '';
      const prompt =
        typeof item.prompt === 'string'
          ? item.prompt.trim().slice(0, MAX_PROMPT_LENGTH)
          : '';
      if (label.length === 0 || prompt.length === 0) return null;
      const bgClass =
        typeof item.bgClass === 'string' && VALID_CHIP_CLASSES.has(item.bgClass)
          ? item.bgClass
          : FALLBACK_CHIP_CLASS;
      return { label, prompt, bgClass } as PromptTemplate;
    })
    .filter((t): t is PromptTemplate => t !== null);

  return valid.length > 0 ? valid.slice(0, MAX_TEMPLATES) : DEFAULT_PROMPT_TEMPLATES;
}
