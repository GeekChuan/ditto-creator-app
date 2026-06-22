import http from './http'

const API_V1 = '/api/v1'

export interface CourseImageComposerOut {
  id: string
  creator_id: string
  course_id: string | null
  composer_key: string
  composer_version: string
  system_prompt: string
  submerge_system_prompt: string
  whiteboard_system_prompt: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type CourseImageComposerCreate = Omit<CourseImageComposerOut, 'id' | 'creator_id' | 'created_at' | 'updated_at'>

export type CourseImageComposerUpdate = Partial<CourseImageComposerCreate>

export const courseImageComposerApi = {
  getDefaultSystemPrompt: (): Promise<{ system_prompt: string; submerge_system_prompt: string; whiteboard_system_prompt: string }> =>
    http.get(`${API_V1}/course-image-composers/default-system-prompt`),
  list: (courseId?: string): Promise<CourseImageComposerOut[]> =>
    http.get(`${API_V1}/course-image-composers`, { params: courseId ? { course_id: courseId } : undefined }),
  create: (body: CourseImageComposerCreate): Promise<CourseImageComposerOut> =>
    http.post(`${API_V1}/course-image-composers`, body),
  update: (composerId: string, body: CourseImageComposerUpdate): Promise<CourseImageComposerOut> =>
    http.put(`${API_V1}/course-image-composers/${composerId}`, body),
  activate: (composerId: string): Promise<CourseImageComposerOut> =>
    http.post(`${API_V1}/course-image-composers/${composerId}/activate`),
}
