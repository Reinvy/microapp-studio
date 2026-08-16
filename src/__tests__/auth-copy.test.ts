/**
 * auth-copy.test.ts — Auth page copy centralization + shared shell (Cron 2, UI/UX)
 *
 * Source-level compliance checks for src/app/login/page.tsx and
 * src/app/register/page.tsx:
 * - Validation messages / API-error fallbacks / password ARIA labels must come
 *   from the centralized authCopy config module (no hardcoded strings)
 * - Both pages render through the shared AuthShell component (decorative blobs
 *   + logo + gradient card header extracted — no duplicated markup)
 * - authCopy config covers the full validation surface the pages use
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import * as path from 'node:path';

const repoRoot = path.resolve(__dirname, '..', '..');
const read = (p: string) => readFileSync(path.join(repoRoot, p), 'utf8');

const login = read('src/app/login/page.tsx');
const register = read('src/app/register/page.tsx');
const authShell = read('src/components/auth/AuthShell.tsx');
const authCopy = read('src/lib/authCopy.ts');

// Strings that used to be hardcoded in the auth pages before the Cron 2
// refactor — none of them may appear as literals in the pages anymore.
const FORMER_HARDCODED: string[] = [
  "'Email is required'",
  "'Invalid email format'",
  "'Password is required'",
  "'Password must be at least 6 characters'",
  "'Name is required'",
  "'Name must be at least 2 characters'",
  "'Passwords do not match'",
  "'You must agree to the terms'",
  "'Invalid credentials. Please try again.'",
  "'Registration failed. Please try again.'",
  "'An unexpected error occurred. Please try again.'",
  "'Show password'",
  "'Hide password'",
];

describe('Auth pages — copy centralization (Cron 2)', () => {
  it('login/register do not hardcode validation, API-error or ARIA strings', () => {
    for (const literal of FORMER_HARDCODED) {
      expect(login, `login must not contain ${literal}`).not.toContain(literal);
      expect(register, `register must not contain ${literal}`).not.toContain(literal);
    }
  });

  it('pages read validation + apiError copy from authCopy config', () => {
    expect(login).toMatch(/authCopy\.validation/);
    expect(login).toMatch(/authCopy\.apiError/);
    expect(login).toMatch(/authCopy\.aria\./);
    expect(register).toMatch(/authCopy\.validation/);
    expect(register).toMatch(/authCopy\.apiError/);
    expect(register).toMatch(/authCopy\.aria\./);
  });

  it('authCopy config covers the full validation surface', () => {
    expect(authCopy).toMatch(/emailRequired: 'Email is required'/);
    expect(authCopy).toMatch(/confirmMismatch: 'Passwords do not match'/);
    expect(authCopy).toMatch(/termsRequired: 'You must agree to the terms'/);
    expect(authCopy).toMatch(/unexpected: 'An unexpected error occurred\. Please try again\.'/);
  });
});

describe('Auth pages — shared shell (Cron 2)', () => {
  it('both pages render through the shared AuthShell component', () => {
    expect(login).toMatch(/import AuthShell from ['"]@\/components\/auth\/AuthShell['"]/);
    expect(register).toMatch(/import AuthShell from ['"]@\/components\/auth\/AuthShell['"]/);
    expect(login).toMatch(/<AuthShell/);
    expect(register).toMatch(/<AuthShell/);
  });

  it('decorative-blob markup no longer lives in the pages', () => {
    // The 4-blob blurred background moved into AuthShell — pages must not
    // redeclare it (duplicated ~10 lines each before the refactor).
    expect(login).not.toMatch(/blur\(40px\)/);
    expect(register).not.toMatch(/blur\(40px\)/);
    expect(login).not.toMatch(/blur\(50px\)/);
    expect(register).not.toMatch(/blur\(50px\)/);
  });

  it('AuthShell owns the blob backdrop exactly once', () => {
    const blobDeclarations = authShell.match(/blur\(/g) || [];
    expect(blobDeclarations.length).toBe(4);
  });
});