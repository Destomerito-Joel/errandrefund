import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test?schema=public';
process.env.NODE_ENV ??= 'test';

const { callGemini, extractClaimFallback } = await import('./llm.js');
type ActiveClient = Parameters<typeof callGemini>[4];
type Options = NonNullable<Parameters<typeof callGemini>[5]>;

const primaryModel = process.env.GEMINI_MODEL ?? 'gemini-3.8-flash';
const fallbackModel = process.env.GEMINI_FALLBACK_MODEL ?? 'gemini-3.1-flash-lite';
const params = { contents: [{ role: 'user' as const, parts: [{ text: 'safe test input' }] }] };

function createClient(implementation: (model: string) => Promise<unknown>): ActiveClient {
  return {
    models: {
      generateContent: vi.fn((request: { model: string }) => implementation(request.model)),
    },
  } as unknown as ActiveClient;
}

function retryOptions(overrides: Partial<Options> = {}): Options {
  return {
    totalTimeoutMs: 8_000,
    attemptTimeoutMs: 1_000,
    primaryAttempts: 3,
    fallbackAttempts: 2,
    retryDelaysMs: [0, 0],
    random: () => 0,
    sleep: vi.fn(async () => undefined),
    now: Date.now,
    ...overrides,
  };
}

function statusError(status: number, extra: Record<string, unknown> = {}): Error {
  return Object.assign(new Error('mock provider error'), { status, ...extra });
}

const parseText = (response: { text: string | undefined }) => response.text ?? '';

describe('callGemini resilience', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
  });

  it('retries a transient 503 and succeeds on the primary model', async () => {
    let attempts = 0;
    const activeClient = createClient(async () => {
      attempts += 1;
      if (attempts === 1) throw statusError(503);
      return { text: 'primary success' };
    });

    await expect(callGemini('testCall', params, parseText, () => 'fallback', activeClient, retryOptions()))
      .resolves.toEqual({ value: 'primary success', source: 'primary' });
    expect(attempts).toBe(2);
    expect(activeClient?.models.generateContent).toHaveBeenNthCalledWith(1, expect.objectContaining({ model: primaryModel }));
    expect(activeClient?.models.generateContent).toHaveBeenNthCalledWith(2, expect.objectContaining({ model: primaryModel }));
  });

  it('uses the fallback model after primary 503 retries are exhausted', async () => {
    const seenModels: string[] = [];
    const activeClient = createClient(async (model) => {
      seenModels.push(model);
      if (model === primaryModel) throw statusError(503);
      return { text: 'fallback model success' };
    });

    await expect(callGemini('testCall', params, parseText, () => 'deterministic', activeClient, retryOptions()))
      .resolves.toEqual({ value: 'fallback model success', source: 'fallback_model' });
    expect(seenModels).toEqual([primaryModel, primaryModel, primaryModel, fallbackModel]);
  });

  it('uses the deterministic value when both models persistently return 503', async () => {
    const activeClient = createClient(async () => { throw statusError(503); });
    const deterministic = vi.fn(() => 'deterministic result');

    await expect(callGemini('testCall', params, parseText, deterministic, activeClient, retryOptions()))
      .resolves.toEqual({ value: 'deterministic result', source: 'deterministic_fallback' });
    expect(activeClient?.models.generateContent).toHaveBeenCalledTimes(5);
    expect(deterministic).toHaveBeenCalledOnce();
  });

  it.each([400, 401, 403, 404])('does not retry permanent HTTP %s errors', async (status) => {
    const activeClient = createClient(async () => { throw statusError(status); });
    const deterministic = vi.fn(() => 'safe result');

    await expect(callGemini('testCall', params, parseText, deterministic, activeClient, retryOptions()))
      .resolves.toEqual({ value: 'safe result', source: 'deterministic_fallback' });
    expect(activeClient?.models.generateContent).toHaveBeenCalledOnce();
  });

  it('recognizes transient codes from err.code', async () => {
    let attempts = 0;
    const activeClient = createClient(async () => {
      attempts += 1;
      if (attempts === 1) throw Object.assign(new Error('temporary'), { code: '503' });
      return { text: 'ok' };
    });

    await expect(callGemini('testCall', params, parseText, () => 'fallback', activeClient, retryOptions()))
      .resolves.toEqual({ value: 'ok', source: 'primary' });
    expect(attempts).toBe(2);
  });

  it('honors Retry-After in seconds', async () => {
    let attempts = 0;
    const activeClient = createClient(async () => {
      attempts += 1;
      if (attempts === 1) throw statusError(429, { headers: { 'retry-after': '2' } });
      return { text: 'retried' };
    });
    const options = retryOptions();

    await expect(callGemini('testCall', params, parseText, () => 'fallback', activeClient, options))
      .resolves.toEqual({ value: 'retried', source: 'primary' });
    expect(options.sleep).toHaveBeenCalledWith(2_000);
  });

  it('stops within the total time cap and uses the deterministic value', async () => {
    const activeClient = createClient(() => new Promise(() => undefined));
    const options = retryOptions({ totalTimeoutMs: 60, attemptTimeoutMs: 1_000, retryDelaysMs: [500, 1_500] });
    const started = Date.now();

    await expect(callGemini('testCall', params, parseText, () => 'time-cap fallback', activeClient, options))
      .resolves.toEqual({ value: 'time-cap fallback', source: 'deterministic_fallback' });
    expect(Date.now() - started).toBeLessThan(250);
    expect(activeClient?.models.generateContent).toHaveBeenCalledOnce();
  });

  it.each([
    ['I changed my mind about ORD-10421.', 'CHANGE_OF_MIND'],
    ['The order ORD-10422 arrived broken.', 'DAMAGED'],
    ['I received the wrong item for ORD-10423.', 'WRONG_ITEM'],
    ['My package never arrived for ORD-10424.', 'NOT_DELIVERED'],
  ] as const)('extracts deterministic fallback claim for %s', (message, issue) => {
    expect(extractClaimFallback(message)).toEqual({
      orderNumber: message.match(/ORD-\d+/i)?.[0] ?? null,
      issue,
      itemName: null,
    });
  });
});
