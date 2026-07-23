import type {
  AtbActivity,
  SceneComponent,
  SceneComponentType,
  SceneNode,
} from '../../../types/atbReactionV2'

/** 组件类型 → 教研可读的中文名 */
export const COMPONENT_LABELS: Record<SceneComponentType, string> = {
  background_image: '背景图',
  teacher_avatar: '老师头像',
  speech: '台词语音',
  button: '按钮',
  material_follow_reading_anchor: '自学课跟读锚点',
  knowledge_card: '知识卡片',
  whiteboard: '白板图',
  video_play: '视频播放',
  narrative_video: '讲解视频',
  scenario_video: '场景视频',
  foreigner_prompt: '老外提问',
  eva_coach: 'Eva 教练',
  hint_board: '提示板',
  countdown: '倒计时',
  kol_avatar: 'KOL 头像',
  play_video_brief: '播放说明',
  follow_reading: '跟读练习',
  single_choice: '选择题',
  voice_qa_simple: '语音问答',
  guided_speaking: '引导口语',
  oral_output: '口语输出',
}

export function componentLabel(type: SceneComponentType): string {
  return COMPONENT_LABELS[type] ?? type
}

export interface NodeKindInfo {
  key:
    | 'playVideo'
    | 'followReading'
    | 'singleChoice'
    | 'voiceQa'
    | 'guidedSpeaking'
    | 'oralOutput'
    | 'narrative'
    | 'scenarioCoach'
    | 'lecture'
  label: string
  /** antd Tag 预设色 */
  color: string
}

const NODE_KINDS: Record<NodeKindInfo['key'], NodeKindInfo> = {
  playVideo: { key: 'playVideo', label: '看视频', color: 'geekblue' },
  followReading: { key: 'followReading', label: '跟读', color: 'green' },
  singleChoice: { key: 'singleChoice', label: '选择题', color: 'gold' },
  voiceQa: { key: 'voiceQa', label: '语音问答', color: 'purple' },
  guidedSpeaking: { key: 'guidedSpeaking', label: '引导口语', color: 'magenta' },
  oralOutput: { key: 'oralOutput', label: '口语输出', color: 'orange' },
  narrative: { key: 'narrative', label: '讲解视频', color: 'cyan' },
  scenarioCoach: { key: 'scenarioCoach', label: '情景对话', color: 'volcano' },
  lecture: { key: 'lecture', label: '讲解', color: 'blue' },
}

function hasComponent(node: SceneNode, type: SceneComponentType): boolean {
  return node.components.some((c) => c.type === type)
}

/** 按节点承载的互动类型归类，供大纲树与节点编辑器展示 */
export function getNodeKind(node: SceneNode): NodeKindInfo {
  if (node.node_type === 'scenario_coach' || hasComponent(node, 'scenario_video')) {
    return NODE_KINDS.scenarioCoach
  }
  if (node.node_type === 'narrative' || hasComponent(node, 'narrative_video')) {
    return NODE_KINDS.narrative
  }
  if (hasComponent(node, 'video_play')) return NODE_KINDS.playVideo
  if (hasComponent(node, 'follow_reading')) return NODE_KINDS.followReading
  if (hasComponent(node, 'single_choice')) return NODE_KINDS.singleChoice
  if (hasComponent(node, 'voice_qa_simple')) return NODE_KINDS.voiceQa
  if (hasComponent(node, 'guided_speaking')) return NODE_KINDS.guidedSpeaking
  if (hasComponent(node, 'oral_output')) return NODE_KINDS.oralOutput
  return NODE_KINDS.lecture
}

function firstNonEmpty(...values: Array<string | undefined>): string {
  for (const v of values) {
    const t = v?.trim()
    if (t) return t
  }
  return ''
}

function componentSummary(comp: SceneComponent): string {
  switch (comp.type) {
    case 'single_choice':
      return firstNonEmpty(comp.title, comp.options?.[0])
    case 'follow_reading':
      return firstNonEmpty(comp.text_en)
    case 'voice_qa_simple':
      return firstNonEmpty(comp.question_en, comp.question_zh)
    case 'guided_speaking':
      return firstNonEmpty(comp.task_description, comp.teaching_objective)
    case 'oral_output':
      return firstNonEmpty(comp.homework_title_markdown, comp.requirements_markdown)
    case 'foreigner_prompt':
      return firstNonEmpty(comp.foreigner_line_en)
    case 'speech':
      return firstNonEmpty(comp.source_text, comp.subtitles?.[0]?.text)
    case 'narrative_video':
      return firstNonEmpty(comp.subtitles?.[0]?.text)
    case 'scenario_video':
      return firstNonEmpty(comp.prompt_text, comp.subtitles?.[0]?.text)
    case 'play_video_brief':
      return firstNonEmpty(comp.description)
    case 'knowledge_card':
      return firstNonEmpty(comp.title)
    case 'button':
      return comp.text ? `[按钮] ${comp.text}` : ''
    default:
      return ''
  }
}

/** 摘要优先级：互动内容 > 台词 > 其它文案 */
const SUMMARY_PRIORITY: SceneComponentType[] = [
  'single_choice',
  'follow_reading',
  'voice_qa_simple',
  'guided_speaking',
  'oral_output',
  'foreigner_prompt',
  'speech',
  'narrative_video',
  'scenario_video',
  'play_video_brief',
  'knowledge_card',
  'button',
]

export function getNodeSummary(node: SceneNode, maxLength = 40): string {
  for (const type of SUMMARY_PRIORITY) {
    const comp = node.components.find((c) => c.type === type)
    if (!comp) continue
    const text = componentSummary(comp)
    if (text) {
      return text.length > maxLength ? `${text.slice(0, maxLength)}…` : text
    }
  }
  return node.components.map((c) => componentLabel(c.type)).join(' + ') || '（空节点）'
}

export const ACTIVITY_TYPE_LABELS: Record<AtbActivity['type'], string> = {
  submerge_sequence: '沉浸式序列',
  lecture_with_practice: '讲练结合',
  scenario_coach: '情景教练',
  homework: '作业',
}

export function activityLabel(activity: AtbActivity): string {
  const typeLabel = ACTIVITY_TYPE_LABELS[activity.type] ?? activity.type
  const desc = activity.description?.trim()
  return desc ? `A${activity.id} ${typeLabel} · ${desc}` : `A${activity.id} ${typeLabel}`
}
