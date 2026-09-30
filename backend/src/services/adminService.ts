import { Decision, Prisma, RequestStatus } from '@prisma/client';
import { prisma } from '../config/prisma.js';

export async function listRefundRequests(decision: string | undefined, page: number) {
  const pageSize = 20;
  const where = decision ? { decision: decision as Decision } : {};
  const [requests, total] = await prisma.$transaction([
    prisma.refundRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, customerEmail: true, orderNumber: true, decision: true, reasonCodes: true, flagged: true, status: true, createdAt: true },
    }),
    prisma.refundRequest.count({ where }),
  ]);
  return { requests, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

export async function getRefundRequest(id: string) {
  return prisma.refundRequest.findUnique({
    where: { id },
    include: { auditLogs: { orderBy: { createdAt: 'asc' } } },
  });
}

export async function resolveRefundRequest(id: string, decision: 'APPROVED' | 'DENIED', note: string) {
  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.refundRequest.findUnique({ where: { id } });
    if (!existing) return null;
    if (existing.status === 'RESOLVED') {
      throw Object.assign(new Error('Refund request is already resolved'), { statusCode: 409 });
    }
    if (existing.decision !== 'ESCALATED') {
      throw Object.assign(new Error('Only escalated refund requests can be resolved by an admin'), { statusCode: 409 });
    }
    const resolved = await transaction.refundRequest.update({
      where: { id },
      data: { decision, status: RequestStatus.RESOLVED },
    });
    await transaction.auditLog.create({
      data: {
        refundRequestId: id,
        steps: {
          action: 'ADMIN_RESOLUTION',
          priorDecision: existing.decision,
          decision,
          note,
          resolvedAt: new Date().toISOString(),
        } satisfies Prisma.InputJsonObject,
      },
    });
    return resolved;
  });
}