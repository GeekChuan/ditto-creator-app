export type UserRole = 'super_admin' | 'user'

export interface UserInfo {
  id: string
  creator_id?: string | null
  username: string
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

