import http from './http'

export interface CreatorProfileOut {
  id: string
  slug: string
  display_name: string
  status: string
  avatar_url: string | null
  bio: string | null
  role_label: string
  followers_count: number
  positive_rate_percent: number | null
  student_count: number
  social_proof_quote: string | null
  created_at: string
  updated_at: string
}

export interface CreatorProfileUpdate {
  display_name?: string
  avatar_url?: string | null
  bio?: string | null
  followers_count?: number
  positive_rate_percent?: number | null
  student_count?: number
  social_proof_quote?: string | null
}

export const creatorProfileApi = {
  getProfile: (): Promise<CreatorProfileOut> => http.get('/api/v1/creator/profile'),
  updateProfile: (body: CreatorProfileUpdate): Promise<CreatorProfileOut> =>
    http.patch('/api/v1/creator/profile', body),
}
