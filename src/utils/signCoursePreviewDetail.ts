import { resolveSignedMediaUrls } from './signMediaCache'
import type { CourseBranding } from '../constants/courseBranding'
import type { CourseDetailPreview } from './buildCoursePreviewDetail'

function isRemoteMediaUrl(url: string | null | undefined): url is string {
  const u = url?.trim()
  return Boolean(u && u.startsWith('http'))
}

function resolveSigned(url: string | null | undefined, signed: Record<string, string | null>): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null
  return signed[trimmed] ?? trimmed
}

function signBranding(
  branding: CourseBranding | null | undefined,
  signed: Record<string, string | null>,
): CourseBranding | null {
  if (!branding) return null
  const next: CourseBranding = { ...branding }
  if (branding.page_texture) {
    const pt = { ...branding.page_texture }
    if (pt.url) pt.url = resolveSigned(pt.url, signed)
    next.page_texture = pt
  }
  if (branding.meta_icon?.url) {
    next.meta_icon = {
      url: resolveSigned(branding.meta_icon.url, signed) ?? branding.meta_icon.url,
    }
  }
  return next
}

export async function signCoursePreviewDetail(
  detail: CourseDetailPreview,
): Promise<CourseDetailPreview> {
  const toSign: string[] = []
  if (isRemoteMediaUrl(detail.course.cover_image_url)) toSign.push(detail.course.cover_image_url)
  if (isRemoteMediaUrl(detail.teacher.avatar_url)) toSign.push(detail.teacher.avatar_url)
  if (isRemoteMediaUrl(detail.course.branding?.page_texture?.url)) {
    toSign.push(detail.course.branding!.page_texture!.url!)
  }
  if (isRemoteMediaUrl(detail.course.branding?.meta_icon?.url)) {
    toSign.push(detail.course.branding!.meta_icon!.url)
  }

  if (!toSign.length) return detail

  const signed = await resolveSignedMediaUrls(toSign)
  return {
    ...detail,
    course: {
      ...detail.course,
      cover_image_url: resolveSigned(detail.course.cover_image_url, signed),
      branding: signBranding(detail.course.branding, signed),
    },
    teacher: {
      ...detail.teacher,
      avatar_url: resolveSigned(detail.teacher.avatar_url, signed),
    },
  }
}
