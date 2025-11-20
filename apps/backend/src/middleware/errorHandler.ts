import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', error);
  
  // Don't send error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (res.headersSent) {
    return next(error);
  }
  
  // Handle specific error types
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;
    switch (prismaError.code) {
      case 'P2025':
        res.status(404).json({
          success: false,
          message: 'Resource not found',
          ...(isDevelopment && { error: prismaError.message })
        });
        return;
      case 'P2002':
        res.status(409).json({
          success: false,
          message: 'Resource already exists',
          ...(isDevelopment && { error: prismaError.message })
        });
        return;
      default:
        res.status(500).json({
          success: false,
          message: 'Database error',
          ...(isDevelopment && { error: prismaError.message })
        });
        return;
    }
  }
  
  // Default error response
  res.status(500).json({
    success: false,
    message: isDevelopment ? error.message : 'Internal server error',
    ...(isDevelopment && { stack: error.stack })
  });
}