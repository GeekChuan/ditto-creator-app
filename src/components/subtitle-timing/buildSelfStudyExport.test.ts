import { describe, expect, it } from 'vitest'
import { buildSelfStudyV2Export } from './buildSelfStudyExport'
import type { VideoAsset } from '../../api/assets'
import type { VideoSubtitleSegment } from '../../types/atbReactionV2'
import { isSelfStudyV2Document } from '../../types/selfStudyV2'

describe('buildSelfStudyV2Export', () => {
  const asset: VideoAsset = {
    id: 'asset-1',
    title: 'Demo Lesson',
    video_url: 'https://oss.example.com/video.mp4',
    cover_url: null,
    cover_width: null,
    cover_height: null,
    video_width: null,
    video_height: null,
    duration: 120.5,
    source_url: null,
    author: null,
    description: null,
    subtitle_status: 'ready',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  }

  const segments: VideoSubtitleSegment[] = [
    {
      start_ms: 0,
      end_ms: 2000,
      text: 'Hello',
      translation_zh: '你好',
      prep_words: ['Hello'],
      prep_phrases: [{ phrase: 'Hello', translation_zh: '你好' }],
    },
  ]

  it('builds ditto.self-study.v2 export with metadata payloads', () => {
    const doc = buildSelfStudyV2Export({ asset, segments })
    expect(isSelfStudyV2Document(doc)).toBe(true)
    expect(doc.video.asset_id).toBe('asset-1')
    expect(doc.subtitle.segments).toHaveLength(1)
    expect(doc.vocabulary.payload.items.length).toBeGreaterThan(0)
    expect(doc.phrases.payload.items.length).toBeGreaterThan(0)
  })
})
