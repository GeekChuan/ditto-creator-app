import type { VideoAsset } from '../../api/assets'
import {
  buildPrepMetadataSyncPayload,
  type VideoMetadataBundle,
} from './prepMetadata'
import type { VideoSubtitleSegment } from '../../types/atbReactionV2'
import {
  SELF_STUDY_V2_SCHEMA,
  type SelfStudyDocumentV2,
  type SelfStudySubtitleSegment,
} from '../../types/selfStudyV2'

const PREP_MANAGED_KEY = 'prep_managed'

function stripPrepManaged(items: Record<string, unknown>[] | undefined): Record<string, unknown>[] {
  if (!items?.length) return []
  return items.filter((item) => !item[PREP_MANAGED_KEY])
}

function parseWords(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const item of raw) {
    const text = String(item).trim()
    if (text && !out.includes(text)) out.push(text)
  }
  return out
}

function parsePhrases(raw: unknown): Array<Record<string, string>> {
  if (!Array.isArray(raw)) return []
  const out: Array<Record<string, string>> = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const phrase = String(row.phrase || '').trim()
    if (!phrase) continue
    const parsed: Record<string, string> = { phrase }
    const zh = String(row.translation_zh || '').trim()
    const explanation = String(row.explanation || '').trim()
    if (zh) parsed.translation_zh = zh
    if (explanation) parsed.explanation = explanation
    out.push(parsed)
  }
  return out
}

function parseExpressions(raw: unknown): Array<Record<string, string>> {
  if (!Array.isArray(raw)) return []
  const out: Array<Record<string, string>> = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const expression = String(row.expression || '').trim()
    if (!expression) continue
    const parsed: Record<string, string> = { expression }
    const zh = String(row.translation_zh || '').trim()
    const explanation = String(row.explanation || '').trim()
    if (zh) parsed.translation_zh = zh
    if (explanation) parsed.explanation = explanation
    out.push(parsed)
  }
  return out
}

function occurrence(segIdx: number, seg: { start_ms: number; end_ms: number }) {
  const startMs = seg.start_ms
  const endMs = seg.end_ms >= startMs ? seg.end_ms : startMs
  return { sentence_id: segIdx, start_ms: startMs, end_ms: endMs }
}

/** 根据字幕段与已有元数据生成词汇/短语/表达 payload（对齐 prep_metadata_sync.py） */
export function buildSyncedMetadataPayloads(
  segments: Array<{
    start_ms: number
    end_ms: number
    text: string
    prep_words?: string[]
    prep_phrases?: unknown
    prep_expressions?: unknown
  }>,
  existing: VideoMetadataBundle | null | undefined,
): {
  vocabulary: { items: Record<string, unknown>[] }
  phrases: { items: Record<string, unknown>[] }
  expressions: { items: Record<string, unknown>[] }
} {
  const vocabItems = stripPrepManaged(existing?.vocabulary_payload?.items as Record<string, unknown>[] | undefined)
  const phraseItems = stripPrepManaged(existing?.phrases_payload?.items as Record<string, unknown>[] | undefined)
  const expressionItems = stripPrepManaged(existing?.expressions_payload?.items as Record<string, unknown>[] | undefined)

  const vocabKeys = new Set<string>()
  for (const item of vocabItems) {
    const word = String(item.word || item.lemma || '').trim().toLowerCase()
    if (word) vocabKeys.add(word)
  }

  let nextVocabRank = Math.max(-1, ...vocabItems.map((item) => Number(item.rank) || 0)) + 1

  for (const [segIdx, seg] of segments.entries()) {
    const text = seg.text.trim()
    if (!text) continue
    const occ = occurrence(segIdx, seg)

    for (const word of parseWords(seg.prep_words)) {
      const key = word.toLowerCase()
      if (vocabKeys.has(key)) continue
      vocabKeys.add(key)
      vocabItems.push({
        rank: nextVocabRank,
        word,
        lemma: word.toLowerCase(),
        occurrences: 1,
        first_offset_ms: occ.start_ms,
        card: { en: word, zh: '' },
        segment_refs: [occ],
        [PREP_MANAGED_KEY]: true,
      })
      nextVocabRank += 1
    }

    for (const phraseRow of parsePhrases(seg.prep_phrases)) {
      phraseItems.push({
        ...phraseRow,
        occurrences: [occ],
        [PREP_MANAGED_KEY]: true,
      })
    }

    for (const exprRow of parseExpressions(seg.prep_expressions)) {
      expressionItems.push({
        ...exprRow,
        sentence_id: occ.sentence_id,
        start_ms: occ.start_ms,
        end_ms: occ.end_ms,
        [PREP_MANAGED_KEY]: true,
      })
    }
  }

  return {
    vocabulary: { items: vocabItems },
    phrases: { items: phraseItems },
    expressions: { items: expressionItems },
  }
}

function cloneSegmentsForExport(segments: VideoSubtitleSegment[]): SelfStudySubtitleSegment[] {
  return segments.map((seg) => ({
    start_ms: seg.start_ms,
    end_ms: seg.end_ms,
    text: seg.text,
    translation_zh: seg.translation_zh,
    highlights: seg.highlights?.length ? [...seg.highlights] : undefined,
    prep_note: seg.prep_note,
    prep_words: seg.prep_words?.length ? [...seg.prep_words] : undefined,
    prep_phrases: seg.prep_phrases?.length ? seg.prep_phrases.map((p) => ({ ...p })) : undefined,
    prep_expressions: seg.prep_expressions?.length ? seg.prep_expressions.map((p) => ({ ...p })) : undefined,
    words: seg.words?.length ? seg.words.map((w) => ({ ...w })) : undefined,
  }))
}

export function buildSelfStudyV2Export(params: {
  asset: VideoAsset
  segments: VideoSubtitleSegment[]
  metadataBundle?: VideoMetadataBundle | null
  lessonTitle?: string | null
  lessonDescription?: string | null
  sourceTool?: string
}): SelfStudyDocumentV2 {
  const { asset, segments, metadataBundle, lessonTitle, lessonDescription, sourceTool } = params
  const syncSegments = buildPrepMetadataSyncPayload(segments)
  const payloads = buildSyncedMetadataPayloads(syncSegments, metadataBundle)
  const exportedSegments = cloneSegmentsForExport(segments)
  const subtitleText = exportedSegments.map((s) => s.text.trim()).filter(Boolean).join('\n')

  const durationMs =
    asset.duration != null && Number.isFinite(asset.duration)
      ? Math.round(Number(asset.duration) * 1000)
      : undefined

  return {
    schema: SELF_STUDY_V2_SCHEMA,
    version: '2.0.0',
    exported_at: new Date().toISOString(),
    lesson_title: lessonTitle?.trim() || asset.title?.trim() || undefined,
    lesson_description: lessonDescription?.trim() || asset.description?.trim() || undefined,
    video: {
      asset_id: asset.id,
      url: asset.video_url,
      cover_url: asset.cover_url || undefined,
      duration_ms: durationMs,
    },
    subtitle: {
      source_tool: sourceTool || 'subtitle-timing',
      text: subtitleText || undefined,
      segments: exportedSegments,
    },
    vocabulary: { payload: payloads.vocabulary },
    phrases: { payload: payloads.phrases },
    expressions: { payload: payloads.expressions },
  }
}
