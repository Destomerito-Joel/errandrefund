import type { ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (error: unknown, _request, response, _next) => {
  const candidate = error instanceof Error ? error as Error & { status?: unknown; statusCode?: unknown; type?: unknown } : null;
  const candidateStatus = typeof candidate?.statusCode === 'number'
    ? candidate.statusCode
    : typeof candidate?.status === 'number'
      ? candidate.status
      : candidate?.type === 'entity.too.large'
        ? 413
        : 500;
  const statusCode = candidateStatus >= 400 && candidateStatus < 500 ? candidateStatus : 500;
  if (statusCode === 500) console.error('Unhandled API error:', error);
  response.status(statusCode).json({ error: statusCode === 500 ? 'Internal server error' : candidate?.message ?? 'Request failed' });
};