import {
  SELF_STUDY_V2_SCHEMA,
  type SelfStudyDocumentV2,
  type SelfStudySubtitleSegment,
  type SelfStudyVideoRef,
} from './selfStudyV2'

export type { SelfStudyDocumentV2, SelfStudySubtitleSegment, SelfStudyVideoRef }

export function createEmptyDocument(video?: Partial<SelfStudyVideoRef>): SelfStudyDocumentV2 {
  const now = new Date().toISOString()
  return {
    schema: SELF_STUDY_V2_SCHEMA,
    version: '2.0.0',
    exported_at: now,
    lesson_title: '',
    lesson_description: '',
    video: {
      asset_id: video?.asset_id?.trim() || '',
      url: video?.url?.trim() || '',
      cover_url: video?.cover_url?.trim() || undefined,
      duration_ms: video?.duration_ms,
    },
    subtitle: {
      source_tool: 'subtitle-timing',
      segments: [],
    },
    vocabulary: { payload: { items: [] } },
    phrases: { payload: { items: [] } },
    expressions: { payload: { items: [] } },
  }
}

export function parseDocumentImport(text: string): SelfStudyDocumentV2 {
  const parsed = JSON.parse(text) as unknown
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('JSON 须为对象')
  }
  const raw = parsed as SelfStudyDocumentV2
  if (raw.schema !== SELF_STUDY_V2_SCHEMA) {
    throw new Error(`缺少或无效的 schema 字段（须为 ${SELF_STUDY_V2_SCHEMA}）`)
  }
  if (!raw.version || typeof raw.version !== 'string') {
    throw new Error('缺少 version 字段')
  }
  if (!raw.video || typeof raw.video !== 'object') {
    throw new Error('缺少 video 对象')
  }
  if (!raw.subtitle || !Array.isArray(raw.subtitle.segments)) {
    throw new Error('缺少 subtitle.segments 数组')
  }
  return raw
}

export function stringifyDocument(doc: SelfStudyDocumentV2): string {
  return JSON.stringify(doc, null, 2)
}

export function validateDocument(doc: SelfStudyDocumentV2): string[] {
  const errors: string[] = []
  if (doc.schema !== SELF_STUDY_V2_SCHEMA) {
    errors.push(`schema 须为 ${SELF_STUDY_V2_SCHEMA}`)
  }
  if (!doc.version?.trim()) errors.push('version 不能为空')
  if (!doc.video?.asset_id?.trim()) errors.push('video.asset_id 不能为空')
  if (!doc.video?.url?.trim()) errors.push('video.url 不能为空')
  if (!Array.isArray(doc.subtitle?.segments)) {
    errors.push('subtitle.segments 须为数组')
  } else if (!doc.subtitle.segments.length) {
    errors.push('subtitle.segments 至少包含 1 条字幕')
  } else {
    for (const [i, seg] of doc.subtitle.segments.entries()) {
      if (!seg.text?.trim()) errors.push(`subtitle.segments[${i}].text 不能为空`)
      if (!Number.isFinite(seg.start_ms) || !Number.isFinite(seg.end_ms)) {
        errors.push(`subtitle.segments[${i}] 须包含有效 start_ms/end_ms`)
      }
    }
  }
  for (const key of ['vocabulary', 'phrases', 'expressions'] as const) {
    const block = doc[key]
    if (!block?.payload || !Array.isArray(block.payload.items)) {
      errors.push(`${key}.payload.items 须为数组`)
    }
  }
  return errors
}
