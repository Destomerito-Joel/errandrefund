import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/prisma.js';

export async function health(_request: Request, response: Response, next: NextFunction): Promise<void> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    response.json({ status: 'ok', database: 'ok' });
  } catch (error) {
    next(error);
  }
}