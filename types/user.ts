export type UserRole = "admin" | "jailor";

export interface User {
  id: string;
  name: string;
  user_name: string;
  role: UserRole;
  is_active: boolean;
}

export interface LoginUser {
  id: string;
  name: string;
  user_name: string;
  role: UserRole;
  is_active: boolean;
}

export interface AuthResponse {
  message: string;
  access_token: string;
  refresh_token: string;
  user: LoginUser;
  expires_in: number;
}

export interface UsersResponse {
  message: string;
  users: User[];
  count: number;
}

export interface UserResponse {
  message: string;
  user: User;
}
