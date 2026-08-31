import { BadRequestException, Body, ConflictException, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { AuthGuard } from './auth.guard';
import { CurrentUser, Roles } from './auth.decorators';
import { AuthUser } from './auth.types';
import { PrismaService } from './prisma.service';
import { RolesGuard } from './roles.guard';

class CreatePkDto { @IsInt() opponentId!: number; @IsInt() @Min(1) stake!: number; @IsString() date!: string; @IsString() time!: string; @IsOptional() @IsString() note?: string; }
class SettlePkDto { @IsInt() winnerId!: number; }
const userSelect = { id: true, name: true, phone: true, points: true, status: true } as const;
const matchSelect = { id: true, challengerId: true, opponentId: true, stake: true, date: true, time: true, status: true, winnerId: true, note: true, createdAt: true, settledAt: true, challenger: { select: userSelect }, opponent: { select: userSelect }, winner: { select: userSelect } } as const;
const pairKey = (first: number, second: number) => [first, second].sort((a, b) => a - b).join(':');

@Controller('pk')
@UseGuards(AuthGuard, RolesGuard)
export class PkController {
  constructor(private readonly prisma: PrismaService) {}
  @Get()
  async list(@CurrentUser() auth: AuthUser, @Query('page') page = '1', @Query('pageSize') pageSize = '20', @Query('status') status?: string) {
    const currentPage = Math.max(Number(page) || 1, 1); const take = Math.min(Math.max(Number(pageSize) || 20, 1), 100);
    const where = { ...(status ? { status } : {}), ...(auth.role === 'member' ? { OR: [{ challengerId: auth.sub }, { opponentId: auth.sub }] } : {}) };
    const [items, total] = await this.prisma.$transaction([this.prisma.pkMatch.findMany({ where, select: matchSelect, orderBy: { createdAt: 'desc' }, skip: (currentPage - 1) * take, take }), this.prisma.pkMatch.count({ where })]);
    return { items, total, page: currentPage, pageSize: take };
  }
  @Post()
  @Roles('member')
  async create(@CurrentUser() auth: AuthUser, @Body() dto: CreatePkDto) {
    if (dto.stake > 10000) throw new BadRequestException('单场赌注不能超过 10000 积分');
    if (auth.sub === dto.opponentId) throw new BadRequestException('不能与自己发起 PK');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dto.date) || !/^\d{2}:\d{2}$/.test(dto.time)) throw new BadRequestException('预约日期或时间格式不正确');
    const users = await this.prisma.user.findMany({ where: { id: { in: [auth.sub, dto.opponentId] } } });
    if (users.length !== 2) throw new BadRequestException('PK 用户不存在');
    if (users.some((user) => user.status !== '正常')) throw new BadRequestException('PK 用户已被禁用');
    try { return await this.prisma.pkMatch.create({ data: { challengerId: auth.sub, opponentId: dto.opponentId, stake: dto.stake, date: dto.date, time: dto.time, pairKey: pairKey(auth.sub, dto.opponentId), note: dto.note }, select: matchSelect }); }
    catch (error: any) { if (error?.code === 'P2002') throw new ConflictException('该时间段双方已有 PK 预约'); throw error; }
  }
  @Patch(':id/settle')
  @Roles('admin')
  async settle(@Param('id') id: string, @Body() dto: SettlePkDto) {
    return this.prisma.writeTransaction(async (tx) => {
      const match = await tx.pkMatch.findUnique({ where: { id: Number(id) } });
      if (!match) throw new BadRequestException('PK 记录不存在');
      if (match.settledAt || match.winnerId) throw new ConflictException('该 PK 已结算');
      if (![match.challengerId, match.opponentId].includes(dto.winnerId)) throw new BadRequestException('获胜者必须是参赛用户');
      const loserId = dto.winnerId === match.challengerId ? match.opponentId : match.challengerId;
      const [winner, loser] = await Promise.all([tx.user.findUniqueOrThrow({ where: { id: dto.winnerId } }), tx.user.findUniqueOrThrow({ where: { id: loserId } })]);
      if (loser.points < match.stake) throw new BadRequestException('失败用户积分不足，无法结算');
      const debitId = `pk:${match.id}:debit`; const creditId = `pk:${match.id}:credit`;
      await tx.pointRecord.create({ data: { userId: loser.id, amount: -match.stake, before: loser.points, after: loser.points - match.stake, note: `PK 失败，场次 #${match.id}`, operationId: debitId } });
      await tx.pointRecord.create({ data: { userId: winner.id, amount: match.stake, before: winner.points, after: winner.points + match.stake, note: `PK 获胜，场次 #${match.id}`, operationId: creditId } });
      await tx.user.update({ where: { id: loser.id }, data: { points: { decrement: match.stake } } }); await tx.user.update({ where: { id: winner.id }, data: { points: { increment: match.stake } } });
      return tx.pkMatch.update({ where: { id: match.id }, data: { status: '已完成', winnerId: winner.id, settledAt: new Date() }, select: matchSelect });
    });
  }
  @Patch(':id/cancel')
  @Roles('admin')
  async cancel(@Param('id') id: string) {
    const match = await this.prisma.pkMatch.findUnique({ where: { id: Number(id) } });
    if (!match) throw new BadRequestException('PK 记录不存在');
    if (match.settledAt || match.winnerId) throw new ConflictException('已结算的 PK 不能取消');
    return this.prisma.pkMatch.update({ where: { id: match.id }, data: { status: '已取消' }, select: matchSelect });
  }
}
