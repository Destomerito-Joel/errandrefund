import { beforeEach, describe, expect, it, vi } from 'vitest';

process.env.DATABASE_URL ??= 'postgresql://test:test@localhost:5432/test?schema=public';
process.env.NODE_ENV ??= 'test';

const { prisma } = await import('../config/prisma.js');
const { extractClaim, generateReply } = await import('./llm.js');
const { submitRefundRequest } = await import('./refundService.js');

const createRefundRequest = vi.fn(async () => ({ id: 'request-1' }));
const createAuditLog = vi.fn(async () => ({ id: 'audit-1' }));

vi.mock('../config/prisma.js', () => ({
  prisma: {
    order: { findUnique: vi.fn() },
    refundRequest: { count: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock('./llm.js', () => ({
  extractClaim: vi.fn(),
  generateReply: vi.fn(),
}));

describe('submitRefundRequest LLM source audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.order.findUnique).mockResolvedValue({
      orderNumber: 'ORD-10421',
      total: 89.99,
      deliveredAt: new Date(Date.now() - 5 * 86_400_000),
      finalSale: false,
      status: 'DELIVERED',
      items: [{ name: 'Canvas Tote' }],
      customer: { email: 'ava@example.com' },
    } as never);
    vi.mocked(prisma.refundRequest.count).mockResolvedValue(0);
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      return await (callback as (transaction: unknown) => Promise<unknown>)({
        refundRequest: { create: createRefundRequest },
        auditLog: { create: createAuditLog },
      }) as never;
    });
    vi.mocked(extractClaim).mockResolvedValue({
      value: { orderNumber: 'ORD-10421', issue: 'CHANGE_OF_MIND', itemName: null },
      source: 'fallback_model',
    });
    vi.mocked(generateReply).mockResolvedValue({
      value: 'Your request is approved.',
      source: 'primary',
    });
  });

  it('persists extraction and reply sources returned by the LLM service', async () => {
    await submitRefundRequest({
      email: 'ava@example.com',
      message: 'I changed my mind about order ORD-10421.',
    });

    expect(createAuditLog).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        steps: expect.objectContaining({
          llm: {
            extractionSource: 'fallback_model',
            replySource: 'primary',
            reply: 'Your request is approved.',
          },
        }),
      }),
    }));
  });
});
