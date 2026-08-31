import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './auth.decorators';

type TrendRange = 'week' | 'month' | 'year';
const chinaDate = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
};
const chinaParts = (date: Date) => chinaDate(date).split('-').map(Number);
const chinaMidnightUtc = (year: number, month: number, day: number) => new Date(Date.UTC(year, month - 1, day, -8));
const addChinaDays = (date: Date, amount: number) => { const [year, month, day] = chinaParts(date); return chinaMidnightUtc(year, month, day + amount); };

@Controller('ranking')
export class RankingController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Query('page') page = '1', @Query('pageSize') pageSize = '20', @Query('search') search?: string) {
    const currentPage = Math.max(Number(page) || 1, 1);
    const take = Math.min(Math.max(Number(pageSize) || 20, 1), 100);
    const where = { status: '正常', ...(search ? { OR: [{ name: { contains: search } }, { phone: { contains: search } }] } : {}) };
    const [items, total] = await this.prisma.$transaction([this.prisma.user.findMany({ where, orderBy: { points: 'desc' }, skip: (currentPage - 1) * take, take, select: { id: true, name: true, phone: true, points: true, avatarUrl: true } }), this.prisma.user.count({ where })]);
    return { items, total, page: currentPage, pageSize: take };
  }

  @Get('statistics')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  async statistics() {
    const where = { status: { not: '已删除' } };
    const [users, total] = await Promise.all([this.prisma.user.count({ where }), this.prisma.user.aggregate({ where, _sum: { points: true } })]);
    return { users, totalPoints: total._sum.points ?? 0 };
  }

  @Get('trend')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  async trend(@Query('range') requestedRange = 'week') {
    if (!['week', 'month', 'year'].includes(requestedRange)) throw new BadRequestException('range must be week, month, or year');
    const range = requestedRange as TrendRange;
    const now = new Date();
    const [year, month, day] = chinaParts(now);
    let start: Date;
    let end: Date;
    const buckets: { key: string; label: string; start: Date; end: Date; value: number }[] = [];

    if (range === 'week') {
      const today = chinaMidnightUtc(year, month, day);
      const weekday = (today.getUTCDay() + 6) % 7;
      start = addChinaDays(today, -weekday);
      end = addChinaDays(start, 7);
      for (let index = 0; index < 7; index += 1) {
        const bucketStart = addChinaDays(start, index);
        const bucketEnd = addChinaDays(bucketStart, 1);
        buckets.push({ key: chinaDate(bucketStart), label: `周${['一', '二', '三', '四', '五', '六', '日'][index]}`, start: bucketStart, end: bucketEnd, value: 0 });
      }
    } else if (range === 'month') {
      start = chinaMidnightUtc(year, month, 1);
      end = chinaMidnightUtc(year, month + 1, 1);
      const days = Math.round((end.getTime() - start.getTime()) / 86400000);
      for (let index = 0; index < days; index += 1) {
        const bucketStart = addChinaDays(start, index);
        buckets.push({ key: chinaDate(bucketStart), label: String(index + 1), start: bucketStart, end: addChinaDays(bucketStart, 1), value: 0 });
      }
    } else {
      start = chinaMidnightUtc(year, 1, 1);
      end = chinaMidnightUtc(year + 1, 1, 1);
      for (let index = 0; index < 12; index += 1) {
        const bucketStart = chinaMidnightUtc(year, index + 1, 1);
        buckets.push({ key: `${year}-${String(index + 1).padStart(2, '0')}`, label: `${index + 1}月`, start: bucketStart, end: chinaMidnightUtc(year, index + 2, 1), value: 0 });
      }
    }

    const records = await this.prisma.pointRecord.findMany({ where: { createdAt: { gte: start, lt: end }, user: { status: { not: '已删除' } } }, select: { amount: true, createdAt: true } });
    const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));
    for (const record of records) {
      const date = chinaDate(record.createdAt);
      const key = range === 'year' ? date.slice(0, 7) : date;
      const bucket = byKey.get(key);
      if (bucket) bucket.value += record.amount;
    }
    return { range, start: start.toISOString(), end: end.toISOString(), items: buckets.map(({ label, value }) => ({ label, value })) };
  }
}
