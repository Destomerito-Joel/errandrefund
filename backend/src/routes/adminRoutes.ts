import { Router } from 'express';
import { getRefund, listRefunds, resolveRefund, resolveSchema } from '../controllers/adminController.js';
import { validateBody } from '../middleware/validate.js';
import { requireAdminApiKey } from '../middleware/requireAdminApiKey.js';

export const adminRoutes = Router();
adminRoutes.use(requireAdminApiKey);
adminRoutes.get('/refunds', listRefunds);
adminRoutes.get('/refunds/:id', getRefund);
adminRoutes.post('/refunds/:id/resolve', validateBody(resolveSchema), resolveRefund);