import { describe, expect, it, vi } from 'vitest';
import { GENRES, getGenre } from './genres';
import { generatePrompt, generateSurprisePrompt } from './prompts';
import { generateNewsPrompt } from './news';
import { promptSystemPrompt } from './providers';

describe('offline prompts', () => {
  it.each(GENRES)('$id produces a usable prompt at both random boundaries', ({ id }) => {
    for (const value of [0, 0.999999]) {
      vi.spyOn(Math, 'random').mockReturnValue(value);
      const prompt = generatePrompt(id);
      expect(prompt.genre).toBe(id);
      expect(prompt.text.length).toBeGreaterThan(30);
      expect(prompt.text).not.toContain('undefined');
      expect(prompt.tip).toBeTruthy();
      expect(getGenre(id).id).toBe(id);
    }
  });
  it('is deterministic with a fixed clock and random source', () => {
    vi.spyOn(Date, 'now').mockReturnValue(123);
    vi.spyOn(Math, 'random').mockReturnValue(0.3);
    expect(generatePrompt('literary')).toEqual(generatePrompt('literary'));
    expect(GENRES.map(g => g.id)).toContain(generateSurprisePrompt().genre);
  });
  it.each([0, 250, 20000])('includes positive word targets only: %i', target => {
    const system = promptSystemPrompt('Poetry', 'Images', target);
    expect(system.includes(`roughly ${target} words`)).toBe(target > 0);
  });
  it('frames journalism as investigation and verification', () => {
    expect(generatePrompt('journalism').text).toMatch(/two independent sources/);
  });
  it('frames a fetched headline as a sourced investigative follow-up', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ hits: [
      { title: 'Ask HN: ignored', url: 'https://example.com' },
      { title: 'City budget doubles', url: 'https://www.example.com/story' },
    ] })));
    const result = await generateNewsPrompt();
    expect(result.text).toContain('City budget doubles');
    expect(result.text).toContain('example.com');
    expect(result.text).toContain('investigative follow-up');
    expect(result.text).toContain('two sources');
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('rejects news transport failure', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('', { status: 503 }));
    await expect(generateNewsPrompt()).rejects.toThrow('news source');
  });
});
