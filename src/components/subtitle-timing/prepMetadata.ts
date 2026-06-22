import type { VideoSubtitleSegment } from '../../types/atbReactionV2'

export interface PrepPhrase {
  phrase: string
  translation_zh?: string
  explanation?: string
}

export interface PrepExpression {
  expression: string
  translation_zh?: string
  explanation?: string
}

export interface VideoMetadataBundle {
  vocabulary_payload?: { items?: Array<Record<string, unknown>> } | null
  phrases_payload?: { items?: Array<Record<string, unknown>> } | null
  expressions_payload?: { items?: Array<Record<string, unknown>> } | null
}

function str(v: unknown): string {
  return typeof v === 'string' ? v.trim() : ''
}

function parsePrepPhrases(raw: unknown): PrepPhrase[] {
  if (!Array.isArray(raw)) return []
  const out: PrepPhrase[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const phrase = str(row.phrase)
    if (!phrase) continue
    const parsed: PrepPhrase = { phrase }
    const zh = str(row.translation_zh)
    const explanation = str(row.explanation)
    if (zh) parsed.translation_zh = zh
    if (explanation) parsed.explanation = explanation
    out.push(parsed)
  }
  return out
}

function parsePrepExpressions(raw: unknown): PrepExpression[] {
  if (!Array.isArray(raw)) return []
  const out: PrepExpression[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const expression = str(row.expression)
    if (!expression) continue
    const parsed: PrepExpression = { expression }
    const zh = str(row.translation_zh)
    const explanation = str(row.explanation)
    if (zh) parsed.translation_zh = zh
    if (explanation) parsed.explanation = explanation
    out.push(parsed)
  }
  return out
}

function parsePrepWords(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const item of raw) {
    const word = str(item)
    if (word && !out.includes(word)) out.push(word)
  }
  return out
}

function occurrenceMatchesSegment(
  occ: Record<string, unknown>,
  segIdx: number,
  seg: VideoSubtitleSegment,
): boolean {
  const sentenceId = occ.sentence_id
  if (sentenceId != null && Number(sentenceId) === segIdx) return true
  const startMs = Number(occ.start_ms)
  return Number.isFinite(startMs) && startMs === seg.start_ms
}

function wordsFromMetadata(bundle: VideoMetadataBundle, segIdx: number, seg: VideoSubtitleSegment): string[] {
  const items = bundle.vocabulary_payload?.items ?? []
  const words: string[] = []
  for (const item of items) {
    const word = str(item.word) || str(item.lemma)
    if (!word) continue
    const refs = Array.isArray(item.segment_refs) ? item.segment_refs : []
    const matched = refs.some((ref) => {
      if (!ref || typeof ref !== 'object') return false
      return occurrenceMatchesSegment(ref as Record<string, unknown>, segIdx, seg)
    })
    if (matched && !words.includes(word)) words.push(word)
  }
  return words
}

function phrasesFromMetadata(bundle: VideoMetadataBundle, segIdx: number, seg: VideoSubtitleSegment): PrepPhrase[] {
  const items = bundle.phrases_payload?.items ?? []
  const out: PrepPhrase[] = []
  for (const item of items) {
    const phrase = str(item.phrase)
    if (!phrase) continue
    const occs = Array.isArray(item.occurrences) ? item.occurrences : []
    const matched = occs.some((occ) => {
      if (!occ || typeof occ !== 'object') return false
      return occurrenceMatchesSegment(occ as Record<string, unknown>, segIdx, seg)
    })
    if (!matched) continue
    const row: PrepPhrase = { phrase }
    const zh = str(item.translation_zh)
    const explanation = str(item.explanation)
    if (zh) row.translation_zh = zh
    if (explanation) row.explanation = explanation
    if (!out.some((p) => p.phrase === row.phrase)) out.push(row)
  }
  return out
}

function expressionsFromMetadata(
  bundle: VideoMetadataBundle,
  segIdx: number,
  seg: VideoSubtitleSegment,
): PrepExpression[] {
  const items = bundle.expressions_payload?.items ?? []
  const out: PrepExpression[] = []
  for (const item of items) {
    const expression = str(item.expression)
    if (!expression) continue
    const sentenceId = item.sentence_id
    const startMs = Number(item.start_ms)
    const matched =
      (sentenceId != null && Number(sentenceId) === segIdx)
      || (Number.isFinite(startMs) && startMs === seg.start_ms)
    if (!matched) continue
    const row: PrepExpression = { expression }
    const zh = str(item.translation_zh)
    const explanation = str(item.explanation)
    if (zh) row.translation_zh = zh
    if (explanation) row.explanation = explanation
    if (!out.some((p) => p.expression === row.expression)) out.push(row)
  }
  return out
}

/** 将元数据中的逐句知识点合并进字幕段（不覆盖已保存的 prep_* 字段） */
export function mergePrepKnowledgeFromMetadata(
  segments: VideoSubtitleSegment[],
  bundle: VideoMetadataBundle | null | undefined,
): VideoSubtitleSegment[] {
  if (!bundle) return segments
  return segments.map((seg, idx) => {
    const prepWords = parsePrepWords(seg.prep_words)
    const prepPhrases = parsePrepPhrases(seg.prep_phrases)
    const prepExpressions = parsePrepExpressions(seg.prep_expressions)

    const mergedWords = prepWords.length
      ? prepWords
      : (seg.highlights?.length ? [...seg.highlights] : wordsFromMetadata(bundle, idx, seg))
    const mergedPhrases = prepPhrases.length ? prepPhrases : phrasesFromMetadata(bundle, idx, seg)
    const mergedExpressions = prepExpressions.length
      ? prepExpressions
      : expressionsFromMetadata(bundle, idx, seg)

    return {
      ...seg,
      prep_words: mergedWords.length ? mergedWords : undefined,
      prep_phrases: mergedPhrases.length ? mergedPhrases : undefined,
      prep_expressions: mergedExpressions.length ? mergedExpressions : undefined,
    }
  })
}

export function serializePrepPhrasesForApi(phrases: PrepPhrase[] | undefined): PrepPhrase[] | undefined {
  const rows = (phrases ?? [])
    .map((p) => ({
      phrase: p.phrase.trim(),
      translation_zh: p.translation_zh?.trim() || undefined,
      explanation: p.explanation?.trim() || undefined,
    }))
    .filter((p) => p.phrase)
  return rows.length ? rows : undefined
}

export function serializePrepExpressionsForApi(
  expressions: PrepExpression[] | undefined,
): PrepExpression[] | undefined {
  const rows = (expressions ?? [])
    .map((p) => ({
      expression: p.expression.trim(),
      translation_zh: p.translation_zh?.trim() || undefined,
      explanation: p.explanation?.trim() || undefined,
    }))
    .filter((p) => p.expression)
  return rows.length ? rows : undefined
}

export function buildPrepMetadataSyncPayload(segments: VideoSubtitleSegment[]) {
  return segments
    .map((seg) => ({
      start_ms: seg.start_ms,
      end_ms: seg.end_ms,
      text: seg.text.trim(),
      prep_words: parsePrepWords(seg.prep_words),
      prep_phrases: serializePrepPhrasesForApi(seg.prep_phrases),
      prep_expressions: serializePrepExpressionsForApi(seg.prep_expressions),
    }))
    .filter((seg) => seg.text)
}

export function formatPrepPhrasesDraft(phrases: PrepPhrase[] | undefined): string {
  return (phrases ?? [])
    .map((p) => {
      const parts = [p.phrase]
      if (p.translation_zh) parts.push(p.translation_zh)
      if (p.explanation) parts.push(p.explanation)
      return parts.join(' | ')
    })
    .join('\n')
}

export function parsePrepPhrasesDraft(raw: string): PrepPhrase[] {
  const lines = raw.split('\n').map((line) => line.trim()).filter(Boolean)
  const out: PrepPhrase[] = []
  for (const line of lines) {
    const [phrase, translation_zh, explanation] = line.split('|').map((part) => part.trim())
    if (!phrase) continue
    const row: PrepPhrase = { phrase }
    if (translation_zh) row.translation_zh = translation_zh
    if (explanation) row.explanation = explanation
    out.push(row)
  }
  return out
}

export function formatPrepExpressionsDraft(expressions: PrepExpression[] | undefined): string {
  return formatPrepPhrasesDraft(
    (expressions ?? []).map((item) => ({
      phrase: item.expression,
      translation_zh: item.translation_zh,
      explanation: item.explanation,
    })),
  )
}

export function parsePrepExpressionsDraft(raw: string): PrepExpression[] {
  return parsePrepPhrasesDraft(raw).map((row) => ({
    expression: row.phrase,
    translation_zh: row.translation_zh,
    explanation: row.explanation,
  }))
}
