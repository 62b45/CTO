import { PrismaClient } from '@prisma/client';
import { env } from '../config';

const prismaClientSingleton = () =>
  new PrismaClient({
    log: env.isDevelopment ? ['query', 'error', 'warn'] : ['error'],
  });

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClientSingleton;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (env.isDevelopment) {
  globalForPrisma.prisma = prisma;
}
