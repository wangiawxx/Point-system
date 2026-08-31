import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthUser } from './auth.types';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AuthUser['role'][]) => SetMetadata(ROLES_KEY, roles);
export const CurrentUser = createParamDecorator((_: unknown, context: ExecutionContext): AuthUser => context.switchToHttp().getRequest().user);
