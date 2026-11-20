/**
 * navigation — shared navigation helpers for cross-page routing.
 *
 * The builder (`/builder`), runner (`/run/[id]`) and dev playground (`/dev`)
 * are unauthenticated entry points — they can be reached both from the
 * dashboard (`/app`, logged-in flow) and from the landing page (`/`,
 * anonymous flow). A plain `router.push('/app')` from those pages would
 * bounce anonymous users to /login via ProtectedRoute, while
 * `router.push('/')` drops logged-in users on the landing page even though
 * the button says "Dashboard".
 *
 * `goToDashboard` resolves the right destination at click time: `/app` when a
 * session exists, `/` otherwise.
 */
import { getSession } from '@/lib/auth';

type PushRouter = { push: (href: string) => void };

/** Navigate to the dashboard (`/app`) when logged in, else the landing page. */
export async function goToDashboard(router: PushRouter): Promise<void> {
  try {
    const session = await getSession();
    router.push(session ? '/app' : '/');
  } catch {
    // Session check failed — never trap the user; land on the public page.
    router.push('/');
  }
}
