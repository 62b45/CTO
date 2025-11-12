import type { ErrorRequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { env } from '../config';
import { ErrorResponseSchema } from '../schemas/api';
import {
  AppError,
  BadRequestError,
  ValidationError,
} from '../utils/errors';

const normalizeError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof ZodError) {
    return new ValidationError('Validation failed', error.issues.map(issue => ({
      path: issue.path,
      message: issue.message,
    })));
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return new AppError(error.message, 400, error.code);
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    return new BadRequestError(error.message);
  }

  if (error instanceof Error) {
    return new AppError(error.message, 500);
  }

  return new AppError('An unexpected error occurred', 500);
};

export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  const normalized = normalizeError(err);

  const response = ErrorResponseSchema.parse({
    success: false,
    message: normalized.message,
    errors:
      normalized instanceof ValidationError
        ? normalized.errors
        : undefined,
  });

  if (env.isDevelopment) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(normalized.statusCode).json(response);
};
