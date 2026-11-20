import { describe, expect, it } from 'vitest';
import { parseDeepLink } from '../parse';

describe('deep links', () => {
  it('parses microapp:// links with route and params', () => {
    expect(parseDeepLink('microapp://registry/org.reinvy.kas/detail?id=42')).toEqual({
      source: 'registry',
      appId: 'org.reinvy.kas',
      route: '/detail',
      params: { id: '42' },
    });
  });

  it('parses ?target= values and bare app ids', () => {
    expect(parseDeepLink('local/org.reinvy.kas')).toMatchObject({ appId: 'org.reinvy.kas', route: '/' });
    expect(parseDeepLink('org.reinvy.kas')).toMatchObject({ appId: 'org.reinvy.kas', source: 'local' });
  });

  it('rejects malformed or unsafe targets', () => {
    expect(parseDeepLink('microapp://registry')).toBeNull();
    expect(parseDeepLink('microapp://registry/Bad.Id')).toBeNull();
    expect(parseDeepLink('microapp://registry/../etc/passwd')).toBeNull();
    expect(parseDeepLink('')).toBeNull();
  });
});
