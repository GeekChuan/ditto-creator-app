import type { SubtitleSpokenLanguage, VideoSubtitleSegment } from '../../types/atbReactionV2'

export function resolveSpokenLanguage(lang?: SubtitleSpokenLanguage): SubtitleSpokenLanguage {
  return lang === 'zh' ? 'zh' : 'en'
}

export function formatSpokenLanguageLabel(lang?: SubtitleSpokenLanguage): string {
  return resolveSpokenLanguage(lang) === 'zh' ? '中文讲' : '英文讲'
}

function displayLine(value: string | undefined): string {
  const trimmed = value?.trim()
  return trimmed || '（暂无）'
}

function formatDirectorTimestamp(ms: number): string {
  return `${Math.max(0, Math.round(ms))}ms`
}

export function buildDirectorPrepScript(segments: VideoSubtitleSegment[]): string {
  return [...segments]
    .sort((a, b) => a.start_ms - b.start_ms)
    .map((seg) => ({
      text: seg.text.trim(),
      translationZh: seg.translation_zh?.trim() || '',
      timeRange: `${formatDirectorTimestamp(seg.start_ms)} - ${formatDirectorTimestamp(seg.end_ms)}`,
      prepNote: seg.prep_note?.trim() || '',
      spokenLanguage: formatSpokenLanguageLabel(seg.spoken_language),
    }))
    .filter((item) => item.text)
    .map((item, index) => {
      const lines = [
        `序号：${index + 1}`,
        `博主语种：${item.spokenLanguage}`,
        `英文：${displayLine(item.text)}`,
        `中文：${displayLine(item.translationZh)}`,
        `时间戳：${item.timeRange}`,
      ]
      if (item.prepNote) {
        lines.push(`备课备注：${item.prepNote}`)
      }
      return lines.join('\n')
    })
    .join('\n\n')
}
