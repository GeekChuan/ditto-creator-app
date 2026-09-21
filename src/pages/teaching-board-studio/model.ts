import type { AtbReactionDocument } from '../../types/atbReactionV2'
import type {
  TeachingBoardAction,
  TeachingBoardBlock,
  TeachingBoardCommand,
  TeachingBoardEffect,
  TeachingBoardProject,
  TeachingBoardText,
} from '../../types/teachingBoard'
import { subtitleAxisEndMs } from './subtitleAxis'

export const TEACHING_BOARD_STUDIO_STORAGE_KEY = 'ditto-teaching-board-studio-project-v1'

export interface TeachingBoardRuntimeState {
  effects: TeachingBoardEffect[]
  activeOrderListItems: Record<string, string | undefined>
}

export const EMPTY_RUNTIME_STATE: TeachingBoardRuntimeState = {
  effects: [],
  activeOrderListItems: {},
}

export const BLOCK_LABELS: Record<string, string> = {
  title: '标题',
  content: '正文',
  quote: '原文引用',
  order_list: '有序列表',
  image: '图片',
  video: '视频',
}

export function uid(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

export function createBlock(type: TeachingBoardBlock['type']): TeachingBoardBlock {
  switch (type) {
    case 'title':
      return { id: uid('title'), type, variant: 'normal', text: [{ text: 'New Title' }] }
    case 'content':
      return { id: uid('content'), type, variant: 'normal', text: [{ text: 'Add supporting copy here.' }] }
    case 'quote':
      return {
        id: uid('quote'),
        type,
        variant: 'normal',
        paragraphs: [[{ text: 'Add the original sentence here.' }]],
      }
    case 'order_list':
      return {
        id: uid('list'),
        type,
        variant: 'normal',
        items: [
          { id: uid('item'), title: [{ text: 'ITEM' }], description: [{ text: 'Add a prompt.' }] },
        ],
      }
    case 'image':
      return { id: uid('image'), type, url: '', alt: '', caption: [] }
    case 'video':
      return { id: uid('video'), type, url: '', controls: true, autoplay: false, caption: [] }
    default:
      return { id: uid('extension'), type }
  }
}

export function createSampleProject(): TeachingBoardProject {
  return {
    schema: 'ditto.teaching-board-project.v1',
    name: 'Jessie · Expressions',
    document: {
      schema: 'ditto.teaching-board.v1',
      board_id: 'jessie-expressions',
      broadcast_channel: 'lesson/jessie/expressions',
      blocks: [
        {
          id: 'expressions-title',
          type: 'title',
          variant: 'capsule',
          text: [{ text: 'Expressions', anchor_id: 'title-expressions' }],
        },
        {
          id: 'expressions-lead',
          type: 'content',
          text: [{ text: 'Simple expressions make her\nbackground clear' }],
        },
        {
          id: 'jessie-quote',
          type: 'quote',
          paragraphs: [
            [{ text: "Hi, I’m " }, { text: 'Jessie Chen', anchor_id: 'name' }, { text: '.' }],
            [
              { text: 'I ' },
              { text: 'graduated from', anchor_id: 'graduated-from' },
              { text: ' City University.' },
            ],
            [
              { text: 'My major is', anchor_id: 'major-pattern' },
              { text: ' marketing', anchor_id: 'marketing' },
              { text: '.' },
            ],
            [
              { text: 'I’m ' },
              { text: 'good at ', anchor_id: 'good-at' },
              { text: 'numbers', anchor_id: 'numbers' },
              { text: '.' },
            ],
            [
              { text: 'I’m really ' },
              { text: 'interested in ', anchor_id: 'interested-in' },
              { text: 'market research', anchor_id: 'market-research' },
              { text: '.' },
            ],
          ],
        },
        {
          id: 'expression-list',
          type: 'order_list',
          variant: 'simple',
          items: [
            {
              id: 'pattern-good-at',
              title: [{ text: 'BE GOOD AT', anchor_id: 'list-good-at-title' }],
              description: [{ text: 'be good at + noun/-ing' }],
            },
            {
              id: 'pattern-interested-in',
              title: [{ text: 'BE INTERESTED IN', anchor_id: 'list-interested-title' }],
              description: [{ text: 'be interested in + noun/-ing' }],
            },
          ],
        },
      ],
    },
    actions: [
      {
        id: 'action-emphasize-good-at',
        name: '强调 good at',
        at_ms: 1200,
        command: {
          type: 'apply_effect',
          effect: {
            effect_id: 'emphasize-good-at',
            type: 'text_emphasis',
            tone: 'primary',
            target: { anchor_id: 'good-at' },
          },
        },
      },
      {
        id: 'action-underline-range',
        name: '连线 good at → numbers',
        at_ms: 2600,
        command: {
          type: 'apply_effect',
          effect: {
            effect_id: 'underline-good-at-numbers',
            type: 'underline',
            tone: 'annotation',
            target: {
              anchor_range: { start_anchor_id: 'good-at', end_anchor_id: 'numbers' },
            },
          },
        },
      },
      {
        id: 'action-label-marketing',
        name: '批注 marketing',
        at_ms: 3900,
        command: {
          type: 'apply_effect',
          effect: {
            effect_id: 'label-marketing',
            type: 'label',
            tone: 'annotation',
            text: '市场营销',
            target: { anchor_id: 'marketing' },
          },
        },
      },
      {
        id: 'action-active-pattern',
        name: '激活句型卡片',
        at_ms: 5200,
        command: {
          type: 'set_order_list_active_item',
          block_id: 'expression-list',
          item_id: 'pattern-good-at',
        },
      },
    ],
  }
}

export function collectAnchors(project: TeachingBoardProject): Array<{ id: string; text: string; location: string }> {
  const anchors: Array<{ id: string; text: string; location: string }> = []
  const add = (text: TeachingBoardText | undefined, location: string) => {
    for (const segment of text ?? []) {
      if (segment.anchor_id) anchors.push({ id: segment.anchor_id, text: segment.text, location })
    }
  }

  for (const block of project.document.blocks) {
    if (block.type === 'title' || block.type === 'content') add(block.text, block.id)
    if (block.type === 'quote') {
      block.paragraphs.forEach((paragraph, index) => add(paragraph, `${block.id} · P${index + 1}`))
    }
    if (block.type === 'order_list') {
      block.items.forEach((item) => {
        add(item.title, `${block.id} · ${item.id} title`)
        add(item.description, `${block.id} · ${item.id} description`)
      })
    }
    if (block.type === 'image' || block.type === 'video') add(block.caption, `${block.id} · caption`)
  }
  return anchors
}

export function reduceRuntime(
  state: TeachingBoardRuntimeState,
  command: TeachingBoardCommand,
): TeachingBoardRuntimeState {
  if (command.type === 'apply_effect') {
    return {
      ...state,
      effects: [...state.effects.filter((item) => item.effect_id !== command.effect.effect_id), command.effect],
    }
  }
  if (command.type === 'remove_effect') {
    return { ...state, effects: state.effects.filter((item) => item.effect_id !== command.effect_id) }
  }
  if (command.type === 'clear_effects') return EMPTY_RUNTIME_STATE
  return {
    ...state,
    activeOrderListItems: {
      ...state.activeOrderListItems,
      [command.block_id]: command.item_id,
    },
  }
}

export function runtimeAt(project: TeachingBoardProject, timeMs: number): TeachingBoardRuntimeState {
  return [...project.actions]
    .filter((action) => action.at_ms <= timeMs)
    .sort((a, b) => a.at_ms - b.at_ms)
    .reduce((state, action) => reduceRuntime(state, action.command), EMPTY_RUNTIME_STATE)
}

export function projectDuration(project: TeachingBoardProject): number {
  const lastAction = Math.max(0, ...project.actions.map((action) => action.at_ms))
  const narrationEnd = Math.max(
    project.narration?.duration_ms ?? 0,
    subtitleAxisEndMs(project.narration?.subtitle_axis),
  )
  return Math.max(6000, Math.ceil(Math.max(lastAction + 1000, narrationEnd) / 1000) * 1000)
}

export function makeMobilePreviewDocument(project: TeachingBoardProject): AtbReactionDocument {
  return {
    version: '0.0.5',
    lesson_title: project.name,
    lesson_section: 'TeachingBoard Studio',
    default_subtitle_mode: 'auto',
    src: [],
    activities: [
      {
        id: 'teaching-board-studio-preview',
        type: 'lecture_with_practice',
        layout: 'react_teaching_with_practice',
        nodes: [
          {
            id: 'teaching-board-node',
            components: [{ type: 'teaching_board', document: project.document }],
          },
        ],
      },
    ],
  }
}

export function actionLabel(action: TeachingBoardAction): string {
  if (action.command.type === 'apply_effect') return action.command.effect.type
  if (action.command.type === 'set_order_list_active_item') return 'list active'
  return action.command.type.replaceAll('_', ' ')
}
