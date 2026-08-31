export interface AuthUser {
  sub: number;
  role: 'admin' | 'member';
  username?: string;
  phone?: string;
}
