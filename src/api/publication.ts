import { http } from './http'

export type PublishResult = {
  success: boolean
  published_at: string | null
  message: string
}

export type LessonPublicationStatus = {
  lesson_id: string
  is_published: boolean
  published_at: string | null
}

export type CoursePublicationStatus = {
  course_id: string
  collection_published: boolean
  collection_published_at: string | null
  lessons: LessonPublicationStatus[]
}

export type CoursePublicationSummary = {
  course_id: string
  collection_published: boolean
  collection_published_at: string | null
}

export type BatchCoursePublicationStatus = {
  courses: CoursePublicationSummary[]
}

export const publicationApi = {
  publishCourse(courseId: string) {
    return http.post<PublishResult>(`/api/v1/courses/${courseId}/publish`)
  },
  publishLesson(lessonId: string) {
    return http.post<PublishResult>(`/api/v1/lessons/${lessonId}/publish`)
  },
  batchGetPublicationStatus(courseIds: string[]) {
    return http.post<BatchCoursePublicationStatus>('/api/v1/publication-status/batch', {
      course_ids: courseIds,
    })
  },
  getPublicationStatus(courseId: string, lessonIds?: string[]) {
    const params =
      lessonIds && lessonIds.length > 0
        ? `?${lessonIds.map((id) => `lesson_ids=${encodeURIComponent(id)}`).join('&')}`
        : ''
    return http.get<CoursePublicationStatus>(
      `/api/v1/courses/${courseId}/publication-status${params}`,
    )
  },
}
