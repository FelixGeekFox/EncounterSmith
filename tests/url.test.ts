import { afterEach, describe, expect, it, vi } from 'vitest';
import { absolute, path } from '@/lib/url';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('path at the site root', () => {
  it('leaves an ordinary path alone', () => {
    expect(path('/tools')).toBe('/tools');
    expect(path('/tools/npc-generator')).toBe('/tools/npc-generator');
  });

  it('keeps the root as a single slash', () => {
    expect(path('/')).toBe('/');
  });

  it('keeps a fragment attached', () => {
    expect(path('/free-resources#launch-list')).toBe('/free-resources#launch-list');
    expect(path('/#spark')).toBe('/#spark');
  });

  it('passes foreign URLs straight through', () => {
    expect(path('https://example.com/x')).toBe('https://example.com/x');
    expect(path('mailto:hello@example.com')).toBe('mailto:hello@example.com');
    expect(path('//cdn.example.com/x.png')).toBe('//cdn.example.com/x.png');
    expect(path('#spark')).toBe('#spark');
  });
});

describe('path under a subdirectory deployment', () => {
  const underBase = (value: string): void => {
    vi.stubEnv('BASE_URL', value);
  };

  it('prefixes an ordinary path', () => {
    underBase('/EncounterSmith/');
    expect(path('/tools')).toBe('/EncounterSmith/tools');
    expect(path('/tools/npc-generator')).toBe('/EncounterSmith/tools/npc-generator');
  });

  it('maps the root onto the base itself', () => {
    underBase('/EncounterSmith/');
    expect(path('/')).toBe('/EncounterSmith');
  });

  it('copes with a base written without a trailing slash', () => {
    underBase('/EncounterSmith');
    expect(path('/tools')).toBe('/EncounterSmith/tools');
  });

  it('keeps fragments attached', () => {
    underBase('/EncounterSmith/');
    expect(path('/free-resources#launch-list')).toBe('/EncounterSmith/free-resources#launch-list');
    expect(path('/#spark')).toBe('/EncounterSmith#spark');
  });

  it('never doubles a slash', () => {
    underBase('/EncounterSmith/');
    expect(path('tools')).toBe('/EncounterSmith/tools');
    expect(path('/brand//emblem-160.webp')).toBe('/EncounterSmith/brand/emblem-160.webp');
    expect(path('/brand/emblem-160.webp')).toBe('/EncounterSmith/brand/emblem-160.webp');
  });

  it('is idempotent, so a prefixed path is never prefixed twice', () => {
    underBase('/EncounterSmith/');
    expect(path(path('/tools'))).toBe('/EncounterSmith/tools');
    expect(path(path('/'))).toBe('/EncounterSmith');
    expect(path(path('/free-resources#launch-list'))).toBe('/EncounterSmith/free-resources#launch-list');
  });

  it('treats a protocol-relative URL as foreign, not as a path', () => {
    underBase('/EncounterSmith/');
    expect(path('//cdn.example.com/x.png')).toBe('//cdn.example.com/x.png');
  });

  it('still passes foreign URLs through untouched', () => {
    underBase('/EncounterSmith/');
    expect(path('https://example.com/x')).toBe('https://example.com/x');
    expect(path('mailto:a@b.c')).toBe('mailto:a@b.c');
  });
});

describe('absolute', () => {
  it('resolves against the origin at the root', () => {
    expect(absolute('https://encountersmith.com', '/tools')).toBe('https://encountersmith.com/tools');
    expect(absolute('https://encountersmith.com/', '/')).toBe('https://encountersmith.com/');
  });

  it('includes the base on a subdirectory deployment', () => {
    vi.stubEnv('BASE_URL', '/EncounterSmith/');
    expect(absolute('https://felixgeekfox.github.io', '/tools')).toBe(
      'https://felixgeekfox.github.io/EncounterSmith/tools',
    );
    expect(absolute('https://felixgeekfox.github.io', '/')).toBe(
      'https://felixgeekfox.github.io/EncounterSmith',
    );
  });

  it('leaves an already absolute URL alone', () => {
    expect(absolute('https://encountersmith.com', 'https://cdn.example.com/a.png')).toBe(
      'https://cdn.example.com/a.png',
    );
  });
});
