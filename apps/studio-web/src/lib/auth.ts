'use client';

import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

const SECRET = new TextEncoder().encode('microapp-studio-secret-key-2024');
const USERS_KEY = 'microapp_users';
const SESSION_KEY = 'microapp_session';

export interface User {
  id: string;
  email: string;
  name: string;
  password: string; // hashed
  createdAt: number;
}

export interface Session {
  userId: string;
  email: string;
  name: string;
  token: string;
}

// Generate unique ID
function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

// Get users from localStorage
function getUsers(): User[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  } catch { return []; }
}

// Save users to localStorage
function saveUsers(users: User[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export async function registerUser(email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> {
  const users = getUsers();

  // Check if email exists
  if (users.find(u => u.email === email)) {
    return { success: false, error: 'Email already registered' };
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);

  // Create user
  const user: User = {
    id: generateId(),
    email,
    name,
    password: hashedPassword,
    createdAt: Date.now(),
  };

  users.push(user);
  saveUsers(users);

  return { success: true };
}

export async function loginUser(email: string, password: string): Promise<{ success: boolean; error?: string; session?: Session }> {
  const users = getUsers();
  const user = users.find(u => u.email === email);

  if (!user) {
    return { success: false, error: 'Email not found' };
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return { success: false, error: 'Invalid password' };
  }

  // Create JWT token
  const token = await new SignJWT({ userId: user.id, email: user.email, name: user.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(SECRET);

  const session: Session = {
    userId: user.id,
    email: user.email,
    name: user.name,
    token,
  };

  // Save session
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));

  return { success: true, session };
}

export async function getSession(): Promise<Session | null> {
  if (typeof window === 'undefined') return null;
  try {
    const data = localStorage.getItem(SESSION_KEY);
    if (!data) return null;

    const session: Session = JSON.parse(data);

    // Verify token
    try {
      await jwtVerify(session.token, SECRET);
      return session;
    } catch {
      logoutUser();
      return null;
    }
  } catch {
    return null;
  }
}

export function logoutUser(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
}

export function validateEmail(email: string): string | null {
  if (!email) return 'Email is required';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Invalid email format';
  return null;
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required';
  if (password.length < 6) return 'Password must be at least 6 characters';
  return null;
}

export function validateName(name: string): string | null {
  if (!name) return 'Name is required';
  if (name.length < 2) return 'Name must be at least 2 characters';
  return null;
}
