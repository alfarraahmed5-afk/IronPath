import { Request, Response, NextFunction } from 'express';

export function cacheControl(maxAgeSeconds: number) {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', `private, max-age=${maxAgeSeconds}`);
    next();
  };
}

export const noCache = (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
};
