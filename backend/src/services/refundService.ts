import { Decision as PrismaDecision, Prisma, RequestStatus } from '@prisma/client';
import { prisma } from '../config/prisma.js';
import { scanForPromptInjection } from './injectionFilter.js';
import { extractClaim, generateReply, type LlmResultSource } from './llm.js';
import { evaluateRefundPolicy, type Claim, type PolicyOrder, type RuleTrace } from './policyEngine.js';

const fallbackClaim: Claim = { orderNumber: null, issue: 'UNKNOWN', itemName: null };
const fallbackReply = 'We could not safely process this request automatically. A support specialist will review it and follow up.';

export interface SubmitRefundInput {
  email: string;
  message: string;
}

function orderForPolicy(order: {
  orderNumber: string;
  total: Prisma.Decimal;
  deliveredAt: Date;
  finalSale: boolean;
  status: 'DELIVERED' | 'REFUNDED' | 'CANCELLED';
  items: Prisma.JsonValue;
  customer: { email: string };
}): PolicyOrder {
  const items = Array.isArray(order.items)
    ? order.items.flatMap((item) => {
      if (typeof item !== 'object' || item === null || !('name' in item) || typeof item.name !== 'string') return [];
      return [{ name: item.name, ...('sku' in item && typeof item.sku === 'string' ? { sku: item.sku } : {}) }];
    })
    : [];
  return {
    orderNumber: order.orderNumber,
    customerEmail: order.customer.email,
    deliveredAt: order.deliveredAt,
    total: Number(order.total),
    finalSale: order.finalSale,
    status: order.status,
    items,
  };
}

/** Run extraction, database verification, deterministic policy evaluation, and audit persistence. */
export async function submitRefundRequest(input: SubmitRefundInput) {
  const email = input.email.trim().toLowerCase();
  const requestAt = new Date();
  const injection = scanForPromptInjection(input.message);
  const extraction = injection.flagged
    ? { value: fallbackClaim, source: 'deterministic_fallback' as const }
    : await extractClaim(input.message);
  let claim = extraction.value;

  if (claim.orderNumber) {
    claim = { ...claim, orderNumber: claim.orderNumber.trim().toUpperCase() };
  }

  const orderRecord = claim.orderNumber
    ? await prisma.order.findUnique({ where: { orderNumber: claim.orderNumber }, include: { customer: true } })
    : null;
  const order = orderRecord ? orderForPolicy(orderRecord) : null;
  const priorRequestCount = await prisma.refundRequest.count({
    where: { customerEmail: email, createdAt: { gte: new Date(requestAt.getTime() - 30 * 86_400_000) } },
  });

  let result = evaluateRefundPolicy({
    claim,
    requestEmail: email,
    requestAt,
    order,
    priorRequestCount,
    injectionFlagged: injection.flagged,
  });
  const generatedReply = injection.flagged
    ? { value: fallbackReply, source: 'deterministic_fallback' as const }
    : await generateReply(result.decision, result.reasonCodes, order);
  const reply = generatedReply.value;
  const replySource: LlmResultSource = generatedReply.source;

  const flagged = injection.flagged;
  const saved = await prisma.$transaction(async (transaction) => {
    const refundRequest = await transaction.refundRequest.create({
      data: {
        customerEmail: email,
        orderNumber: claim.orderNumber,
        message: input.message,
        decision: result.decision as PrismaDecision,
        reasonCodes: result.reasonCodes,
        aiReply: reply,
        flagged,
        status: RequestStatus.OPEN,
      },
    });
    const steps: Prisma.InputJsonObject = {
      claim: {
        orderNumber: claim.orderNumber,
        issue: claim.issue,
        itemName: claim.itemName,
      },
      policyTrace: result.trace as unknown as Prisma.InputJsonValue,
      finalDecision: result.decision,
      reasonCodes: result.reasonCodes,
      injection: { flagged, reasonCodes: injection.reasonCodes },
      llm: { extractionSource: extraction.source, replySource, reply },
      timestamps: { receivedAt: requestAt.toISOString(), completedAt: new Date().toISOString() },
    };
    await transaction.auditLog.create({ data: { refundRequestId: refundRequest.id, steps } });
    return refundRequest;
  });

  return { requestId: saved.id, decision: result.decision, reply };
}