import { BadRequestException, Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, IsString } from 'class-validator';
import { AuthGuard } from './auth.guard';
import { PrismaService } from './prisma.service';
import { Roles } from './auth.decorators';
import { RolesGuard } from './roles.guard';
import { currentChinaMonth } from './points-period';

class AddPointsDto { @IsInt() userId!: number; @IsInt() amount!: number; @IsString() operationId!: string; @IsOptional() @IsString() note?: string; }


@Controller('points')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class PointsController {
  constructor(private readonly prisma: PrismaService) {}
  @Post()
  async add(@Body() dto: AddPointsDto) {
    if (dto.amount === 0) throw new BadRequestException('积分变动不能为 0');
    if (dto.operationId.length < 16 || dto.operationId.length > 100) throw new BadRequestException('无效的操作编号');
    try { return await this.prisma.writeTransaction(async (tx) => {
      const existing = await tx.pointRecord.findUnique({ where: { operationId: dto.operationId } });
      if (existing) return existing;
      const user = await tx.user.findUniqueOrThrow({ where: { id: dto.userId } });
      const { start, end } = currentChinaMonth();
      const monthlyBefore = (await tx.pointRecord.aggregate({ where: { userId: user.id, createdAt: { gte: start, lt: end } }, _sum: { amount: true } }))._sum.amount ?? 0;
      if (dto.amount < 0 && monthlyBefore + dto.amount < 0) throw new BadRequestException('本月积分不足，不能扣除超过本月积分');
      const after = user.points + dto.amount;
      if (after < 0) throw new BadRequestException('积分不能低于 0');
      const record = await tx.pointRecord.create({ data: { userId: user.id, amount: dto.amount, before: user.points, after, note: dto.note, operationId: dto.operationId } });
      await tx.user.update({ where: { id: user.id }, data: { points: after } });
      return { ...record, monthlyPoints: monthlyBefore + dto.amount };
    }); } catch (error: any) {
      if (error?.code === 'P2002') {
        const existing = await this.prisma.pointRecord.findUnique({ where: { operationId: dto.operationId } });
        if (existing) return existing;
      }
      throw error;
    }
  }
  @Get('records') list() { return this.prisma.pointRecord.findMany({ where: { user: { status: { not: '已删除' } } }, include: { user: { select: { id: true, name: true, phone: true } } }, orderBy: { createdAt: 'desc' }, take: 100 }); }
}
