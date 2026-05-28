import http from './http'
import type { UserInfo, UserRole } from '../types/user'
export { clearAuth, getStoredUser, getToken, setAuth } from './authStorage'

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
  token_type: string
  user: UserInfo
}

export const authApi = {
  register: (body: RegisterPayload): Promise<UserInfo> => http.post('/auth/register', body),
  login: (body: LoginPayload): Promise<LoginResponse> => http.post('/auth/login', body),
  me: (): Promise<UserInfo> => http.get('/auth/me'),
  listUsers: (params?: { page?: number; page_size?: number; keyword?: string }): Promise<UserListResponse> =>
    http.get('/users', { params }),
  createUser: (body: CreateUserPayload): Promise<UserInfo> => http.post('/users', body),
  renameUser: (userId: string, username: string): Promise<UserInfo> =>
    http.put(`/users/${userId}`, { username }),
  deleteUser: (userId: string): Promise<void> => http.delete(`/users/${userId}`),
  resetPassword: (userId: string, newPassword: string): Promise<UserInfo> =>
    http.post(`/users/${userId}/reset-password`, { new_password: newPassword }),
}

