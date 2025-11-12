import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

type ValidationTarget = 'body' | 'params' | 'query';

export const validate = <T extends ZodSchema>(
  schema: T,
  target: ValidationTarget = 'body',
) =>
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[target];
      const validated = schema.parse(data);
      req[target] = validated;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(
          new ValidationError(
            'Validation failed',
            error.errors.map(e => ({
              path: e.path,
              message: e.message,
            })),
          ),
        );
      } else {
        next(error);
      }
    }
  };
