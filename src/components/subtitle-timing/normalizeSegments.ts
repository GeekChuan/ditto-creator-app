import type {
  PrepExpression,
  PrepPhrase,
  SubtitleSpokenLanguage,
  VideoSubtitleSegment,
} from '../../types/atbReactionV2'

/**
 * 统一时间单位为毫秒。
 * - start_ms / end_ms：已是毫秒（元数据流水线、手动保存）
 * - start_time / end_time：火山 ASR 与 subtitle 队列入库格式，同样是毫秒
 * - 仅当值为带小数的小数秒（如 0.55）时才 ×1000
 */
export function toSubtitleMs(raw: unknown, fallback = 0): number {
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 0) return fallback
  if (!Number.isInteger(n) && n < 1000) {
    return Math.round(n * 1000)
  }
  return Math.round(n)
}

function resolveStartMs(item: Record<string, unknown>): number {
  if (item.start_ms != null) return toSubtitleMs(item.start_ms)
  if (item.start_time != null) return toSubtitleMs(item.start_time)
  if (item.begin_time != null) return toSubtitleMs(item.begin_time)
  return 0
}

function resolveEndMs(item: Record<string, unknown>, startMs: number): number {
  if (item.end_ms != null) return toSubtitleMs(item.end_ms, startMs)
  if (item.end_time != null) return toSubtitleMs(item.end_time, startMs)
  if (item.finish_time != null) return toSubtitleMs(item.finish_time, startMs)
  return startMs
}

/** 将数据库 / ASR 多种字段格式统一为编辑器使用的 segments */
export function normalizeStoredSubtitleSegments(
  raw: Array<Record<string, unknown>> | null | undefined,
): VideoSubtitleSegment[] {
  if (!raw?.length) return []
  const segments: VideoSubtitleSegment[] = []
  for (const item of raw) {
    const text = String(item.text ?? item.content ?? '').trim()
    if (!text) continue
    const startMs = resolveStartMs(item)
    const endMs = resolveEndMs(item, startMs)
    const seg: VideoSubtitleSegment = {
      start_ms: startMs,
      end_ms: Math.max(startMs, endMs),
      text,
    }
    const zh = item.translation_zh
    if (typeof zh === 'string' && zh.trim()) {
      seg.translation_zh = zh.trim()
    }
    if (Array.isArray(item.highlights)) {
      seg.highlights = item.highlights.map((h) => String(h).trim()).filter(Boolean)
    }
    const prepNote = item.prep_note
    if (typeof prepNote === 'string' && prepNote.trim()) {
      seg.prep_note = prepNote.trim()
    }
    if (Array.isArray(item.prep_words)) {
      seg.prep_words = item.prep_words.map((w) => String(w).trim()).filter(Boolean)
    }
    if (Array.isArray(item.prep_phrases)) {
      const phrases: PrepPhrase[] = []
      for (const p of item.prep_phrases) {
        if (!p || typeof p !== 'object') continue
        const row = p as Record<string, unknown>
        const phrase = String(row.phrase ?? '').trim()
        if (!phrase) continue
        const parsed: PrepPhrase = { phrase }
        const zh = String(row.translation_zh ?? '').trim()
        const explanation = String(row.explanation ?? '').trim()
        if (zh) parsed.translation_zh = zh
        if (explanation) parsed.explanation = explanation
        phrases.push(parsed)
      }
      if (phrases.length) seg.prep_phrases = phrases
    }
    if (Array.isArray(item.prep_expressions)) {
      const expressions: PrepExpression[] = []
      for (const p of item.prep_expressions) {
        if (!p || typeof p !== 'object') continue
        const row = p as Record<string, unknown>
        const expression = String(row.expression ?? '').trim()
        if (!expression) continue
        const parsed: PrepExpression = { expression }
        const zh = String(row.translation_zh ?? '').trim()
        const explanation = String(row.explanation ?? '').trim()
        if (zh) parsed.translation_zh = zh
        if (explanation) parsed.explanation = explanation
        expressions.push(parsed)
      }
      if (expressions.length) seg.prep_expressions = expressions
    }
    if (Array.isArray(item.words)) {
      seg.words = item.words as VideoSubtitleSegment['words']
    }
    const spokenLanguage = item.spoken_language
    if (spokenLanguage === 'en' || spokenLanguage === 'zh') {
      seg.spoken_language = spokenLanguage as SubtitleSpokenLanguage
    }
    segments.push(seg)
  }
  return segments.sort((a, b) => a.start_ms - b.start_ms)
}

export function formatMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  const frac = Math.floor((ms % 1000) / 10)
  return `${m}:${s.toString().padStart(2, '0')}.${frac.toString().padStart(2, '0')}`
}

export function findActiveSegmentIndex(segments: VideoSubtitleSegment[], timeMs: number): number {
  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i]
    if (timeMs >= seg.start_ms && timeMs < seg.end_ms) return i
  }
  return -1
}
