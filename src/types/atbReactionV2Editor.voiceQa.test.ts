import { describe, expect, it } from 'vitest'
import {
  createVoiceQaSimpleNode,
  validateDocument,
} from './atbReactionV2Editor'
import type { AtbReactionDocument } from './atbReactionV2'

function minimalVoiceQaDoc(): AtbReactionDocument {
  const node = createVoiceQaSimpleNode([], 10)
  const vq = node.components.find((c) => c.type === 'voice_qa_simple')!
  if (vq.type === 'voice_qa_simple') {
    vq.hint_markdown = '**Gossip** shows'
    vq.question_en = 'Name a US show about gossip'
    vq.teaching_objective = 'Know gossip TV shows'
    vq.standard_answer = 'Gossip Girl'
  }
  return {
    version: '0.0.5',
    src: [{ id: '1', url: 'https://x/v.mp4', type: 'video', description: 'v' }],
    activities: [
      {
        id: 2,
        type: 'lecture_with_practice',
        layout: 'react_teaching_with_practice',
        video_source_id: '1',
        nodes: [node],
      },
    ],
  }
}

describe('validateDocument voice_qa_simple', () => {
  it('accepts valid voice qa node', () => {
    const errors = validateDocument(minimalVoiceQaDoc())
    expect(errors.some((e) => e.includes('voice_qa_simple') && !e.startsWith('[提示]'))).toBe(false)
  })

  it('rejects missing hint_markdown', () => {
    const doc = minimalVoiceQaDoc()
    const comp = doc.activities[0]!.nodes[0]!.components.find((c) => c.type === 'voice_qa_simple')!
    if (comp.type === 'voice_qa_simple') comp.hint_markdown = ''
    const errors = validateDocument(doc)
    expect(errors.some((e) => e.includes('hint_markdown'))).toBe(true)
  })

  it('rejects missing teaching_objective', () => {
    const doc = minimalVoiceQaDoc()
    const comp = doc.activities[0]!.nodes[0]!.components.find((c) => c.type === 'voice_qa_simple')!
    if (comp.type === 'voice_qa_simple') comp.teaching_objective = ''
    const errors = validateDocument(doc)
    expect(errors.some((e) => e.includes('teaching_objective'))).toBe(true)
  })
})

describe('createVoiceQaSimpleNode', () => {
  it('includes teacher_avatar, speech, voice_qa_simple', () => {
    const node = createVoiceQaSimpleNode([], 3)
    expect(node.components.map((c) => c.type)).toEqual([
      'teacher_avatar',
      'speech',
      'voice_qa_simple',
    ])
  })
})
