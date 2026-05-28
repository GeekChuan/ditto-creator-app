import http from './http'

export interface CourseOut {
  id: string
  title: string
  description: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface CourseCreate {
  title: string
  description?: string | null
  sort_order?: number
}

export interface CourseUpdate {
  title?: string
  description?: string | null
  sort_order?: number
}

export interface MilestoneOut {
  id: string
  course_id: string
  title: string
  description: string | null
  position: number
  created_at: string
  updated_at: string
}

export interface MilestoneCreate {
  title: string
  description?: string | null
  position?: number | null
}

export interface MilestoneUpdate {
  title?: string
  description?: string | null
  position?: number | null
}

export const LESSON_TYPE_MATERIAL_LIBRARY = 'material_library'
export const LESSON_TYPE_ATB_REACTION = 'atb_reaction'
export const LESSON_TYPE_DUAL = 'dual'

export interface LessonOut {
  id: string
  milestone_id: string
  title: string
  description: string | null
  lesson_type: string
  video_asset_id: string | null
  ditto_payload: Record<string, unknown> | null
  atb_ditto_payload?: Record<string, unknown> | null
  position: number
  created_at: string
  updated_at: string
  has_self_study?: boolean
  has_atb?: boolean
}

export interface LessonCreate {
  title: string
  description?: string | null
  lesson_type?: string
  video_asset_id?: string | null
  position?: number | null
}

export interface LessonUpdate {
  title?: string
  description?: string | null
  lesson_type?: string | null
  video_asset_id?: string | null
  position?: number | null
}

export const coursesApi = {
  listCourses: (): Promise<CourseOut[]> => http.get('/api/v1/courses'),

  createCourse: (body: CourseCreate): Promise<CourseOut> => http.post('/api/v1/courses', body),

  getCourse: (courseId: string): Promise<CourseOut> => http.get(`/api/v1/courses/${courseId}`),

  updateCourse: (courseId: string, body: CourseUpdate): Promise<CourseOut> =>
    http.patch(`/api/v1/courses/${courseId}`, body),

  deleteCourse: (courseId: string): Promise<void> => http.delete(`/api/v1/courses/${courseId}`),

  listMilestones: (courseId: string): Promise<MilestoneOut[]> =>
    http.get(`/api/v1/courses/${courseId}/milestones`),

  createMilestone: (courseId: string, body: MilestoneCreate): Promise<MilestoneOut> =>
    http.post(`/api/v1/courses/${courseId}/milestones`, body),

  updateMilestone: (milestoneId: string, body: MilestoneUpdate): Promise<MilestoneOut> =>
    http.patch(`/api/v1/milestones/${milestoneId}`, body),

  deleteMilestone: (milestoneId: string): Promise<void> => http.delete(`/api/v1/milestones/${milestoneId}`),

  listLessons: (milestoneId: string): Promise<LessonOut[]> =>
    http.get(`/api/v1/milestones/${milestoneId}/lessons`),

  createLesson: (milestoneId: string, body: LessonCreate): Promise<LessonOut> =>
    http.post(`/api/v1/milestones/${milestoneId}/lessons`, body),

  getLesson: (lessonId: string): Promise<LessonOut> => http.get(`/api/v1/lessons/${lessonId}`),

  updateLesson: (lessonId: string, body: LessonUpdate): Promise<LessonOut> =>
    http.patch(`/api/v1/lessons/${lessonId}`, body),

  putLessonAtbDitto: (lessonId: string, document: Record<string, unknown>): Promise<LessonOut> =>
    http.put(`/api/v1/lessons/${lessonId}/atb-ditto`, document),

  deleteLesson: (lessonId: string): Promise<void> => http.delete(`/api/v1/lessons/${lessonId}`),

  rebuildLessonDitto: (lessonId: string): Promise<LessonOut> =>
    http.post(`/api/v1/lessons/${lessonId}/rebuild-ditto-payload`),
}
