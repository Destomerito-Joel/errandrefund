import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';

/** Require an explicit bearer secret for admin reads and mutations; missing configuration fails closed. */
export function requireAdminApiKey(request: Request, response: Response, next: NextFunction): void {
  const expected = env.ADMIN_API_KEY;
  if (!expected) {
    response.status(503).json({ error: 'Admin API is disabled until ADMIN_API_KEY is configured' });
    return;
  }

  const authorization = request.get('authorization') ?? '';
  const supplied = /^Bearer\s+(.+)$/i.exec(authorization)?.[1] ?? '';
  const expectedBytes = Buffer.from(expected, 'utf8');
  const suppliedBytes = Buffer.from(supplied, 'utf8');
  const matches = suppliedBytes.length === expectedBytes.length && timingSafeEqual(suppliedBytes, expectedBytes);

  if (!matches) {
    response.status(401).json({ error: 'A valid admin bearer token is required' });
    return;
  }

  next();
}