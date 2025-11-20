import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function validationErrorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code
      }))
    });
    return;
  }
  
  next(error);
}