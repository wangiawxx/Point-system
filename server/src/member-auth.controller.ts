import { BadRequestException, Body, ConflictException, Controller, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IsInt, IsString } from 'class-validator';
import { PrismaService } from './prisma.service';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';
import { CurrentUser, Roles } from './auth.decorators';
import { AuthUser } from './auth.types';
class MemberLoginDto { @IsString() phone!: string; @IsString() password!: string; }
class MemberRegisterDto { @IsString() name!: string; @IsString() phone!: string; }
class ChangePasswordDto { @IsString() oldPassword!: string; @IsString() newPassword!: string; }
@Controller('member/auth')
export class MemberAuthController {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}
  @Post('login') async login(@Body() dto: MemberLoginDto) {
    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user || user.status !== '正常') throw new UnauthorizedException('用户不存在或已被禁用');
    if (dto.password !== user.password) throw new UnauthorizedException('密码错误');
    const token = await this.jwt.signAsync({ sub: user.id, phone: user.phone, role: 'member' });
    return { id: user.id, name: user.name, phone: user.phone, points: user.points, role: 'member', token };
  }
  @Post('register') async register(@Body() dto: MemberRegisterDto) {
    const name = dto.name?.trim();
    const phone = dto.phone?.trim();
    if (!name || name.length > 30) throw new BadRequestException('请输入 1-30 个字符的用户名');
    if (!/^1\d{10}$/.test(phone)) throw new BadRequestException('请输入正确的 11 位手机号');
    const user = await this.prisma.writeTransaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { phone } });
      if (existing && existing.status !== '已删除') throw new ConflictException('该手机号已注册，请直接登录');
      if (existing) {
        // Keep the old user (and its PK/point history), but release the unique phone
        // value so this number can be registered as a new account.
        await tx.user.update({ where: { id: existing.id }, data: { phone: `deleted:${existing.id}:${existing.phone}` } });
      }
      return tx.user.create({ data: { name, phone } });
    });
    const token = await this.jwt.signAsync({ sub: user.id, phone: user.phone, role: 'member' });
    return { id: user.id, name: user.name, phone: user.phone, points: user.points, role: 'member', token };
  }
  @Post('change-password') @UseGuards(AuthGuard, RolesGuard) @Roles('member') async changePassword(@CurrentUser() auth: AuthUser, @Body() dto: ChangePasswordDto) {
    if (dto.newPassword.length < 6) throw new UnauthorizedException('新密码至少 6 位');
    const user = await this.prisma.user.findUnique({ where: { id: auth.sub } });
    if (!user || user.password !== dto.oldPassword) throw new UnauthorizedException('原密码错误');
    await this.prisma.user.update({ where: { id: user.id }, data: { password: dto.newPassword } });
    return { message: '密码修改成功' };
  }
}
