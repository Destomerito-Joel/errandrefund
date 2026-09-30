import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { submitRefundRequest } from '../services/refundService.js';

export const createRefundSchema = z.object({
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(8).max(5000),
}).strict();

export async function createRefund(request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    const input = response.locals.validatedBody as z.infer<typeof createRefundSchema>;
    response.status(201).json(await submitRefundRequest(input));
  } catch (error) {
    next(error);
  }
}