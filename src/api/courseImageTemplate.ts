import http from './http'

const API_V1 = '/api/v1'

export type ImageQuality = 'medium' | 'high'
export type OutputFormat = 'png'

export interface ImageGenerationParams {
  size: string
  quality: ImageQuality
  output_format: OutputFormat
}

export interface CourseImageDefaultParams {
  submerge: ImageGenerationParams
  whiteboard: ImageGenerationParams
}

export interface SafeAreaSpec {
  canvas: string
  absoluteNoGoZones: {
    topPx: number
    bottomPx: number
  }
  contentSafeZone: {
    xMinPx: number
    xMaxPx: number
    yMinPx: number
    yMaxPx: number
  }
  rules: string
}

export interface CourseImageSafeAreaSpecs {
  submerge: SafeAreaSpec
  whiteboard: SafeAreaSpec
}

export interface CourseImageStyleLocks {
  submerge: string
  whiteboard: string
}

export interface CourseImageTemplateOut {
  id: string
  creator_id: string
  course_id: string | null
  template_key: string
  template_version: string
  submerge_template: string
  whiteboard_template: string
  style_lock: string
  typography_rules: string
  negative_rules: string
  default_params: CourseImageDefaultParams
  safe_area_spec: SafeAreaSpec
  safe_area_specs: CourseImageSafeAreaSpecs
  style_locks: CourseImageStyleLocks
  is_active: boolean
  created_at: string
  updated_at: string
}

export type CourseImageTemplateCreate = Omit<CourseImageTemplateOut, 'id' | 'creator_id' | 'created_at' | 'updated_at'>

export type CourseImageTemplateUpdate = Partial<CourseImageTemplateCreate>

export const courseImageTemplateApi = {
  list: (courseId?: string): Promise<CourseImageTemplateOut[]> =>
    http.get(`${API_V1}/course-image-templates`, { params: courseId ? { course_id: courseId } : undefined }),
  create: (body: CourseImageTemplateCreate): Promise<CourseImageTemplateOut> =>
    http.post(`${API_V1}/course-image-templates`, body),
  update: (templateId: string, body: CourseImageTemplateUpdate): Promise<CourseImageTemplateOut> =>
    http.put(`${API_V1}/course-image-templates/${templateId}`, body),
  activate: (templateId: string): Promise<CourseImageTemplateOut> =>
    http.post(`${API_V1}/course-image-templates/${templateId}/activate`),
}
