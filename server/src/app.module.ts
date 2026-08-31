import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from './prisma.module';
import { UsersController } from './users.controller';
import { PointsController } from './points.controller';
import { RankingController } from './ranking.controller';
import { AuthController } from './auth.controller';
import { PkController } from './pk.controller';
import { MemberAuthController } from './member-auth.controller';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';
@Module({ imports: [PrismaModule, JwtModule.register({ secret: process.env.JWT_SECRET || 'cue-plus-dev-secret', signOptions: { expiresIn: '7d' } })], controllers: [UsersController, PointsController, RankingController, AuthController, PkController, MemberAuthController], providers: [AuthGuard, RolesGuard] })
export class AppModule {}
