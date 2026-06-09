import type {
  AtbActivity,
  AtbActivityType,
  AtbReactionDocument,
  AtbSrcAsset,
  LectureWithPracticeActivity,
  SceneComponent,
  SceneComponentType,
  SceneNode,
  SubmergeSequenceActivity,
  VideoSubtitleTrack,
} from './atbReactionV2'
import { isLectureWithPracticeActivity, isSubmergeSequenceActivity } from './atbReactionV2'

export const DRAFT_STORAGE_KEY = 'creator-lesson-json-design-v2-draft'

export const COMPONENT_TYPES = [
  'background_image',
  'teacher_avatar',
  'speech',
  'button',
  'knowledge_card',
  'whiteboard',
  'video_play',
] as const satisfies readonly SceneComponentType[]

export type EditorStep = 0 | 1 | 2

export type SelectionPath =
  | { kind: 'lesson' }
  | { kind: 'src'; index: number }
  | { kind: 'activity'; activityIndex: number }
  | { kind: 'node'; activityIndex: number; nodeIndex: number }
  | { kind: 'component'; activityIndex: number; nodeIndex: number; componentIndex: number }

export function createEmptyDocument(): AtbReactionDocument {
  return {
    version: '0.0.2',
    lesson_title: '',
    lesson_section: '',
    default_subtitle_mode: 'auto',
    src: [],
    activities: [],
  }
}

export function newSrcId(): string {
  return crypto.randomUUID()
}

export function nextActivityId(activities: AtbActivity[]): number {
  const nums = activities
    .map((a) => (typeof a.id === 'number' ? a.id : parseInt(String(a.id), 10)))
    .filter((n) => !Number.isNaN(n))
  return (nums.length ? Math.max(...nums) : 0) + 1
}

export function nextNodeId(nodes: SceneNode[]): number {
  const nums = nodes
    .map((n) => (typeof n.id === 'number' ? n.id : parseInt(String(n.id), 10)))
    .filter((n) => !Number.isNaN(n))
  return (nums.length ? Math.max(...nums) : 0) + 1
}

export function suggestEndSignal(activityId: number | string): string {
  return `end_signal_activity_${activityId}_click`
}

export function defaultTeacherAvatarSourceId(src: AtbSrcAsset[]): string {
  const img = src.find((s) => s.type === 'image')
  return img?.id ?? ''
}

export function createDefaultComponent(type: SceneComponentType, src: AtbSrcAsset[]): SceneComponent {
  switch (type) {
    case 'background_image':
      return { type: 'background_image', description: '', img_url: '' }
    case 'teacher_avatar':
      return { type: 'teacher_avatar', source_id: defaultTeacherAvatarSourceId(src) }
    case 'speech':
      return { type: 'speech', subtitles: [], audio: '', audio_duration: 0 }
    case 'button':
      return { type: 'button', text: '', click_signal: '' }
    case 'knowledge_card':
      return { type: 'knowledge_card', tag: '', title: '', content: '', collocations: [] }
    case 'whiteboard':
      return { type: 'whiteboard', img_url: '', img_width: 0, img_height: 0 }
    case 'video_play':
      return { type: 'video_play', start_ms: 0, end_ms: 0, playback_rate: 1, autoplay: true }
    default: {
      const _e: never = type
      return _e
    }
  }
}

export function createDefaultNode(activityType: AtbActivityType, src: AtbSrcAsset[], nodeId: number): SceneNode {
  if (activityType === 'submerge_sequence') {
    return {
      id: nodeId,
      components: [
        createDefaultComponent('background_image', src),
        createDefaultComponent('teacher_avatar', src),
        createDefaultComponent('speech', src),
      ],
    }
  }
  return {
    id: nodeId,
    components: [
      createDefaultComponent('teacher_avatar', src),
      createDefaultComponent('speech', src),
    ],
  }
}

export function createSubmergeActivity(id: number, src: AtbSrcAsset[]): SubmergeSequenceActivity {
  const endSignal = suggestEndSignal(id)
  return {
    id,
    type: 'submerge_sequence',
    common_layout: 'single_image_text',
    description: '',
    end_signal: endSignal,
    nodes: [createDefaultNode('submerge_sequence', src, 1)],
  }
}

export function createLectureActivity(id: number, src: AtbSrcAsset[]): LectureWithPracticeActivity {
  const video = src.find((s) => s.type === 'video')
  return {
    id,
    type: 'lecture_with_practice',
    layout: 'react_teaching_with_practice',
    description: '',
    video_source_id: video?.id ?? '',
    nodes: [createDefaultNode('lecture_with_practice', src, 1)],
  }
}

export function createActivity(type: AtbActivityType, id: number, src: AtbSrcAsset[]): AtbActivity {
  return type === 'submerge_sequence'
    ? createSubmergeActivity(id, src)
    : createLectureActivity(id, src)
}

function migrateLegacyVideoSubtitle(doc: AtbReactionDocument): AtbReactionDocument {
  const legacy = (doc as AtbReactionDocument & { video_subtitle?: VideoSubtitleTrack }).video_subtitle
  if (!legacy?.segments?.length) {
    const { video_subtitle: _removed, ...rest } = doc as AtbReactionDocument & {
      video_subtitle?: VideoSubtitleTrack
    }
    return rest
  }

  const videoIndex = doc.src.findIndex((s) => s.type === 'video')
  const src =
    videoIndex >= 0
      ? doc.src.map((s, i) =>
          i === videoIndex && !s.subtitles?.segments?.length
            ? { ...s, subtitles: legacy }
            : s,
        )
      : doc.src

  const { video_subtitle: _removed, ...rest } = { ...doc, src } as AtbReactionDocument & {
    video_subtitle?: VideoSubtitleTrack
  }
  return rest
}

export function parseDocumentImport(text: string): AtbReactionDocument {
  const parsed = JSON.parse(text) as unknown
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('JSON 须为对象')
  }
  const raw = parsed as AtbReactionDocument
  if (!raw.version || typeof raw.version !== 'string') {
    throw new Error('缺少 version 字段')
  }
  if (!Array.isArray(raw.src)) {
    throw new Error('缺少 src 数组')
  }
  if (!Array.isArray(raw.activities)) {
    throw new Error('缺少 activities 数组')
  }
  return migrateLegacyVideoSubtitle(raw)
}

export function stringifyDocument(doc: AtbReactionDocument): string {
  return JSON.stringify(doc, null, 2)
}

export function validateDocument(doc: AtbReactionDocument): string[] {
  const errors: string[] = []
  if (!doc.version?.trim()) errors.push('version 不能为空')
  if (!doc.src.length) errors.push('src 至少包含 1 项资源')
  if (!doc.activities.length) errors.push('activities 至少包含 1 项活动')

  const srcIds = new Set(doc.src.map((s) => s.id))
  for (const [i, asset] of doc.src.entries()) {
    if (!asset.id?.trim()) errors.push(`src[${i}].id 不能为空`)
    if (!asset.url?.trim()) errors.push(`src[${i}].url 不能为空`)
    if (!asset.type) errors.push(`src[${i}].type 不能为空`)
  }

  for (const [ai, activity] of doc.activities.entries()) {
    if (!activity.id) errors.push(`activities[${ai}].id 不能为空`)
    if (!activity.nodes?.length) errors.push(`activities[${ai}] 至少包含 1 个 node`)

    if (isSubmergeSequenceActivity(activity)) {
      if (!activity.end_signal?.trim()) errors.push(`activities[${ai}].end_signal 不能为空`)
      if (!activity.common_layout) errors.push(`activities[${ai}].common_layout 不能为空`)
      const hasButton = activity.nodes.some((n) =>
        n.components.some((c) => c.type === 'button' && c.click_signal === activity.end_signal),
      )
      if (!hasButton) {
        errors.push(`activities[${ai}] 需有 button 的 click_signal 与 end_signal 一致`)
      }
    }

    if (isLectureWithPracticeActivity(activity)) {
      if (!activity.video_source_id?.trim()) {
        errors.push(`activities[${ai}].video_source_id 不能为空`)
      } else if (!srcIds.has(activity.video_source_id)) {
        errors.push(`activities[${ai}].video_source_id 未在 src 中找到`)
      }
    }

    for (const [ni, node] of activity.nodes.entries()) {
      if (!node.components?.length) {
        errors.push(`activities[${ai}].nodes[${ni}] 至少包含 1 个 component`)
      }
      for (const [ci, comp] of node.components.entries()) {
        if (comp.type === 'teacher_avatar' && comp.source_id && !srcIds.has(comp.source_id)) {
          errors.push(`activities[${ai}].nodes[${ni}].components[${ci}] source_id 未在 src 中找到`)
        }
        if (comp.type === 'background_image' && !comp.img_url?.trim()) {
          errors.push(`activities[${ai}].nodes[${ni}] background_image 缺少 img_url`)
        }
        if (comp.type === 'speech') {
          if (!comp.audio?.trim()) errors.push(`activities[${ai}].nodes[${ni}] speech 缺少 audio`)
          if (!comp.subtitles?.length) errors.push(`activities[${ai}].nodes[${ni}] speech 缺少 subtitles`)
        }
      }
    }
  }

  return errors
}

export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr
  const next = [...arr]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export function selectionLabel(path: SelectionPath, doc: AtbReactionDocument): string {
  switch (path.kind) {
    case 'lesson':
      return doc.lesson_title?.trim() || '课节信息'
    case 'src': {
      const s = doc.src[path.index]
      return s ? `src: ${s.description || s.id.slice(0, 8)}` : 'src'
    }
    case 'activity': {
      const a = doc.activities[path.activityIndex]
      return a ? `Activity ${a.id}: ${a.type}` : 'Activity'
    }
    case 'node': {
      const n = doc.activities[path.activityIndex]?.nodes[path.nodeIndex]
      return n ? `Node ${n.id}` : 'Node'
    }
    case 'component': {
      const c =
        doc.activities[path.activityIndex]?.nodes[path.nodeIndex]?.components[path.componentIndex]
      return c ? `Component: ${c.type}` : 'Component'
    }
    default:
      return ''
  }
}
