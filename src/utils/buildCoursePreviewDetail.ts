import type { CreatorProfileOut } from '../api/creatorProfile'
import type { CourseOut, CourseUpdate, LessonOut, MilestoneOut } from '../api/courses'
import type { CourseBranding } from '../constants/courseBranding'

/** 与 Learner CourseDetail 对齐，供 iframe 预览 postMessage 使用 */
export type CourseDetailPreview = {
  course: {
    id: string
    title: string
    description: string | null
    sort_order: number
    created_at: string
    updated_at: string
    entitlement_expires_at: string
    cover_image_url: string | null
    theme_color: string | null
    branding: CourseBranding | null
    lesson_count: number
    progress_percent: number
    continue_lesson_id: string | null
  }
  teacher: {
    display_name: string
    avatar_url: string | null
    bio: string | null
    role_label: string
    profile_stats: Array<{ label: string; value: string }>
    social_proof_label: string | null
    social_proof_quote: string | null
  }
  current_milestone: {
    id: string
    index: number
    title: string
    description: string | null
  }
  milestones: Array<{
    id: string
    course_id: string
    title: string
    description: string | null
    position: number
  }>
  lessons: Array<{
    id: string
    milestone_id: string
    title: string
    description: string | null
    duration_minutes: number | null
    lesson_type: string
    lesson_type_label: string
    position: number
    progress: { status: string; progress_percent: number }
    access: 'available' | 'locked' | 'completed'
    target: 'material' | 'atb-reaction' | 'default'
  }>
  continue_lesson: { id: string; title: string; milestone_id: string } | null
}

function lessonTypeLabel(lessonType: string): string {
  if (lessonType === 'material_library') return '素材自学'
  if (lessonType === 'atb_reaction') return 'ATB 互动'
  return lessonType
}

function lessonTarget(lessonType: string): 'material' | 'atb-reaction' | 'default' {
  if (lessonType === 'material_library') return 'material'
  if (lessonType === 'atb_reaction') return 'atb-reaction'
  return 'default'
}

function mockEntitlementExpiresAt(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString()
}

export function buildCoursePreviewDetail(params: {
  course: CourseOut
  formValues: CourseUpdate
  milestones: MilestoneOut[]
  allLessons: LessonOut[]
  creatorProfile: CreatorProfileOut | null
}): CourseDetailPreview | null {
  const { course, formValues, milestones, allLessons, creatorProfile } = params
  if (!milestones.length) return null

  const orderedMs = [...milestones].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
  const currentMs = orderedMs[0]
  const currentIndex = 1

  const mergedTitle = formValues.title?.trim() || course.title
  const mergedDescription =
    formValues.description !== undefined ? formValues.description ?? null : course.description
  const mergedCover =
    formValues.cover_image_url !== undefined ? formValues.cover_image_url ?? null : course.cover_image_url
  const mergedTheme =
    formValues.theme_color !== undefined ? formValues.theme_color ?? null : course.theme_color
  const mergedBranding =
    formValues.branding !== undefined ? formValues.branding ?? null : course.branding ?? null

  const previewLessons = allLessons
    .map((lesson) => {
      const target = lessonTarget(lesson.lesson_type)
      if (target === 'default') return null
      return {
        id: lesson.id,
        milestone_id: lesson.milestone_id,
        title: lesson.title,
        description: lesson.description,
        duration_minutes: lesson.duration_minutes,
        lesson_type: lesson.lesson_type,
        lesson_type_label: lessonTypeLabel(lesson.lesson_type),
        position: lesson.position,
        progress: { status: 'not_started', progress_percent: 0 },
        access: 'available' as const,
        target,
      }
    })
    .filter((l): l is NonNullable<typeof l> => l != null)
    .sort((a, b) => a.position - b.position)

  const continueLesson = previewLessons[0]
    ? {
        id: previewLessons[0].id,
        title: previewLessons[0].title,
        milestone_id: previewLessons[0].milestone_id,
      }
    : null

  return {
    course: {
      id: course.id,
      title: mergedTitle,
      description: mergedDescription,
      sort_order: formValues.sort_order ?? course.sort_order,
      created_at: course.created_at,
      updated_at: course.updated_at,
      entitlement_expires_at: mockEntitlementExpiresAt(),
      cover_image_url: mergedCover,
      theme_color: mergedTheme,
      branding: mergedBranding,
      lesson_count: previewLessons.length,
      progress_percent: 0,
      continue_lesson_id: continueLesson?.id ?? null,
    },
    teacher: {
      display_name: creatorProfile?.display_name ?? '主讲老师',
      avatar_url: creatorProfile?.avatar_url ?? null,
      bio: creatorProfile?.bio ?? null,
      role_label: creatorProfile?.role_label ?? '主讲老师',
      profile_stats: creatorProfile?.profile_stats ?? [],
      social_proof_label: creatorProfile?.social_proof_label ?? null,
      social_proof_quote: creatorProfile?.social_proof_quote ?? null,
    },
    current_milestone: {
      id: currentMs.id,
      index: currentIndex,
      title: currentMs.title,
      description: currentMs.description,
    },
    milestones: orderedMs.map((ms) => ({
      id: ms.id,
      course_id: ms.course_id,
      title: ms.title,
      description: ms.description,
      position: ms.position,
    })),
    lessons: previewLessons,
    continue_lesson: continueLesson,
  }
}
