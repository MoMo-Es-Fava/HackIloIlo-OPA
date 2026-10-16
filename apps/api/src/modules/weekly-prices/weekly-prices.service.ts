import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Language } from '@irpc/types';
import { PrismaService } from '../../database/prisma.service';
import { SmsService } from '../../integrations/textbee/sms.service';
import { buildPriceReply } from '../../integrations/textbee/sms.commands';
import { CatalogService } from '../catalog/catalog.service';

// Manila uses UTC+8 throughout the year. Store calendar week dates as UTC midnight.
export function priceWeek(now: Date): { start: Date; due: boolean } {
  const local = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const day = local.getUTCDay();
  const start = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - day));
  return { start, due: day !== 0 || local.getUTCHours() >= 8 };
}

@Injectable()
export class WeeklyPricesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WeeklyPricesService.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: CatalogService,
    private readonly sms: SmsService,
  ) {}

  onModuleInit() {
    // Durable database queue; check each minute and catch up after API downtime.
    if (process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => { void this.tick(); }, 60_000);
    this.timer.unref();
    void this.tick();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async afterVerifiedSignup(userId: number, now = new Date()): Promise<void> {
    // Use parameterized Prisma queries, as in signup verification, so a stale
    // checked-in generated client cannot omit the new fields at runtime.
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`UPDATE "User" SET "phoneVerifiedAt" = ${now} WHERE "id" = ${userId}`;
      await tx.$executeRaw`
        INSERT INTO "WeeklyPriceNotification" ("userId", "weekStart", "updatedAt")
        VALUES (${userId}, ${priceWeek(now).start}::date, NOW())
        ON CONFLICT ("userId", "weekStart") DO NOTHING`;
    });
    // The durable PENDING row survives a restart. SMS failures never undo signup.
    void this.tick(now);
  }

  async tick(now = new Date()): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const week = priceWeek(now);
      if (week.due) await this.enqueueWeek(week.start);
      await this.sendPending(week.start);
    } catch (error) {
      const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
      this.logger.error(`Weekly price processing failed; pending records will be checked next minute. ${detail}`);
    } finally {
      this.running = false;
    }
  }

  async enqueueWeek(weekStart: Date): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO "WeeklyPriceNotification" ("userId", "weekStart", "updatedAt")
      SELECT "id", ${weekStart}::date, NOW() FROM "User"
      WHERE "isActive" = true AND "consentAt" IS NOT NULL AND "phoneVerifiedAt" IS NOT NULL
      ON CONFLICT ("userId", "weekStart") DO NOTHING`;
  }

  async sendPending(weekStart: Date): Promise<void> {
    const prices = await this.catalog.getPrices();
    if (!prices.length) return; // Keep PENDING until published prices exist.
    const riceTypes = await this.catalog.getRiceTypes();
    // One batch per minute, sequential sends, shared across API replicas.
    const rows = await this.prisma.$queryRaw<Array<{ id: number; phone: string; language: Language }>>`
      SELECT n."id", u."phone", u."language"
      FROM "WeeklyPriceNotification" n JOIN "User" u ON u."id" = n."userId"
      WHERE n."status" = 'PENDING' AND n."weekStart" = ${weekStart}::date
        AND u."isActive" = true AND u."consentAt" IS NOT NULL AND u."phoneVerifiedAt" IS NOT NULL
      ORDER BY n."id" LIMIT 20`;
    for (const row of rows) {
      const language = row.language === Language.HIL ? Language.HIL : Language.EN;
      const message = (language === Language.HIL ? 'Presyo sini nga semana\n' : 'Weekly prices\n')
        + buildPriceReply(prices, language, riceTypes);
      const claimed = await this.prisma.$executeRaw`
        UPDATE "WeeklyPriceNotification" SET "status" = 'SENDING', "message" = ${message}, "updatedAt" = NOW()
        WHERE "id" = ${row.id} AND "status" = 'PENDING'`;
      if (claimed !== 1) continue;
      try {
        const result = await this.sms.send(row.phone, message);
        const status = result.status === 'queued' ? 'QUEUED' : 'MOCKED';
        await this.prisma.$executeRaw`
          UPDATE "WeeklyPriceNotification" SET "status" = ${status}, "providerId" = ${result.batchId ?? null},
            "queuedAt" = ${result.status === 'queued' ? new Date() : null}, "updatedAt" = NOW()
          WHERE "id" = ${row.id}`;
      } catch (error) {
        // A timeout may mean TextBee accepted the SMS. Never resend automatically:
        // operators must check TextBee history before resetting FAILED/SENDING.
        await this.prisma.$executeRaw`
          UPDATE "WeeklyPriceNotification" SET "status" = 'FAILED', "updatedAt" = NOW() WHERE "id" = ${row.id}`;
        const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
        this.logger.warn(`Weekly price notification ${row.id} needs delivery review. ${detail}`);
      }
    }
  }
}
