import axios from 'axios'
import { getToken } from './authStorage'

const learnerAdminHttp = axios.create({
  baseURL: import.meta.env.VITE_LEARNER_ADMIN_API_BASE_URL || 'http://localhost:8001',
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

export interface LearnerAdminFeedbackItem {
  id: string
  learner_user_id: string
  username: string
  description: string
  contact: string | null
  screenshot_urls: string[]
  created_at: string
}

export interface LearnerAdminFeedbackListResponse {
  total: number
  items: LearnerAdminFeedbackItem[]
}

export const learnerAdminApi = {
  getOverview: (): Promise<LearnerOverview> => learnerAdminHttp.get('/api/v1/learner-admin/overview'),
  listUsers: (): Promise<{ total: number; items: LearnerAdminUser[] }> =>
    learnerAdminHttp.get('/api/v1/learner-admin/users'),
  updateStatus: (id: string, isActive: boolean): Promise<LearnerAdminUser> =>
    learnerAdminHttp.patch(`/api/v1/learner-admin/users/${id}`, { is_active: isActive }),
  listFeedback: (params?: { page?: number; page_size?: number }): Promise<LearnerAdminFeedbackListResponse> => {
    const search = new URLSearchParams()
    if (params?.page) search.set('page', String(params.page))
    if (params?.page_size) search.set('page_size', String(params.page_size))
    const query = search.toString()
    return learnerAdminHttp.get(`/api/v1/learner-admin/feedback${query ? `?${query}` : ''}`)
  },
}
