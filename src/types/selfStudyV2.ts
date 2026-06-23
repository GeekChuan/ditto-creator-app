/** 自学课 V2 文档 schema（Creator 侧，与 ditto-learner-shared 对齐） */

export const SELF_STUDY_V2_SCHEMA = 'ditto.self-study.v2' as const

export interface SelfStudyPrepPhrase {
  phrase: string
  translation_zh?: string
  explanation?: string
}

export interface SelfStudyPrepExpression {
  expression: string
  translation_zh?: string
  explanation?: string
}

export interface SelfStudySubtitleWord {
  start_ms: number
  end_ms: number
  text: string
}

export interface SelfStudySubtitleSegment {
  start_ms: number
  end_ms: number
  text: string
  translation_zh?: string
  highlights?: string[]
  prep_note?: string
  prep_words?: string[]
  prep_phrases?: SelfStudyPrepPhrase[]
  prep_expressions?: SelfStudyPrepExpression[]
  words?: SelfStudySubtitleWord[]
}

export interface SelfStudyVideoRef {
  asset_id: string
  url: string
  cover_url?: string
  duration_ms?: number
}

export interface SelfStudySubtitleBlock {
  source_tool?: string
  text?: string
  segments: SelfStudySubtitleSegment[]
}

export interface SelfStudyMetadataPayload {
  payload: { items: Record<string, unknown>[] }
}

export interface SelfStudyDocumentV2 {
  schema: typeof SELF_STUDY_V2_SCHEMA
  version: string
  exported_at: string
  lesson_title?: string
  lesson_description?: string
  video: SelfStudyVideoRef
  subtitle: SelfStudySubtitleBlock
  vocabulary: SelfStudyMetadataPayload
  phrases: SelfStudyMetadataPayload
  expressions: SelfStudyMetadataPayload
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

export function isSelfStudyV2Document(doc: unknown): doc is SelfStudyDocumentV2 {
  if (!isRecord(doc)) return false
  if (doc.schema !== SELF_STUDY_V2_SCHEMA) return false
  const video = doc.video
  if (!isRecord(video)) return false
  if (typeof video.url !== 'string' || !video.url.trim()) return false
  const subtitle = doc.subtitle
  if (!isRecord(subtitle)) return false
  if (!Array.isArray(subtitle.segments)) return false
  return true
}
