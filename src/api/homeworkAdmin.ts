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

export interface HomeworkAdminSubmissionItem {
  id: string
  lls_id: number | null
  lesson_id: string
  lesson_title: string | null
  activity_id: string
  node_id: string
  attempt_no: number
  status: string
  delivery_mode: string
  duration_ms: number
  created_at: string
  delivered_at: string | null
  reviewed_at: string | null
}

export interface HomeworkAdminSubmissionList {
  total: number
  items: HomeworkAdminSubmissionItem[]
}

export interface HomeworkAdminSubmissionDetail extends HomeworkAdminSubmissionItem {
  audio_url: string | null
  teleprompter_text: string | null
  asr_raw_text: string | null
  asr_corrected_text: string | null
  ise_result: Record<string, unknown> | null
  pronunciation_report: Record<string, unknown> | null
  ai_report_markdown: string | null
  teacher_report_markdown: string | null
  optimized_content_markdown: string | null
  error_message: string | null
  reviewed_by: string | null
}

export interface HomeworkAdminListParams {
  page?: number
  page_size?: number
  status?: string
  lesson_id?: string
  lls_id?: number
}

export const homeworkAdminApi = {
  listSubmissions: (params?: HomeworkAdminListParams): Promise<HomeworkAdminSubmissionList> => {
    const search = new URLSearchParams()
    if (params?.page) search.set('page', String(params.page))
    if (params?.page_size) search.set('page_size', String(params.page_size))
    if (params?.status) search.set('status', params.status)
    if (params?.lesson_id) search.set('lesson_id', params.lesson_id)
    if (params?.lls_id != null) search.set('lls_id', String(params.lls_id))
    const query = search.toString()
    return learnerAdminHttp.get(`/api/v1/learner-admin/homework/submissions${query ? `?${query}` : ''}`)
  },
  getSubmissionDetail: (id: string): Promise<HomeworkAdminSubmissionDetail> =>
    learnerAdminHttp.get(`/api/v1/learner-admin/homework/submissions/${id}`),
  updateReport: (id: string, teacherReportMarkdown: string): Promise<HomeworkAdminSubmissionDetail> =>
    learnerAdminHttp.patch(`/api/v1/learner-admin/homework/submissions/${id}`, {
      teacher_report_markdown: teacherReportMarkdown,
    }),
  deliverSubmission: (id: string): Promise<{ id: string; status: string; delivered_at: string | null }> =>
    learnerAdminHttp.post(`/api/v1/learner-admin/homework/submissions/${id}/deliver`),
}
