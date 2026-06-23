import { describe, expect, it } from 'vitest'
import {
  createEmptyDocument,
  parseDocumentImport,
  validateDocument,
} from './selfStudyV2Editor'
import { isSelfStudyV2Document } from './selfStudyV2'

describe('selfStudyV2Editor', () => {
  it('createEmptyDocument has required schema', () => {
    const doc = createEmptyDocument({ asset_id: 'a', url: 'https://example.com/v.mp4' })
    expect(doc.schema).toBe('ditto.self-study.v2')
    expect(doc.video.asset_id).toBe('a')
  })

  it('validateDocument rejects empty segments', () => {
    const doc = createEmptyDocument({ asset_id: 'a', url: 'https://example.com/v.mp4' })
    const errors = validateDocument(doc)
    expect(errors.some((e) => e.includes('subtitle.segments'))).toBe(true)
  })

  it('parseDocumentImport accepts valid export', () => {
    const raw = {
      schema: 'ditto.self-study.v2',
      version: '2.0.0',
      exported_at: '2026-01-01T00:00:00.000Z',
      video: { asset_id: 'id', url: 'https://x.com/v.mp4' },
      subtitle: { segments: [{ start_ms: 0, end_ms: 1000, text: 'Hi' }] },
      vocabulary: { payload: { items: [] } },
      phrases: { payload: { items: [] } },
      expressions: { payload: { items: [] } },
    }
    const doc = parseDocumentImport(JSON.stringify(raw))
    expect(isSelfStudyV2Document(doc)).toBe(true)
    expect(validateDocument(doc)).toEqual([])
  })
})
