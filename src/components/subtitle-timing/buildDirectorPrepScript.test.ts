import { describe, expect, it } from 'vitest'
import {
  buildDirectorPrepScript,
  formatSpokenLanguageLabel,
} from './buildDirectorPrepScript'
import type { VideoSubtitleSegment } from '../../types/atbReactionV2'

describe('buildDirectorPrepScript', () => {
  const segments: VideoSubtitleSegment[] = [
    {
      start_ms: 0,
      end_ms: 2000,
      text: 'Hello everyone',
      translation_zh: '大家好',
      spoken_language: 'en',
      prep_note: '开场问候',
    },
    {
      start_ms: 2000,
      end_ms: 5000,
      text: 'Let me explain in Chinese',
      translation_zh: '我用中文解释一下',
      spoken_language: 'zh',
    },
  ]

  it('exports bilingual lines and spoken language labels', () => {
    const content = buildDirectorPrepScript(segments)
    expect(content).toContain('序号：1')
    expect(content).toContain('博主语种：英文讲')
    expect(content).toContain('英文：Hello everyone')
    expect(content).toContain('中文：大家好')
    expect(content).toContain('时间戳：0ms - 2000ms')
    expect(content).toContain('备课备注：开场问候')
    expect(content).toContain('博主语种：中文讲')
    expect(content).toContain('时间戳：2000ms - 5000ms')
    expect(content).toContain('中文：我用中文解释一下')
  })

  it('defaults missing spoken_language to English', () => {
    expect(formatSpokenLanguageLabel(undefined)).toBe('英文讲')
    const content = buildDirectorPrepScript([
      { start_ms: 0, end_ms: 1000, text: 'Only English' },
    ])
    expect(content).toContain('博主语种：英文讲')
  })

  it('shows placeholder when translation is missing', () => {
    const content = buildDirectorPrepScript([
      { start_ms: 0, end_ms: 1000, text: 'No zh yet', spoken_language: 'en' },
    ])
    expect(content).toContain('中文：（暂无）')
  })
})
