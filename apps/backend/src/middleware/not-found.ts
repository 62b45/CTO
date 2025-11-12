import type { RequestHandler } from 'express';
import { NotFoundError } from '../utils/errors';

export const notFoundHandler: RequestHandler = (req, res, next) => {
  next(new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`));
};
