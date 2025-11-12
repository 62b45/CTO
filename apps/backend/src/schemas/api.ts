import { z } from 'zod';

export const PlayerIdentifierSchema = z.object({
  playerId: z
    .string()
    .trim()
    .min(1, 'Player ID is required')
    .max(64, 'Player ID must be 64 characters or fewer'),
});

export type PlayerIdentifier = z.infer<typeof PlayerIdentifierSchema>;

export const HealthStatusSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string().datetime({ offset: true }),
  uptime: z.number().nonnegative(),
  database: z.enum(['connected', 'disconnected']),
});

export type HealthStatus = z.infer<typeof HealthStatusSchema>;

export const HealthCheckResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: HealthStatusSchema,
});

export type HealthCheckResponse = z.infer<typeof HealthCheckResponseSchema>;

export const PlayerStatsSchema = z.object({
  level: z.number().int().nonnegative(),
  experience: z.number().int().nonnegative(),
  health: z.object({
    current: z.number().int().nonnegative(),
    max: z.number().int().positive(),
  }),
  energy: z.object({
    current: z.number().int().nonnegative(),
    max: z.number().int().positive(),
  }),
  gold: z.number().int().nonnegative(),
});

export const PlayerSessionSchema = z.object({
  id: z.string(),
  status: z.enum(['ACTIVE', 'COMPLETED']).catch('ACTIVE'),
  lastActiveAt: z.string().datetime({ offset: true }),
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export const PlayerSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  stats: PlayerStatsSchema,
  session: PlayerSessionSchema,
  createdAt: z.string().datetime({ offset: true }),
  updatedAt: z.string().datetime({ offset: true }),
});

export type PlayerSummary = z.infer<typeof PlayerSummarySchema>;

export const PlayerSummaryResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: PlayerSummarySchema,
});

export type PlayerSummaryResponse = z.infer<typeof PlayerSummaryResponseSchema>;

export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  errors: z
    .array(
      z.object({
        path: z.array(z.union([z.string(), z.number()])).optional(),
        message: z.string(),
      }),
    )
    .optional(),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
