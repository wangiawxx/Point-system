import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

const isRetryableWriteError = (error: unknown) => {
  const code = (error as { code?: string })?.code;
  const message = error instanceof Error ? error.message : '';
  return code === 'P2034' || code === 'P1008' || /SQLITE_BUSY|database is locked/i.test(message);
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
    // WAL lets leaderboard reads continue while a short write transaction is in progress.
    await this.$queryRawUnsafe('PRAGMA journal_mode = WAL');
    await this.$queryRawUnsafe(`PRAGMA busy_timeout = ${Number(process.env.SQLITE_BUSY_TIMEOUT || 8000)}`);
    await this.$queryRawUnsafe('PRAGMA foreign_keys = ON');
  }

  async writeTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    const retries = Math.max(0, Math.min(Number(process.env.SQLITE_WRITE_RETRIES || 3), 5));
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await this.$transaction(work, { maxWait: 8000, timeout: 12000 });
      } catch (error) {
        if (attempt >= retries || !isRetryableWriteError(error)) throw error;
        await new Promise((resolve) => setTimeout(resolve, 80 * (attempt + 1)));
      }
    }
  }

  async onModuleDestroy() { await this.$disconnect(); }
}
