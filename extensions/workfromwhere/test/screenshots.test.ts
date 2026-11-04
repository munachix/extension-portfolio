// Keeps the store screenshots honest: each mock's text must give the result it shows.
import { expect, it } from 'vitest';
import { detect, detectCard } from '../src/engine/detect';
const NG = { country: 'NG', timeZone: 'Africa/Lagos' };
const KE = { country: 'KE', timeZone: 'Africa/Nairobi' };
it('screenshot 1', () => expect(detect({ text: 'This role is open to US residents only.' }, NG).reason).toBe('Only open to United States'));
it('screenshot 2', () => expect(detect({ text: 'We hire anywhere in EMEA, so you can work from home.' }, KE).reason).toBe('Open to EMEA'));
it('screenshot 3', () => expect(detect({ text: 'Work from anywhere in the world. You need 4 hours of overlap with 9am–5pm EST.' }, NG).status).toBe('green'));
it('screenshot 4', () => {
  expect(detectCard('Anywhere in the World', NG).status).toBe('green');
  expect(detectCard('United States (Remote)', NG).status).toBe('red');
  expect(detectCard('EMEA (Remote)', NG).status).toBe('green');
  expect(detectCard('Remote', NG).status).toBe('yellow');
});
