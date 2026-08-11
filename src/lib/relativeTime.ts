/**
 * relativeTime — pure, framework-free relative-time formatting.
 *
 * Used by the dashboard "Recently Run" strip to render human timestamps
 * ("just now", "5m ago", "2h ago", "3d ago"). Kept in lib (not the component)
 * so it is trivially unit-testable and reusable by any view.
 */

/** Format an epoch-ms timestamp relative to `now` (defaults to Date.now()). */
export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return '—';

  const diffMs = now - timestamp;
  if (diffMs < 0) return 'just now';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 45) return 'just now';

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(months / 12);
  return `${years}y ago`;
}
