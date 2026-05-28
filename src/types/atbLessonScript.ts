/** ATB 课程脚本 JSON，与 learner-app mock / script 解析对齐 */

export const ATB_ACT_TYPES = [
  'IntroMusic',
  'CUI-Bubble',
  'ShowImage',
  'CUI-Card-ChoiceSingle',
  'PlayVideo',
  'CUI-FreeTalk-Practice',
  'CUI-FollowReading',
] as const

export interface FollowReadingPositiveFeedbackAudioPayload {
  text_en: string
  audio_url: string
}

export const DEFAULT_POSITIVE_FEEDBACK_AUDIOS: FollowReadingPositiveFeedbackAudioPayload[] = [
  { text_en: 'Great job! Your pronunciation sounds clear and natural.', audio_url: '' },
  { text_en: 'Well done! Keep up the fantastic work.', audio_url: '' },
  { text_en: 'Nice work! You should feel proud of how well you did.', audio_url: '' },
]

export type AtbActType = (typeof ATB_ACT_TYPES)[number]

export interface LessonMetadata {
  title_en: string
  title_zh: string
  description_en: string
  description_zh: string
  cover_url: string
  cover_width: number
  cover_height: number
  tutor_name: string
  student_name: string
  tutor_avatar: string
  student_avatar: string
  video_url: string
}

export interface LessonScriptNode {
  tree_id: number
  parent_tree_id: number
  act_type: AtbActType
  actor: 'Tutor' | 'Student'
  priority: number
  payload: Record<string, unknown>
}

export interface AtbLessonDocument {
  metadata: LessonMetadata
  nodes: LessonScriptNode[]
}

export const DRAFT_STORAGE_KEY = 'creator-lesson-json-design-draft'

export function createDefaultMetadata(): LessonMetadata {
  return {
    title_en: '',
    title_zh: '',
    description_en: '',
    description_zh: '',
    cover_url: '',
    cover_width: 1080,
    cover_height: 1920,
    tutor_name: '',
    student_name: '',
    tutor_avatar: '',
    student_avatar: '',
    video_url: '',
  }
}

export function createEmptyLesson(): AtbLessonDocument {
  return { metadata: createDefaultMetadata(), nodes: [] }
}

export function maxTreeId(nodes: LessonScriptNode[]): number {
  return nodes.reduce((m, n) => Math.max(m, n.tree_id), 0)
}

export function stringifyLesson(doc: AtbLessonDocument): string {
  return JSON.stringify(doc, null, 4)
}

function defaultPayloadForAct(act: AtbActType): Record<string, unknown> {
  switch (act) {
    case 'IntroMusic':
      return { url: '' }
    case 'CUI-Bubble':
      return { text_en: '', text_zh: '', audio_url: '', audio_duration: 0 }
    case 'ShowImage':
      return { image_url: '', image_width: 0, image_height: 0 }
    case 'CUI-Card-ChoiceSingle':
      return {
        options: [
          { text_en: '', text_zh: '', next_tree_id: 0 },
          { text_en: '', text_zh: '', next_tree_id: 0 },
        ],
      }
    case 'PlayVideo':
      return { start_time: 0, end_time: 0 }
    case 'CUI-FreeTalk-Practice':
      return {
        scenario_key: '',
        task_type: 'concept_explain',
        quote_en: '',
        quote_zh: '',
        opening_prompt_en: '',
        opening_prompt_zh: '',
        opening_audio_url: '',
        vocabulary_hints: [
          { term_en: 'chaotic', gloss_zh: '混乱的' },
          { term_en: 'lawful', gloss_zh: '守序的' },
          { term_en: 'represent', gloss_zh: '代表' },
          { phrase_en: 'challenge the traditional rules', gloss_zh: '挑战传统' },
        ],
        context_lines_en: [''],
        max_student_turns: 6,
        max_llm_calls: 10,
        max_extension_rounds: 0,
        tts: {
          enabled: true,
          voice_id: 'ZxueliLLS',
          model: 'speech-2.8-hd',
          speed: 1,
          vol: 1,
          pitch: 0,
          emotion: 'happy',
        },
      }
    case 'CUI-FollowReading':
      return {
        text_en: '',
        text_zh: '',
        language: 'en_us',
        positive_feedback_audios: DEFAULT_POSITIVE_FEEDBACK_AUDIOS.map((item) => ({ ...item })),
      }
    default: {
      const _x: never = act
      return _x
    }
  }
}

export function nextTreeId(nodes: LessonScriptNode[]): number {
  return maxTreeId(nodes) + 1
}

export function suggestParentTreeId(nodes: LessonScriptNode[]): number {
  if (nodes.length === 0) return 0
  return nodes[nodes.length - 1].tree_id
}

export function buildNewNode(
  nodes: LessonScriptNode[],
  act: AtbActType,
  overrides?: Partial<Pick<LessonScriptNode, 'parent_tree_id' | 'actor'>>,
): LessonScriptNode {
  const tid = nextTreeId(nodes)
  const parent = overrides?.parent_tree_id ?? suggestParentTreeId(nodes)
  const actor =
    overrides?.actor ??
    (act === 'CUI-Card-ChoiceSingle' || act === 'CUI-FreeTalk-Practice' || act === 'CUI-FollowReading'
      ? 'Student'
      : 'Tutor')
  return {
    tree_id: tid,
    parent_tree_id: parent,
    act_type: act,
    actor,
    priority: tid,
    payload: defaultPayloadForAct(act),
  }
}

export function renumberPrioritiesByOrder(nodes: LessonScriptNode[]): LessonScriptNode[] {
  return nodes.map((n, i) => ({ ...n, priority: i + 1 }))
}

export interface LessonValidationIssue {
  level: 'warn'
  message: string
}

export function validateLessonDocument(doc: AtbLessonDocument): LessonValidationIssue[] {
  const issues: LessonValidationIssue[] = []
  const { nodes } = doc
  const ids = new Set<number>()
  for (const n of nodes) {
    if (ids.has(n.tree_id)) {
      issues.push({ level: 'warn', message: `重复的 tree_id: ${n.tree_id}` })
    }
    ids.add(n.tree_id)
  }
  const idList = [...ids]
  for (const n of nodes) {
    if (n.parent_tree_id !== 0 && !ids.has(n.parent_tree_id)) {
      issues.push({
        level: 'warn',
        message: `节点 tree_id=${n.tree_id} 的 parent_tree_id=${n.parent_tree_id} 在 nodes 中不存在`,
      })
    }
  }
  for (const n of nodes) {
    if (n.act_type === 'CUI-Card-ChoiceSingle') {
      const opts = Array.isArray(n.payload.options) ? n.payload.options : []
      for (let i = 0; i < opts.length; i++) {
        const o = opts[i] as { next_tree_id?: number }
        const nid = o?.next_tree_id
        if (typeof nid === 'number' && nid !== 0 && !ids.has(nid)) {
          issues.push({
            level: 'warn',
            message: `tree_id=${n.tree_id} 选项 ${i + 1} 的 next_tree_id=${nid} 在 nodes 中不存在`,
          })
        }
      }
    }
  }
  if (idList.length && !ids.has(1)) {
    issues.push({ level: 'warn', message: '没有 tree_id=1 的节点（首节点通常为 1）' })
  }
  for (const n of nodes) {
    if (n.act_type !== 'CUI-FollowReading') continue
    const audios = Array.isArray(n.payload.positive_feedback_audios)
      ? (n.payload.positive_feedback_audios as FollowReadingPositiveFeedbackAudioPayload[])
      : []
    const readyCount = audios.filter((item) => String(item?.audio_url ?? '').trim()).length
    if (readyCount < 3) {
      issues.push({
        level: 'warn',
        message: `tree_id=${n.tree_id} 跟读节点建议配置 3 条肯定反馈语音（当前 ${readyCount} 条）`,
      })
    }
  }
  return issues
}

export function parseLessonImport(raw: string): AtbLessonDocument {
  const data = JSON.parse(raw) as unknown
  if (!data || typeof data !== 'object') throw new Error('根对象无效')
  const obj = data as Record<string, unknown>
  if (!Array.isArray(obj.nodes)) throw new Error('缺少 nodes 数组')
  const metaIn = obj.metadata
  const metadata =
    metaIn && typeof metaIn === 'object'
      ? { ...createDefaultMetadata(), ...(metaIn as Partial<LessonMetadata>) }
      : createDefaultMetadata()
  const nodes = obj.nodes as LessonScriptNode[]
  return { metadata, nodes }
}
