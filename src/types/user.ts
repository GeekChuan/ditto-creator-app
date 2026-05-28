export type UserRole = 'super_admin' | 'user'

export interface UserInfo {
  id: string
  username: string
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

