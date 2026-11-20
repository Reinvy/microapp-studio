/**
 * Deep link parsing for `microapp://<source>/<app-id>/<route>?params` and the
 * `?target=` query form.
 */

export interface DeepLinkTarget {
  source: string;
  appId: string;
  route: string;
  params: Record<string, string>;
}

const APP_ID = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9-]*)+$/;

export function parseDeepLink(raw: string): DeepLinkTarget | null {
  let source = 'local';
  let appId = '';
  let route = '/';
  let params: Record<string, string> = {};
  if (raw.startsWith('microapp://')) {
    const withoutScheme = raw.slice('microapp://'.length);
    const [pathPart, query = ''] = withoutScheme.split('?');
    const segments = (pathPart ?? '').split('/').filter(Boolean);
    if (segments.length < 2) return null;
    source = segments[0] ?? 'local';
    appId = segments[1] ?? '';
    route = segments.length > 2 ? `/${segments.slice(2).join('/')}` : '/';
    params = Object.fromEntries(new URLSearchParams(query));
  } else {
    // Plain `?target=` values may be `source/app-id/route` or just `app-id`.
    const [pathPart, query = ''] = raw.split('?');
    const segments = (pathPart ?? '').split('/').filter(Boolean);
    if (segments.length === 1) appId = segments[0] ?? '';
    else if (segments.length >= 2) {
      source = segments[0] ?? 'local';
      appId = segments[1] ?? '';
      route = segments.length > 2 ? `/${segments.slice(2).join('/')}` : '/';
    }
    params = Object.fromEntries(new URLSearchParams(query));
  }
  if (!APP_ID.test(appId)) return null;
  return { source, appId, route, params };
}
