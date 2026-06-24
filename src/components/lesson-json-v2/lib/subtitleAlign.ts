import { assetsApi } from '../../../api/assets'
import type { SubtitleCue, VideoSubtitleSegment } from '../../../types/atbReactionV2'
import { toSubtitleMs } from '../../subtitle-timing/normalizeSegments'

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
      start_ms: toSubtitleMs(startRaw),
      end_ms: toSubtitleMs(endRaw, toSubtitleMs(startRaw)),
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
    const text = String(u.text ?? u.content ?? '').trim()
    if (!text) continue
    const startRaw = u.start_ms ?? u.start_time ?? u.begin_time ?? 0
    const endRaw = u.end_ms ?? u.end_time ?? u.finish_time ?? startRaw
    const startMs = toSubtitleMs(startRaw)
    const endMs = toSubtitleMs(endRaw, startMs)
    segments.push({ start_ms: startMs, end_ms: Math.max(startMs, endMs), text })
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
