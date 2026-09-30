export type Decision = 'APPROVED' | 'DENIED' | 'ESCALATED';
export type ClaimIssue = 'DAMAGED' | 'INCORRECT' | 'WRONG_ITEM' | 'NOT_DELIVERED' | 'CHANGE_OF_MIND' | 'UNKNOWN';

export interface Claim {
  orderNumber: string | null;
  issue: ClaimIssue;
  itemName: string | null;
}

export interface PolicyOrder {
  orderNumber: string;
  customerEmail: string;
  deliveredAt: Date;
  total: number;
  finalSale: boolean;
  status: 'DELIVERED' | 'REFUNDED' | 'CANCELLED';
  items: Array<{ name: string; sku?: string }>;
}

export interface PolicyInput {
  claim: Claim;
  requestEmail: string;
  requestAt: Date;
  order: PolicyOrder | null;
  priorRequestCount: number;
  injectionFlagged: boolean;
}

export interface RuleTrace {
  rule: string;
  result: 'TRIGGERED' | 'CLEAR';
  detail: string;
}

export interface PolicyResult {
  decision: Decision;
  reasonCodes: string[];
  trace: RuleTrace[];
}

function finish(
  decision: Decision,
  reasonCode: string,
  trace: RuleTrace[],
): PolicyResult {
  return { decision, reasonCodes: [reasonCode], trace };
}

/** Apply refund rules in their published priority order without side effects. */
export function evaluateRefundPolicy(input: PolicyInput): PolicyResult {
  const trace: RuleTrace[] = [];
  const check = (rule: string, triggered: boolean, detail: string): boolean => {
    trace.push({ rule, result: triggered ? 'TRIGGERED' : 'CLEAR', detail });
    return triggered;
  };

  if (check('INJECTION', input.injectionFlagged, 'Prompt-injection filter result')) {
    return finish('ESCALATED', 'INJECTION_FLAGGED', trace);
  }
  if (check('ORDER_FOUND', input.order === null, 'Order lookup by extracted order number')) {
    return finish('ESCALATED', 'ORDER_NOT_FOUND', trace);
  }

  const order = input.order;
  if (!order) return finish('ESCALATED', 'ORDER_NOT_FOUND', trace);

  if (check(
    'ORDER_OWNERSHIP',
    order.customerEmail.trim().toLowerCase() !== input.requestEmail.trim().toLowerCase(),
    'Submitted email must own the database order',
  )) return finish('ESCALATED', 'ORDER_OWNERSHIP_MISMATCH', trace);

  if (check('ALREADY_REFUNDED', order.status === 'REFUNDED', 'Order refund status from database')) {
    return finish('ESCALATED', 'ALREADY_REFUNDED', trace);
  }

  if (check('ORDER_CANCELLED', order.status === 'CANCELLED', 'Cancelled orders require human review')) {
    return finish('ESCALATED', 'ORDER_CANCELLED', trace);
  }

  if (check('REQUEST_LIMIT', input.priorRequestCount >= 2, 'Current request plus prior rolling-30-day requests must be fewer than three')) {
    return finish('ESCALATED', 'REQUEST_LIMIT_REACHED', trace);
  }

  const itemMatches = input.claim.itemName === null || order.items.some((item) =>
    item.name.trim().toLowerCase() === input.claim.itemName?.trim().toLowerCase(),
  );
  if (check('CLAIM_CONSISTENCY', !itemMatches, 'Claimed item must appear in the database order items')) {
    return finish('ESCALATED', 'CLAIM_CONFLICTS_WITH_ORDER', trace);
  }

  if (check('FINAL_SALE', order.finalSale, 'Final-sale orders are not refundable')) {
    return finish('DENIED', 'FINAL_SALE', trace);
  }

  const elapsedMs = input.requestAt.getTime() - order.deliveredAt.getTime();
  const outsideWindow = elapsedMs > 30 * 24 * 60 * 60 * 1000;
  if (check('RETURN_WINDOW', outsideWindow, 'Delivery more than 30 days before request is outside the return window')) {
    return finish('DENIED', 'OUTSIDE_RETURN_WINDOW', trace);
  }

  if (check('HIGH_VALUE', order.total > 500, 'Orders strictly greater than $500 require human review')) {
    return finish('ESCALATED', 'HIGH_VALUE_ORDER', trace);
  }

  if (input.claim.issue === 'DAMAGED' || input.claim.issue === 'INCORRECT' || input.claim.issue === 'WRONG_ITEM') {
    if (input.claim.itemName === null) {
      check('DAMAGED_OR_INCORRECT', true, 'Item-specific damage or incorrect-item claim is required');
      return finish('ESCALATED', 'CLAIM_DETAILS_INCOMPLETE', trace);
    }
    check('DAMAGED_OR_INCORRECT', true, 'Eligible damaged or incorrect item claim');
    return finish('APPROVED', 'DAMAGED_OR_INCORRECT', trace);
  }

  if (input.claim.issue === 'CHANGE_OF_MIND') {
    check('CHANGE_OF_MIND', true, 'Eligible change-of-mind claim');
    return finish('APPROVED', 'CHANGE_OF_MIND', trace);
  }

  check('CLAIM_CLASSIFICATION', true, 'Claim could not be classified safely');
  return finish('ESCALATED', 'CLAIM_UNCLEAR', trace);
}