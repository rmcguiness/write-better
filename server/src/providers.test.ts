import { beforeEach, describe, expect, it, vi } from 'vitest';
import { grade, review, generatePrompt } from './providers.js';
import { env } from './env.js';
const mocks = vi.hoisted(() => ({ create: vi.fn(), anthropic: vi.fn(), openai: vi.fn() }));
vi.mock('@anthropic-ai/sdk', () => ({ default: class { constructor(options: unknown) { mocks.anthropic(options); } messages = { create: mocks.create }; } }));
vi.mock('openai', () => ({ default: class { constructor(options: unknown) { mocks.openai(options); } chat = { completions: { create: mocks.create } }; } }));
const piece = { prompt: { genre: 'literary', text: 'A door opens' }, body: 'My story.' } ;
const raw = { overall: 93, scores: [{ label: 'Craft', score: 23, max: 25 }], summary: 'Good', strengths: ['Voice'], improvements: ['Pacing'], lineNotes: [] };
function respond(provider: string, text: string) {
 mocks.create.mockResolvedValue(provider === 'anthropic' ? { content: [{ type: 'thinking', thinking: 'hidden' }, { type: 'text', text }] } : { choices: [{ message: { content: text } }] });
}
beforeEach(() => { vi.clearAllMocks(); mocks.create.mockReset(); });
describe.each(['anthropic', 'openai', 'xai'] as const)('%s provider', provider => {
 beforeEach(() => { env.aiProvider = provider; });
 it('selects the client, model and structured grading request', async () => {
  respond(provider, JSON.stringify(raw));
  expect(await grade(piece)).toMatchObject({ ...raw, grade: 'A', model: 'test-model' });
  expect(provider === 'anthropic' ? mocks.anthropic : mocks.openai).toHaveBeenCalledWith(expect.objectContaining({ apiKey: 'test-key', ...(provider === 'anthropic' ? {} : { baseURL: provider === 'xai' ? 'https://api.x.ai/v1' : undefined }) }));
  const request = mocks.create.mock.calls[0][0];
  expect(request.model).toBe('test-model');
  expect(request.messages.at(-1)).toEqual({ role: 'user', content: piece.body });
  if (provider === 'anthropic') expect(request.output_config.format.type).toBe('json_schema');
  else expect(request.response_format.type).toBe(provider === 'openai' ? 'json_schema' : 'json_object');
  expect(fetch).not.toHaveBeenCalled();
 });
 it('maps review roles and trims text', async () => {
  respond(provider, '  A reply.  ');
  expect(await review(piece, [{ role: 'writer', text: 'Why?' }, { role: 'reviewer', text: 'Because.' }])).toBe('A reply.');
  expect(mocks.create.mock.calls[0][0].messages.slice(-2)).toEqual([{ role: 'user', content: 'Why?' }, { role: 'assistant', content: 'Because.' }]);
 });
 it('sends the requested prompt word target', async () => {
  respond(provider, JSON.stringify({ text: 'A prompt', tip: 'A tip' }));
  expect(await generatePrompt('poetry', 300)).toEqual({ text: 'A prompt', tip: 'A tip' });
  const req = mocks.create.mock.calls[0][0];
  expect(req.system ?? req.messages[0].content).toContain('roughly 300 words');
 });
 it('propagates a 401 without retrying or networking', async () => {
  const error = Object.assign(new Error('bad key'), { status: 401 });
  mocks.create.mockRejectedValue(error);
  await expect(grade(piece)).rejects.toBe(error);
  expect(mocks.create).toHaveBeenCalledTimes(1);
  expect(fetch).not.toHaveBeenCalled();
 });
 it('rejects malformed feedback JSON', async () => {
  respond(provider, '{broken');
  await expect(grade(piece)).rejects.toBeInstanceOf(SyntaxError);
 });
 it('preserves existing missing-field behavior', async () => {
  respond(provider, '{}');
  expect(await grade(piece)).toMatchObject({ grade: 'F' });
 });
 it.each([-5, 140])('preserves existing unclamped score %i', async overall => {
  respond(provider, JSON.stringify({ ...raw, overall }));
  expect(await grade(piece)).toMatchObject({ overall, grade: overall < 0 ? 'F' : 'A+' });
 });
});
