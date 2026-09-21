import type {
  TeachingBoardActionTimeReference,
  TeachingBoardSubtitleAxis,
  TeachingBoardSubtitleSegment,
  TeachingBoardTimedToken,
} from '../../types/teachingBoard'

type UnknownRecord = Record<string, unknown>

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value : undefined
}

function readTime(record: UnknownRecord, ...keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, Math.round(value))
  }
  return undefined
}

function normalizeToken(
  value: unknown,
  segmentIndex: number,
  tokenIndex: number,
): TeachingBoardTimedToken | undefined {
  if (!isRecord(value)) return undefined
  const text = typeof value.text === 'string' ? value.text : ''
  const startMs = readTime(value, 'start_ms', 'start_time')
  const endMs = readTime(value, 'end_ms', 'end_time')
  if (startMs === undefined || endMs === undefined) return undefined
  return {
    id: readString(value.id) ?? `segment-${segmentIndex + 1}-token-${tokenIndex + 1}`,
    text,
    start_ms: startMs,
    end_ms: Math.max(startMs, endMs),
  }
}

function normalizeSegment(value: unknown, segmentIndex: number): TeachingBoardSubtitleSegment | undefined {
  if (!isRecord(value)) return undefined
  const sourceTokens = Array.isArray(value.tokens)
    ? value.tokens
    : Array.isArray(value.words)
      ? value.words
      : []
  const tokens = sourceTokens
    .map((token, tokenIndex) => normalizeToken(token, segmentIndex, tokenIndex))
    .filter((token): token is TeachingBoardTimedToken => Boolean(token))
  const startMs = readTime(value, 'start_ms', 'start_time') ?? tokens[0]?.start_ms
  const endMs = readTime(value, 'end_ms', 'end_time') ?? tokens[tokens.length - 1]?.end_ms
  if (startMs === undefined || endMs === undefined) return undefined

  return {
    id: readString(value.id) ?? `segment-${segmentIndex + 1}`,
    text: typeof value.text === 'string' ? value.text : tokens.map((token) => token.text).join(''),
    start_ms: startMs,
    end_ms: Math.max(startMs, endMs),
    tokens,
  }
}

/**
 * 兼容语音识别任务原始结果（segments[].words[]）和 Creator 标准格式
 * （segments[].tokens[]）。导入后统一使用 *_ms 字段和稳定 id。
 */
export function parseSubtitleAxis(value: unknown): TeachingBoardSubtitleAxis {
  const root = Array.isArray(value) ? { segments: value } : value
  if (!isRecord(root) || !Array.isArray(root.segments)) {
    throw new Error('字幕 JSON 中未找到 segments 数组')
  }
  const segments = root.segments
    .map((segment, index) => normalizeSegment(segment, index))
    .filter((segment): segment is TeachingBoardSubtitleSegment => Boolean(segment))
    .sort((a, b) => a.start_ms - b.start_ms)

  if (!segments.length) throw new Error('字幕轴没有可用的句子时间数据')
  if (!segments.some((segment) => segment.tokens.length)) {
    throw new Error('字幕轴缺少 words/tokens 字词级时间数据')
  }

  return {
    source_task_id: readString(root.task_id) ?? readString(root.source_task_id),
    segments,
  }
}

export function subtitleAxisEndMs(axis?: TeachingBoardSubtitleAxis): number {
  return Math.max(0, ...(axis?.segments.map((segment) => segment.end_ms) ?? []))
}

export function subtitleTokenCount(axis?: TeachingBoardSubtitleAxis): number {
  return axis?.segments.reduce((count, segment) => count + segment.tokens.length, 0) ?? 0
}

export function findSubtitleSegmentAt(
  axis: TeachingBoardSubtitleAxis | undefined,
  timeMs: number,
): TeachingBoardSubtitleSegment | undefined {
  if (!axis) return undefined
  return axis.segments.find((segment) => timeMs >= segment.start_ms && timeMs <= segment.end_ms)
    ?? [...axis.segments].reverse().find((segment) => segment.start_ms <= timeMs)
    ?? axis.segments[0]
}

export function resolveActionTimeReference(
  axis: TeachingBoardSubtitleAxis | undefined,
  reference: TeachingBoardActionTimeReference | undefined,
): number | undefined {
  if (!axis || !reference) return undefined
  const segment = axis.segments.find((item) => item.id === reference.segment_id)
  const token = segment?.tokens.find((item) => item.id === reference.token_id)
  return token?.[reference.boundary === 'start' ? 'start_ms' : 'end_ms']
}

export function formatTimelineTime(timeMs: number): string {
  const safeMs = Math.max(0, Math.round(timeMs))
  const minutes = Math.floor(safeMs / 60_000)
  const seconds = Math.floor((safeMs % 60_000) / 1000)
  const milliseconds = safeMs % 1000
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`
}
