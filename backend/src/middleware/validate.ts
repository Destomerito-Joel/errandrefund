import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';

export function validateBody<T>(schema: ZodType<T>) {
  return (request: Request, response: Response, next: NextFunction): void => {
    const result = schema.safeParse(request.body);
    if (!result.success) {
      response.status(400).json({ error: 'Invalid request body', details: result.error.flatten() });
      return;
    }
    response.locals.validatedBody = result.data;
    next();
  };
}