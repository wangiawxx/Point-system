import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PrismaService } from './prisma.service';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './auth.decorators';
import { currentChinaMonth } from './points-period';

class CreateUserDto { @IsString() name!: string; @IsString() phone!: string; @IsOptional() @IsInt() @Min(0) points?: number; @IsOptional() @IsString() role?: string; @IsOptional() @IsString() avatarUrl?: string; }
class UpdateUserDto { @IsOptional() @IsString() name?: string; @IsOptional() @IsString() phone?: string; @IsOptional() @IsString() status?: string; @IsOptional() @IsString() role?: string; @IsOptional() @IsString() avatarUrl?: string; }
@Controller('users')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() async list(@Query('search') search?: string, @Query('page') page = '1', @Query('pageSize') pageSize = '20', @Query('period') period = 'total') {
    const currentPage = Math.max(Number(page) || 1, 1); const take = Math.min(Math.max(Number(pageSize) || 20, 1), 100);
    const where = { status: { not: '已删除' }, ...(search ? { OR: [{ name: { contains: search } }, { phone: { contains: search } }] } : {}) };
    const [baseUsers, total] = await this.prisma.$transaction([this.prisma.user.findMany({ where, select: { id: true, name: true, phone: true, points: true, status: true, role: true, avatarUrl: true, joinedAt: true } }), this.prisma.user.count({ where })]);
    if (period === 'month') {
      const { start, end } = currentChinaMonth();
      const monthly = await this.prisma.pointRecord.groupBy({ by: ['userId'], where: { createdAt: { gte: start, lt: end }, user: { status: { not: '已删除' } } }, _sum: { amount: true } });
      const pointsByUser = new Map(monthly.map((row) => [row.userId, row._sum.amount ?? 0]));
      const ranked = baseUsers.map((user) => ({ ...user, balance: user.points, points: pointsByUser.get(user.id) ?? 0 })).sort((a, b) => b.points - a.points || a.id - b.id);
      return { items: ranked.slice((currentPage - 1) * take, currentPage * take), total, page: currentPage, pageSize: take };
    }
    const items = baseUsers.sort((a, b) => b.points - a.points || a.id - b.id).slice((currentPage - 1) * take, currentPage * take);
    return { items, total, page: currentPage, pageSize: take };
  }
  @Get(':id') detail(@Param('id') id: string) { return this.prisma.user.findUnique({ where: { id: Number(id) }, select: { id: true, name: true, phone: true, points: true, status: true, role: true, avatarUrl: true, joinedAt: true, records: { orderBy: { createdAt: 'desc' }, take: 30 } } }); }
  @Post() create(@Body() dto: CreateUserDto) { return this.prisma.user.create({ data: { name: dto.name, phone: dto.phone, points: dto.points ?? 0, role: dto.role || 'member', avatarUrl: dto.avatarUrl }, select: { id: true, name: true, phone: true, points: true, status: true, role: true, avatarUrl: true, joinedAt: true } }); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateUserDto) { return this.prisma.user.update({ where: { id: Number(id) }, data: dto, select: { id: true, name: true, phone: true, points: true, status: true, role: true, avatarUrl: true, joinedAt: true } }); }
  @Delete(':id')
  async remove(@Param('id') id: string) {
    const userId = Number(id);
    const pkCount = await this.prisma.pkMatch.count({ where: { OR: [{ challengerId: userId }, { opponentId: userId }] } });
    if (pkCount > 0) {
      return this.prisma.user.update({ where: { id: userId }, data: { status: '已删除' }, select: { id: true, name: true, phone: true, status: true } });
    }
    return this.prisma.user.delete({ where: { id: userId }, select: { id: true, name: true, phone: true } });
  }
}
