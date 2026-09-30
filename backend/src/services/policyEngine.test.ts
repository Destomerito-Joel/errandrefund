import { describe, expect, it } from 'vitest';
import { evaluateRefundPolicy, type PolicyInput, type PolicyOrder } from './policyEngine.js';

const now = new Date('2026-09-28T12:00:00.000Z');
const baseOrder: PolicyOrder = {
  orderNumber: 'ORD-10421',
  customerEmail: 'ava@example.com',
  deliveredAt: new Date('2026-09-18T12:00:00.000Z'),
  total: 100,
  finalSale: false,
  status: 'DELIVERED',
  items: [{ name: 'Canvas Tote' }],
};
const baseInput: PolicyInput = {
  claim: { orderNumber: 'ORD-10421', issue: 'CHANGE_OF_MIND', itemName: null },
  requestEmail: 'AVA@example.com',
  requestAt: now,
  order: baseOrder,
  priorRequestCount: 0,
  injectionFlagged: false,
};

describe('evaluateRefundPolicy', () => {
  it('approves change of mind inside 30 days', () => {
    expect(evaluateRefundPolicy(baseInput)).toMatchObject({ decision: 'APPROVED', reasonCodes: ['CHANGE_OF_MIND'] });
  });

  it('approves damaged and incorrect claims with an order item match', () => {
    for (const issue of ['DAMAGED', 'INCORRECT'] as const) {
      expect(evaluateRefundPolicy({ ...baseInput, claim: { ...baseInput.claim, issue, itemName: 'Canvas Tote' } }).decision).toBe('APPROVED');
    }
  });

  it('denies final-sale orders before age and value checks', () => {
    const result = evaluateRefundPolicy({
      ...baseInput,
      order: { ...baseOrder, finalSale: true, total: 900, deliveredAt: new Date('2026-01-01T00:00:00Z') },
    });
    expect(result).toMatchObject({ decision: 'DENIED', reasonCodes: ['FINAL_SALE'] });
    expect(result.trace.at(-1)?.rule).toBe('FINAL_SALE');
  });

  it('denies delivery older than 30 days and includes exactly 30 days', () => {
    const oldOrder = { ...baseOrder, deliveredAt: new Date(now.getTime() - 31 * 86_400_000) };
    expect(evaluateRefundPolicy({ ...baseInput, order: oldOrder }).reasonCodes).toEqual(['OUTSIDE_RETURN_WINDOW']);
    const exactlyThirtyDays = { ...baseOrder, deliveredAt: new Date(now.getTime() - 30 * 86_400_000) };
    expect(evaluateRefundPolicy({ ...baseInput, order: exactlyThirtyDays }).decision).toBe('APPROVED');
  });

  it('escalates orders above $500 but allows exactly $500', () => {
    expect(evaluateRefundPolicy({ ...baseInput, order: { ...baseOrder, total: 500.01 } }).reasonCodes).toEqual(['HIGH_VALUE_ORDER']);
    expect(evaluateRefundPolicy({ ...baseInput, order: { ...baseOrder, total: 500 } }).decision).toBe('APPROVED');
  });

  it('escalates missing order, ownership mismatch, and already-refunded order', () => {
    expect(evaluateRefundPolicy({ ...baseInput, order: null }).reasonCodes).toEqual(['ORDER_NOT_FOUND']);
    expect(evaluateRefundPolicy({ ...baseInput, order: { ...baseOrder, customerEmail: 'other@example.com' } }).reasonCodes).toEqual(['ORDER_OWNERSHIP_MISMATCH']);
    expect(evaluateRefundPolicy({ ...baseInput, order: { ...baseOrder, status: 'REFUNDED' } }).reasonCodes).toEqual(['ALREADY_REFUNDED']);
    expect(evaluateRefundPolicy({ ...baseInput, order: { ...baseOrder, status: 'CANCELLED' } }).reasonCodes).toEqual(['ORDER_CANCELLED']);
  });

  it('escalates the third request inside the rolling 30-day window', () => {
    expect(evaluateRefundPolicy({ ...baseInput, priorRequestCount: 2 }).reasonCodes).toEqual(['REQUEST_LIMIT_REACHED']);
    expect(evaluateRefundPolicy({ ...baseInput, priorRequestCount: 1 }).decision).toBe('APPROVED');
  });

  it('escalates item conflicts and missing details', () => {
    expect(evaluateRefundPolicy({ ...baseInput, claim: { ...baseInput.claim, itemName: 'A different item' } }).reasonCodes).toEqual(['CLAIM_CONFLICTS_WITH_ORDER']);
    expect(evaluateRefundPolicy({ ...baseInput, claim: { ...baseInput.claim, issue: 'DAMAGED', itemName: null } }).reasonCodes).toEqual(['CLAIM_DETAILS_INCOMPLETE']);
  });

  it('escalates unknown claims and injection before an otherwise eligible claim', () => {
    expect(evaluateRefundPolicy({ ...baseInput, claim: { ...baseInput.claim, issue: 'UNKNOWN' } }).reasonCodes).toEqual(['CLAIM_UNCLEAR']);
    const injected = evaluateRefundPolicy({ ...baseInput, injectionFlagged: true, order: null });
    expect(injected.reasonCodes).toEqual(['INJECTION_FLAGGED']);
    expect(injected.trace.map((item) => item.rule)).toEqual(['INJECTION']);
  });

  it('records and respects the documented precedence across competing rules', () => {
    const result = evaluateRefundPolicy({
      ...baseInput,
      order: { ...baseOrder, finalSale: true, total: 900, deliveredAt: new Date('2026-01-01T00:00:00Z') },
      priorRequestCount: 2,
    });
    expect(result.reasonCodes).toEqual(['REQUEST_LIMIT_REACHED']);
    expect(result.trace.map((step) => step.rule)).toEqual([
      'INJECTION', 'ORDER_FOUND', 'ORDER_OWNERSHIP', 'ALREADY_REFUNDED', 'ORDER_CANCELLED', 'REQUEST_LIMIT',
    ]);
  });
});