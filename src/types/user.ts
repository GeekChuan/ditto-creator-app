export type UserRole = 'ADMIN' | 'IP_OWNER' | 'IP_COOPERATOR' | 'super_admin' | 'user'

export interface UserInfo {
  id: string
  creator_id?: string | null
  username: string
  role: UserRole
  effective_role?: UserRole | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export function isSuperAdmin(user?: Pick<UserInfo, 'role' | 'effective_role'> | null): boolean {
  const role = user?.effective_role ?? user?.role
  return role === 'ADMIN' || role === 'super_admin'
}
