import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { getRefundRequest, listRefundRequests, resolveRefundRequest } from '../services/adminService.js';

export const resolveSchema = z.object({
  decision: z.enum(['APPROVED', 'DENIED']),
  note: z.string().trim().min(3).max(1000),
}).strict();

export async function listRefunds(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const decision = request.query.decision;
    if (decision !== undefined && (typeof decision !== 'string' || !['APPROVED', 'DENIED', 'ESCALATED'].includes(decision))) {
      response.status(400).json({ error: 'decision must be APPROVED, DENIED, or ESCALATED' });
      return;
    }
    const page = request.query.page === undefined ? 1 : Number(request.query.page);
    if (!Number.isInteger(page) || page < 1) {
      response.status(400).json({ error: 'page must be a positive integer' });
      return;
    }
    response.json(await listRefundRequests(decision, page));
  } catch (error) {
    next(error);
  }
}

export async function getRefund(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const id = request.params.id;
    if (typeof id !== 'string') {
      response.status(400).json({ error: 'A single refund request ID is required' });
      return;
    }
    const refund = await getRefundRequest(id);
    if (!refund) {
      response.status(404).json({ error: 'Refund request not found' });
      return;
    }
    response.json(refund);
  } catch (error) {
    next(error);
  }
}

export async function resolveRefund(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const id = request.params.id;
    if (typeof id !== 'string') {
      response.status(400).json({ error: 'A single refund request ID is required' });
      return;
    }
    const input = response.locals.validatedBody as z.infer<typeof resolveSchema>;
    const refund = await resolveRefundRequest(id, input.decision, input.note);
    if (!refund) {
      response.status(404).json({ error: 'Refund request not found' });
      return;
    }
    response.json(refund);
  } catch (error) {
    next(error);
  }
}