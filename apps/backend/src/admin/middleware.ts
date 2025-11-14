import type { Request, Response, NextFunction } from 'express';

export interface AdminAuthOptions {
  apiKey?: string;
}

export function createAdminAuthMiddleware(options: AdminAuthOptions = {}) {
  const apiKey = options.apiKey ?? process.env.ADMIN_API_KEY;

  if (!apiKey) {
    console.warn(
      '[AdminAuth] WARNING: No ADMIN_API_KEY configured. Admin endpoints are disabled.'
    );
  }

  return (req: Request, res: Response, next: NextFunction) => {
    if (!apiKey) {
      res.status(503).json({
        success: false,
        message: 'Admin API is not configured',
      });
      return;
    }

    const providedKey = req.headers['x-admin-api-key'] as string;

    if (!providedKey || providedKey !== apiKey) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized: Invalid or missing admin API key',
      });
      return;
    }

    next();
  };
}
