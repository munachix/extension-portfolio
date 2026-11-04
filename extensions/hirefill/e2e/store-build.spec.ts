import { expect, test } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchExtension } from '../../../packages/testing/src/index';

test('store build rejects the dev test key', async () => {
  const h = await launchExtension(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist-prod'));
  const p = await h.context.newPage();
  await p.goto(`chrome-extension://${h.extensionId}/app.html?tab=Settings`);
  await p.getByPlaceholder('Paste your license key').fill('TEST-PRO-0000-0000');
  await p.getByRole('button', { name: 'Activate' }).click();
  await expect(p.getByText('That key is not valid.')).toBeVisible();
  await h.context.close();
});
