import axios from 'axios'
import { getToken } from './authStorage'

const learnerAdminHttp = axios.create({
  baseURL: import.meta.env.VITE_LEARNER_ADMIN_API_BASE_URL || 'http://localhost:8001/api/v1',
  timeout: 15000,
})

learnerAdminHttp.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

learnerAdminHttp.interceptors.response.use((res) => res.data)

export interface LearnerAdminUser {
  id: string
  username: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LearnerOverview {
  total_users: number
  active_users: number
  total_progress_records: number
}

export const learnerAdminApi = {
  getOverview: (): Promise<LearnerOverview> => learnerAdminHttp.get('/learner-admin/overview'),
  listUsers: (): Promise<{ total: number; items: LearnerAdminUser[] }> => learnerAdminHttp.get('/learner-admin/users'),
  updateStatus: (id: string, isActive: boolean): Promise<LearnerAdminUser> =>
    learnerAdminHttp.patch(`/learner-admin/users/${id}`, { is_active: isActive }),
}
