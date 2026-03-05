import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function safeDate(dateStr: string | undefined | null): Date {
  if (!dateStr) return new Date();
  // Handle SQL timestamp format "YYYY-MM-DD HH:MM:SS"
  if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(dateStr)) {
    return new Date(dateStr.replace(' ', 'T') + 'Z'); // Assume UTC
  }
  return new Date(dateStr);
}
