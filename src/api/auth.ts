import http from './http'
import type { UserInfo, UserRole } from '../types/user'
export { clearAuth, getRefreshToken, getStoredUser, getToken, setAuth } from './authStorage'

export interface LoginPayload {
  username: string
  password: string
}

export interface RegisterPayload {
  username: string
  password: string
}

export interface CreateUserPayload {
  username: string
  password: string
  role: UserRole
}

export interface UserListResponse {
  total: number
  page: number
  page_size: number
  items: UserInfo[]
}

export interface LoginResponse {
  access_token: string
  refresh_token: string
  token_type: string
  user: UserInfo
}

export const authApi = {
  register: (body: RegisterPayload): Promise<UserInfo> => http.post('/api/v1/auth/register', body),
  login: (body: LoginPayload): Promise<LoginResponse> => http.post('/api/v1/auth/login', body),
  me: (): Promise<UserInfo> => http.get('/api/v1/auth/me'),
  logout: (refresh_token: string): Promise<void> => http.post('/api/v1/auth/logout', { refresh_token }),
  listUsers: (params?: { page?: number; page_size?: number; keyword?: string }): Promise<UserListResponse> =>
    http.get('/api/v1/users', { params }),
  createUser: (body: CreateUserPayload): Promise<UserInfo> => http.post('/api/v1/users', body),
  renameUser: (userId: string, username: string): Promise<UserInfo> =>
    http.put(`/api/v1/users/${userId}`, { username }),
  deleteUser: (userId: string): Promise<void> => http.delete(`/api/v1/users/${userId}`),
  resetPassword: (userId: string, newPassword: string): Promise<UserInfo> =>
    http.post(`/api/v1/users/${userId}/reset-password`, { new_password: newPassword }),
}
