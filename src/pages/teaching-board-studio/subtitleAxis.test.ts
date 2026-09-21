import { describe, expect, it } from 'vitest'
import {
  parseSubtitleAxis,
  resolveActionTimeReference,
  subtitleAxisEndMs,
  subtitleTokenCount,
} from './subtitleAxis'

describe('TeachingBoard subtitle axis', () => {
  it('normalizes speech recognition segments and words', () => {
    const axis = parseSubtitleAxis({
      task_id: 'task-123',
      status: 'Success',
      segments: [
        {
          text: 'I’m good at numbers',
          start_time: 30334,
          end_time: 31653,
          words: [
            { text: 'I’m', start_time: 30334, end_time: 30580, attribute: {} },
            { text: ' ', start_time: 30580, end_time: 30580, attribute: {} },
            { text: 'good', start_time: 30580, end_time: 30900, attribute: {} },
            { text: 'at', start_time: 30900, end_time: 31100, attribute: {} },
            { text: 'numbers', start_time: 31100, end_time: 31653, attribute: {} },
          ],
        },
      ],
    })

    expect(axis.source_task_id).toBe('task-123')
    expect(axis.segments[0]).toMatchObject({
      id: 'segment-1',
      start_ms: 30334,
      end_ms: 31653,
    })
    expect(axis.segments[0]?.tokens[2]).toMatchObject({
      id: 'segment-1-token-3',
      text: 'good',
      start_ms: 30580,
      end_ms: 30900,
    })
    expect(subtitleTokenCount(axis)).toBe(5)
    expect(subtitleAxisEndMs(axis)).toBe(31653)
  })

  it('resolves an action to either token boundary', () => {
    const axis = parseSubtitleAxis({
      segments: [{
        text: '好',
        start_time: 134,
        end_time: 345,
        words: [{ text: '好', start_time: 134, end_time: 345 }],
      }],
    })
    const reference = {
      segment_id: 'segment-1',
      token_id: 'segment-1-token-1',
      boundary: 'start' as const,
    }

    expect(resolveActionTimeReference(axis, reference)).toBe(134)
    expect(resolveActionTimeReference(axis, { ...reference, boundary: 'end' })).toBe(345)
  })

  it('rejects sentence-only data without word timing', () => {
    expect(() => parseSubtitleAxis({
      segments: [{ text: 'No tokens', start_time: 0, end_time: 1000 }],
    })).toThrow('words/tokens')
  })
})
