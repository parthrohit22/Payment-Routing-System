export type UserRole = 'admin' | 'merchant' | 'finance';

export interface AuthSession {
  email: string;
  role: UserRole;
  token: string;
}
