import { assetsApi } from '../../../api/assets'
import type { SubtitleCue, VideoSubtitleSegment } from '../../../types/atbReactionV2'

/** 火山引擎 asr-forced-align / speech-recognition 返回片段 → 字幕 cue */
export function mapForcedAlignSegments(
  segments: Array<Record<string, unknown>>,
): SubtitleCue[] {
  const cues: SubtitleCue[] = []
  for (const seg of segments) {
    const text = String(seg.text ?? '').trim()
    if (!text) continue
    const startRaw = Number(seg.start_time ?? seg.start_ms ?? 0)
    const endRaw = Number(seg.end_time ?? seg.end_ms ?? startRaw)
    cues.push({
      start_ms: Math.round(startRaw),
      end_ms: Math.round(endRaw),
      text,
    })
  }
  return cues
}

export function mapUtterancesToVideoSegments(
  utterances: Array<Record<string, unknown>>,
): VideoSubtitleSegment[] {
  const segments: VideoSubtitleSegment[] = []
  for (const u of utterances) {
    const start = Number(u.start_time ?? u.start_ms ?? u.begin_time ?? 0)
    const end = Number(u.end_time ?? u.end_ms ?? u.finish_time ?? 0)
    const text = String(u.text ?? u.content ?? '').trim()
    if (!text) continue
    const startMs = start > 10000 ? start : Math.round(start * 1000)
    const endMs = end > 10000 ? end : Math.round(end * 1000)
    segments.push({ start_ms: startMs, end_ms: endMs, text })
  }
  return segments
}

export async function resolvePlayableAudioUrl(rawUrl: string): Promise<string> {
  const trimmed = rawUrl.trim()
  if (!trimmed) return trimmed
  try {
    const { play_url } = await assetsApi.getPlaybackUrl({ file_url: trimmed })
    return play_url || trimmed
  } catch {
    return trimmed
  }
}
