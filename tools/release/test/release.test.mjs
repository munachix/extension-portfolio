import { expect, it } from 'vitest';
import { checkLimits, parseSpecListing } from '../release.mjs';

it('reads the store listing out of a spec', () => {
  const md = '## Store listing\n- **Name (75 max):** Foo: Bar\n- **Summary (132 max):** Does a thing.\n- **Category:** Productivity → Tools\n- **SEO keywords:** a, b';
  expect(parseSpecListing(md)).toEqual({ name: 'Foo: Bar', summary: 'Does a thing.', category: 'Productivity → Tools', keywords: 'a, b' });
});

it('fails names, summaries and descriptions over the store limits', () => {
  expect(checkLimits({ name: 'x'.repeat(76), summary: 'ok', description: 'ok' })).toEqual(['name is 76 characters (limit 75)']);
  expect(checkLimits({ name: 'ok', summary: 'y'.repeat(133), description: '' })).toHaveLength(2);
  expect(checkLimits({ name: 'ok', summary: 'ok', description: 'ok' })).toEqual([]);
});
