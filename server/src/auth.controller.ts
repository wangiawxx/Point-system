import { BadRequestException, Body, Controller, Post, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { IsString } from 'class-validator';
import { AuthGuard } from './auth.guard';
import { CurrentUser, Roles } from './auth.decorators';
import { AuthUser } from './auth.types';
import { PrismaService } from './prisma.service';
import { RolesGuard } from './roles.guard';
import { timingSafeEqual } from 'crypto';

class LoginDto { @IsString() username!: string; @IsString() password!: string; }
class UpdateProfileDto { @IsString() username!: string; @IsString() currentPassword!: string; @IsString() newPassword!: string; @IsString() verificationCode!: string; }

@Controller('auth')
export class AuthController {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const admin = await this.prisma.admin.findUnique({ where: { username: dto.username } });
    if (!admin || admin.password !== dto.password) throw new UnauthorizedException('用户名或密码错误');
    const token = await this.jwt.signAsync({ sub: admin.id, username: admin.username, role: 'admin' });
    return { id: admin.id, username: admin.username, role: 'admin', token };
  }

  @Post('profile')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('admin')
  async updateProfile(@CurrentUser() auth: AuthUser, @Body() dto: UpdateProfileDto) {
    const configuredCode = process.env.ADMIN_PROFILE_VERIFICATION_CODE;
    if (!configuredCode) throw new BadRequestException('未配置管理员修改验证字符串');
    const expected = Buffer.from(configuredCode);
    const supplied = Buffer.from(dto.verificationCode);
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) throw new UnauthorizedException('验证字符串不正确');
    const username = dto.username.trim();
    if (username.length < 3) throw new BadRequestException('管理员账号至少 3 个字符');
    if (dto.newPassword.length < 6) throw new BadRequestException('新密码至少 6 个字符');
    const admin = await this.prisma.admin.findUnique({ where: { id: auth.sub } });
    if (!admin || admin.password !== dto.currentPassword) throw new UnauthorizedException('当前密码不正确');
    const duplicate = await this.prisma.admin.findFirst({ where: { username, NOT: { id: auth.sub } } });
    if (duplicate) throw new BadRequestException('管理员账号已存在');
    const updated = await this.prisma.admin.update({ where: { id: auth.sub }, data: { username, password: dto.newPassword } });
    const token = await this.jwt.signAsync({ sub: updated.id, username: updated.username, role: 'admin' });
    return { id: updated.id, username: updated.username, role: 'admin', token };
  }
}
