import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

export class AppError extends Error {
  code: string;
  status: number;
  fields?: { field: string; message: string }[];

  constructor(code: string, status: number, message: string, fields?: { field: string; message: string }[]) {
    super(message);
    this.code = code;
    this.status = status;
    this.fields = fields;
  }
}

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction): void {
  const status = err.status || 500;
  const code = err.code || 'INTERNAL_ERROR';
  const response: any = { error: { code, message: err.message, status } };
  if (err.fields) response.error.fields = err.fields;

  if (process.env.NODE_ENV !== 'production' && err.stack) {
    response.error.stack = err.stack;
  }

  logger.error({ code, status, path: req.path, message: err.message });
  res.status(status).json(response);
}
