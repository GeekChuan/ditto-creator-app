import http from './http'
import type { CourseBranding } from '../constants/courseBranding'

const API_V1 = '/api/v1'

export interface CourseOut {
  id: string
  title: string
  description: string | null
  sort_order: number
  cover_image_url: string | null
  theme_color: string | null
  branding: CourseBranding | null
  created_at: string
  updated_at: string
}

export interface CourseCreate {
  title: string
  description?: string | null
  sort_order?: number
  cover_image_url?: string | null
  theme_color?: string | null
  branding?: CourseBranding | null
}

export interface CourseUpdate {
  title?: string
  description?: string | null
  sort_order?: number
  cover_image_url?: string | null
  theme_color?: string | null
  branding?: CourseBranding | null
}

export interface MilestoneOut {
  id: string
  course_id: string
  title: string
  description: string | null
  hero_image_url: string | null
  hero_mask_image_url: string | null
  position: number
  created_at: string
  updated_at: string
}

export interface MilestoneCreate {
  title: string
  description?: string | null
  hero_image_url?: string | null
  hero_mask_image_url?: string | null
  position?: number | null
}

export interface MilestoneUpdate {
  title?: string
  description?: string | null
  hero_image_url?: string | null
  hero_mask_image_url?: string | null
  position?: number | null
}

export const LESSON_TYPE_MATERIAL_LIBRARY = 'material_library'
export const LESSON_TYPE_ATB_REACTION = 'atb_reaction'
export type LessonType = typeof LESSON_TYPE_MATERIAL_LIBRARY | typeof LESSON_TYPE_ATB_REACTION

export interface LessonOut {
  id: string
  milestone_id: string
  title: string
  description: string | null
  lesson_type: LessonType
  video_asset_id: string | null
  ditto_payload: Record<string, unknown> | null
  atb_ditto_payload?: Record<string, unknown> | null
  cover_image_url: string | null
  duration_minutes: number | null
  position: number
  created_at: string
  updated_at: string
  has_self_study?: boolean
  has_atb?: boolean
}

export interface LessonCreate {
  title: string
  description?: string | null
  lesson_type?: LessonType
  video_asset_id?: string | null
  cover_image_url?: string | null
  duration_minutes?: number | null
  position?: number | null
}

export interface LessonUpdate {
  title?: string
  description?: string | null
  lesson_type?: LessonType | null
  video_asset_id?: string | null
  cover_image_url?: string | null
  duration_minutes?: number | null
  position?: number | null
}

export const coursesApi = {
  listCourses: (): Promise<CourseOut[]> => http.get(`${API_V1}/courses`),

  createCourse: (body: CourseCreate): Promise<CourseOut> => http.post(`${API_V1}/courses`, body),

  getCourse: (courseId: string): Promise<CourseOut> => http.get(`${API_V1}/courses/${courseId}`),

  updateCourse: (courseId: string, body: CourseUpdate): Promise<CourseOut> =>
    http.patch(`${API_V1}/courses/${courseId}`, body),

  deleteCourse: (courseId: string): Promise<void> => http.delete(`${API_V1}/courses/${courseId}`),

  listMilestones: (courseId: string): Promise<MilestoneOut[]> =>
    http.get(`${API_V1}/courses/${courseId}/milestones`),

  createMilestone: (courseId: string, body: MilestoneCreate): Promise<MilestoneOut> =>
    http.post(`${API_V1}/courses/${courseId}/milestones`, body),

  updateMilestone: (milestoneId: string, body: MilestoneUpdate): Promise<MilestoneOut> =>
    http.patch(`${API_V1}/milestones/${milestoneId}`, body),

  deleteMilestone: (milestoneId: string): Promise<void> => http.delete(`${API_V1}/milestones/${milestoneId}`),

  listLessons: (milestoneId: string): Promise<LessonOut[]> =>
    http.get(`${API_V1}/milestones/${milestoneId}/lessons`),

  createLesson: (milestoneId: string, body: LessonCreate): Promise<LessonOut> =>
    http.post(`${API_V1}/milestones/${milestoneId}/lessons`, body),

  getLesson: (lessonId: string): Promise<LessonOut> => http.get(`${API_V1}/lessons/${lessonId}`),

  updateLesson: (lessonId: string, body: LessonUpdate): Promise<LessonOut> =>
    http.patch(`${API_V1}/lessons/${lessonId}`, body),

  putLessonAtbDitto: (lessonId: string, document: Record<string, unknown>): Promise<LessonOut> =>
    http.put(`${API_V1}/lessons/${lessonId}/atb-ditto`, document),

  deleteLesson: (lessonId: string): Promise<void> => http.delete(`${API_V1}/lessons/${lessonId}`),

  rebuildLessonDitto: (lessonId: string): Promise<LessonOut> =>
    http.post(`${API_V1}/lessons/${lessonId}/rebuild-ditto-payload`),
}
