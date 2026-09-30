import { Router } from 'express';
import { createRefund, createRefundSchema } from '../controllers/refundController.js';
import { validateBody } from '../middleware/validate.js';

export const refundRoutes = Router();
refundRoutes.post('/', validateBody(createRefundSchema), createRefund);