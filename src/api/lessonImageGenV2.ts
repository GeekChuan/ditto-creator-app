import http from './http'
import type { CourseImageComposerOut } from './courseImageComposer'
import type { CourseImageTemplateOut, ImageGenerationParams } from './courseImageTemplate'

const API_V1 = '/api/v1'

export type ImageGenerationType = 'submerge_sequence' | 'whiteboard'

export interface PromptComposerOutputV2 {
  imageType: ImageGenerationType
  styleBibleVersion?: string | null
  sceneArchetype?: string | null
  sceneGoal: string
  visualConcept: string
  sceneBackdrop?: string | null
  requiredText: string[]
  layoutPlan: string
  typographyPlan?: string | null
  styleConsistencyNotes?: string | null
  whiteboardContentPlan?: string | null
  iconPlan?: string | null
  imagePrompt: string
  safetyNegativePrompt: string
}

export interface StyleCheckResult {
  pass: boolean
  issues: string[]
  rewriteInstruction: string
}

export interface LessonImageComposeV2Request {
  course_id: string
  lesson_id?: string | null
  node_id?: string | null
  image_type: ImageGenerationType
  template_id?: string | null
  composer_id?: string | null
  node_script: string
  full_course_script: string
  whiteboard_outline?: string | null
  reference_image_url?: string | null
  reference_image_note?: string | null
}

export interface LessonImageComposeV2Response {
  template: CourseImageTemplateOut
  composer: CourseImageComposerOut | null
  composer_input: Record<string, unknown>
  composer_output: PromptComposerOutputV2
  final_image_prompt: string
  params: ImageGenerationParams
  composer_duration_ms: number | null
  style_check_result: StyleCheckResult | null
}

export interface LessonImageGenerationV2Create extends LessonImageComposeV2Request {
  composer_output?: PromptComposerOutputV2 | null
  final_image_prompt?: string | null
  params?: ImageGenerationParams | null
  reference_generation_id?: string | null
  composer_duration_ms?: number | null
}

export interface LessonImageGenerationV2Out {
  id: string
  creator_id: string
  user_id: string | null
  course_id: string | null
  lesson_id: string | null
  node_id: string | null
  image_type: ImageGenerationType
  template_id: string | null
  template_version: string
  composer_id: string | null
  composer_version: string | null
  style_bible_version: string | null
  scene_archetype: string | null
  style_check_result: Record<string, unknown> | null
  composer_duration_ms: number | null
  image_generation_duration_ms: number | null
  composer_input: Record<string, unknown>
  composer_output: Record<string, unknown>
  final_image_prompt: string
  safety_negative_prompt: string | null
  model: string
  size: string | null
  quality: string
  output_format: string
  status: string
  reference_generation_id: string | null
  image_cos_key: string | null
  image_url: string | null
  image_access_url: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export const lessonImageGenV2Api = {
  composePrompt: (body: LessonImageComposeV2Request): Promise<LessonImageComposeV2Response> =>
    http.post(`${API_V1}/lesson-image-gen-v2/compose-prompt`, body, { timeout: 180_000 }),
  generate: (body: LessonImageGenerationV2Create): Promise<LessonImageGenerationV2Out> =>
    http.post(`${API_V1}/lesson-image-gen-v2/generate`, body, { timeout: 300_000 }),
  listGenerations: (params?: { course_id?: string; image_type?: ImageGenerationType }): Promise<LessonImageGenerationV2Out[]> =>
    http.get(`${API_V1}/lesson-image-gen-v2/generations`, { params }),
}
