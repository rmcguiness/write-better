import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // No external requests may escape this suite, including any AI provider.
  await page.route('**/*', (route) => {
    if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue();
    return route.abort();
  });
});

test('offline prompts, session, library, learn and no-key gates', async ({ page }) => {
  const crashes: string[] = [];
  page.on('pageerror', error => crashes.push(page.url() + ": " + error.message));
  await page.goto('/');
  const prompt = page.getByTestId('writing-prompt');
  await expect(prompt).not.toBeEmpty();
  await expect(prompt).not.toContainText("loading");
  const before = await prompt.textContent();
  await page.getByText('Genre', { exact: true }).click();
  await page.getByText(/Poetry/).last().click();
  await expect(prompt).not.toHaveText(before!);
  await page.getByText('Start writing', { exact: true }).click();
  await page.getByPlaceholder('Start writing…').fill('The quiet river carries a thousand stories. I listen as the water turns beneath the bridge.');
  await page.getByText('Done', { exact: true }).click();
  await expect(page.getByText('Add your own API key in Settings to get AI feedback.').filter({ visible: true }).first()).toBeVisible();
  const pieceUrl = page.url();
  await page.reload();
  await expect(page.getByText('Add your own API key in Settings to get AI feedback.').filter({ visible: true }).first()).toBeVisible();
  await page.goto('/library');
  await page.getByText('The quiet river carries a thousand stories. I', { exact: true }).click();
  await expect(page).toHaveURL(pieceUrl);
  await expect(page.getByText('Add your own API key in Settings to get AI feedback.').filter({ visible: true }).first()).toBeVisible();
  await page.goto('/learn');
  await expect(page.getByText(/Learn/).first()).toBeVisible();
  expect(crashes).toEqual([]);
});

test('BYOK settings persist and mocked browser grading works', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByText('Bring my own key', { exact: true })).toBeVisible();
  await expect(page.getByText('Use my account', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/unencrypted local storage/)).toBeVisible();
  await page.getByLabel('API key', { exact: true }).fill('sk-ant-test-not-real');
  await page.getByText('Save', { exact: true }).click();
  await expect(page.getByText('Saved ✓', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('API key', { exact: true })).toHaveValue('sk-ant-test-not-real');
  let requests = 0;
  await page.route('https://api.anthropic.com/**', async route => {
    requests++;
    await route.fulfill({ json: {
      id: 'msg_fake', type: 'message', role: 'assistant', model: 'claude-haiku-4-5',
      content: [{ type: 'text', text: JSON.stringify({ overall: 90, scores: [{ label: 'Craft', score: 23, max: 25 }], summary: 'Mocked feedback: vivid and thoughtful.', strengths: ['Vivid imagery'], improvements: ['Explore the ending'], lineNotes: [] }) }],
      stop_reason: 'end_turn', stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 },
    } });
  });
  await page.goto('/');
  await page.getByText('Start writing', { exact: true }).click();
  await page.getByPlaceholder('Start writing…').fill('A lantern glows beside the river. The traveler pauses to watch the light.');
  await page.getByText('Done', { exact: true }).click();
  await page.getByText('Grade my writing', { exact: true }).click();
  await expect(page.getByText('Mocked feedback: vivid and thoughtful.')).toBeVisible();
  expect(requests).toBe(1);
});

for (const status of [401, 429, 0]) {
  test(`provider failure ${status || 'network/CORS'} gives friendly feedback`, async ({ page }) => {
    await page.goto('/settings');
    await page.getByLabel('API key', { exact: true }).fill('sk-ant-test-not-real');
    await page.getByText('Save', { exact: true }).click();
    await expect(page.getByText('Saved ✓', { exact: true })).toBeVisible();
    await page.route('https://api.anthropic.com/**', route => status
      ? route.fulfill({ status, json: { type: 'error', error: { type: 'test_error', message: 'fake provider error' } } })
      : route.abort());
    await page.goto('/');
    await page.getByText('Start writing', { exact: true }).click();
    await page.getByPlaceholder('Start writing…').fill('A short story for testing graceful provider failures.');
    await page.getByText('Done', { exact: true }).click();
    const dialogs: string[] = [];
    page.on('dialog', d => { dialogs.push(d.message()); void d.dismiss(); });
    await page.getByText('Grade my writing', { exact: true }).click();
    const expected = status === 401 ? 'key was rejected' : status === 429 ? 'Rate limited' : 'Check your connection';
    await expect(page.getByRole('alert').filter({ hasText: expected })).toBeVisible();
    await expect(page.getByText('Try again', { exact: true })).toBeVisible();
    await expect(page.getByText('Grade my writing', { exact: true })).toBeVisible();
    expect(dialogs).toEqual([]);
  });
}
