import { describe, expect, it } from 'vitest'
import {
  createDefaultComponent,
  createGuidedSpeakingNode,
  validateDocument,
} from './atbReactionV2Editor'
import type { AtbReactionDocument } from './atbReactionV2'

function baseDoc(): AtbReactionDocument {
  return {
    version: '0.0.2',
    src: [
      {
        id: 'img-1',
        url: 'https://example.com/a.png',
        type: 'image',
        description: 'teacher',
      },
      {
        id: 'video-1',
        url: 'https://example.com/v.mp4',
        type: 'video',
        description: 'lesson',
      },
    ],
    activities: [
      {
        id: 1,
        type: 'lecture_with_practice',
        layout: 'react_teaching_with_practice',
        video_source_id: 'video-1',
        nodes: [createGuidedSpeakingNode([], 1)],
      },
    ],
  }
}

describe('guided_speaking editor validation', () => {
  it('createDefaultComponent returns guided_speaking shape', () => {
    const comp = createDefaultComponent('guided_speaking', [])
    expect(comp.type).toBe('guided_speaking')
    if (comp.type === 'guided_speaking') {
      expect(comp.expression_goals.length).toBeGreaterThan(0)
    }
  })

  it('flags missing task_description and goals', () => {
    const doc = baseDoc()
    const node = doc.activities[0]!.nodes[0]!
    const gs = node.components.find((c) => c.type === 'guided_speaking')
    if (gs && gs.type === 'guided_speaking') {
      gs.task_description = ''
      gs.expression_goals = []
      gs.teaching_objective = ''
    }
    const errors = validateDocument(doc)
    expect(errors.some((e) => e.includes('task_description'))).toBe(true)
    expect(errors.some((e) => e.includes('expression_goals'))).toBe(true)
    expect(errors.some((e) => e.includes('teaching_objective'))).toBe(true)
  })

  it('warns when speech and guided_speaking coexist', () => {
    const errors = validateDocument(baseDoc())
    expect(errors.some((e) => e.includes('speech + guided_speaking'))).toBe(true)
  })
})
