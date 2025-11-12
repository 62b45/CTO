import { z } from 'zod';

const EnvSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
    PORT: z.coerce.number().int().positive().default(3000),
    DATABASE_URL: z
      .string()
      .min(1, 'DATABASE_URL is required')
      .default('file:./prisma/dev.db'),
  })
  .transform(values => ({
    nodeEnv: values.NODE_ENV,
    port: values.PORT,
    databaseUrl: values.DATABASE_URL,
    isDevelopment: values.NODE_ENV === 'development',
    isProduction: values.NODE_ENV === 'production',
    isTest: values.NODE_ENV === 'test',
  }));

const parsedEnv = EnvSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const formatted = parsedEnv.error.format();
  throw new Error(`Invalid environment variables: ${JSON.stringify(formatted)}`);
}

export const env = parsedEnv.data;
export type Env = typeof env;
