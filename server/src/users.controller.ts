import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PrismaService } from './prisma.service';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';
import { Roles } from './auth.decorators';

class CreateUserDto { @IsString() name!: string; @IsString() phone!: string; @IsOptional() @IsInt() @Min(0) points?: number; @IsOptional() @IsString() role?: string; @IsOptional() @IsString() avatarUrl?: string; }
class UpdateUserDto { @IsOptional() @IsString() name?: string; @IsOptional() @IsString() phone?: string; @IsOptional() @IsString() status?: string; @IsOptional() @IsString() role?: string; @IsOptional() @IsString() avatarUrl?: string; }
@Controller('users')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class UsersController {
  constructor(private readonly prisma: PrismaService) {}
  @Get() async list(@Query('search') search?: string, @Query('page') page = '1', @Query('pageSize') pageSize = '20') {
    const currentPage = Math.max(Number(page) || 1, 1); const take = Math.min(Math.max(Number(pageSize) || 20, 1), 100);
    const where = { status: { not: '已删除' }, ...(search ? { OR: [{ name: { contains: search } }, { phone: { contains: search } }] } : {}) };
    const [items, total] = await this.prisma.$transaction([this.prisma.user.findMany({ where, orderBy: { points: 'desc' }, skip: (currentPage - 1) * take, take, select: { id: true, name: true, phone: true, points: true, status: true, role: true, avatarUrl: true, joinedAt: true } }), this.prisma.user.count({ where })]);
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
