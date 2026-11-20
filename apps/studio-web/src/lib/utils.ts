import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Generate a unique ID */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

/** Format a timestamp to readable date */
export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}
