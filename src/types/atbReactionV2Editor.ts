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
import {
  DEFAULT_COUNTDOWN_SEC,
  DEFAULT_FOLLOW_READING_INSTRUCTION_HINT,
  DEFAULT_FOLLOW_READING_INSTRUCTION_PRIMARY,
  DEFAULT_PLAY_VIDEO_STATUS_TITLE,
  DEFAULT_POSITIVE_FEEDBACK_AUDIOS,
  DEFAULT_VOICE_QA_INSTRUCTION_PRIMARY,
  DEFAULT_VOICE_QA_INSTRUCTION_HINT,
  DEFAULT_VOICE_QA_MAX_ATTEMPTS,
  DEFAULT_GUIDED_SPEAKING_INSTRUCTION_PRIMARY,
  DEFAULT_GUIDED_SPEAKING_INSTRUCTION_HINT,
  DEFAULT_GUIDED_SPEAKING_MAX_ROUNDS,
  isLectureWithPracticeActivity,
  isScenarioCoachActivity,
  isSubmergeSequenceActivity,
} from './atbReactionV2'

export const DRAFT_STORAGE_KEY = 'creator-lesson-json-design-v2-draft'

export const COMPONENT_TYPES = [
  'background_image',
  'teacher_avatar',
  'speech',
  'button',
  'material_follow_reading_anchor',
  'knowledge_card',
  'whiteboard',
  'video_play',
  'narrative_video',
  'scenario_video',
  'foreigner_prompt',
  'eva_coach',
  'hint_board',
  'countdown',
  'kol_avatar',
  'play_video_brief',
  'follow_reading',
  'single_choice',
  'voice_qa_simple',
  'guided_speaking',
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

export function newNodeId(): string {
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

export function defaultVideoSourceId(src: AtbSrcAsset[]): string {
  const video = src.find((s) => s.type === 'video')
  return video?.id ?? ''
}

export function defaultVisualSourceId(src: AtbSrcAsset[]): string {
  const visual = src.find((s) => s.type === 'video') ?? src.find((s) => s.type === 'image')
  return visual?.id ?? ''
}

export function defaultAudioSourceId(src: AtbSrcAsset[]): string {
  const audio = src.find((s) => s.type === 'audio')
  return audio?.id ?? ''
}

export function defaultKolAvatarSourceId(src: AtbSrcAsset[]): string {
  const kol = src.find((s) => s.type === 'image' && /kol/i.test(s.description ?? ''))
  if (kol) return kol.id
  const images = src.filter((s) => s.type === 'image')
  return images.length > 1 ? images[1]!.id : images[0]?.id ?? ''
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
    case 'material_follow_reading_anchor':
      return { type: 'material_follow_reading_anchor', id: 0 }
    case 'knowledge_card':
      return { type: 'knowledge_card', tag: '', title: '', content: '', collocations: [] }
    case 'whiteboard':
      return { type: 'whiteboard', img_url: '', img_width: 0, img_height: 0 }
    case 'video_play':
      return {
        type: 'video_play',
        source_id: defaultVideoSourceId(src),
        start_ms: 0,
        end_ms: 0,
        playback_rate: 1,
        autoplay: true,
      }
    case 'narrative_video':
      return {
        type: 'narrative_video',
        source_id: defaultVideoSourceId(src),
        start_ms: 0,
        end_ms: 0,
        subtitles: [{ start_ms: 0, end_ms: 3000, text: '' }],
        autoplay: true,
      }
    case 'scenario_video':
      return {
        type: 'scenario_video',
        visual_source_id: defaultVisualSourceId(src),
        audio_source_id: defaultAudioSourceId(src),
        start_ms: 0,
        end_ms: 0,
        pause_at_ms: -1,
        subtitles: [{ start_ms: 0, end_ms: 3000, text: '' }],
        prompt_text: '',
        confused_prompt_text: "Sorry? I didn't quite get that.",
        autoplay: true,
      }
    case 'foreigner_prompt':
      return {
        type: 'foreigner_prompt',
        foreigner_line_en: 'Can you do me a favor?',
        foreigner_line_zh: '你能帮我个忙吗？',
        teaching_objective: '用英语回应对方刚才说的话',
        acceptable_answers: ['Sure.', 'Of course.', 'What do you need?'],
        model_answer_en: 'Sure. What do you need?',
        model_answer_zh: '当然，你需要什么？',
        rubric_lines: ['老外能听懂即可，语法小错误可接受'],
        asr_language: 'en-US',
        max_attempts: DEFAULT_VOICE_QA_MAX_ATTEMPTS,
        confused_tts_voice_id: 'English_magnetic_voiced_man',
      }
    case 'eva_coach':
      return {
        type: 'eva_coach',
        avatar_source_id: defaultTeacherAvatarSourceId(src),
        ask_intro_text: '没关系，我先给你一句可以照着说的英文。',
        retry_coach_text: '你其实可以这么说：',
        hint_board: {
          title: '提示板',
          lines: ['This is Shu embroidery.'],
          model_sentence: 'This is Shu embroidery.',
        },
        initially_open: true,
        tts_voice_id: 'ZxueliLLS',
      }
    case 'hint_board':
      return {
        type: 'hint_board',
        title: '提示板',
        lines: [''],
        initially_open: true,
      }
    case 'countdown':
      return { type: 'countdown', duration_sec: DEFAULT_COUNTDOWN_SEC }
    case 'kol_avatar':
      return { type: 'kol_avatar', source_id: defaultKolAvatarSourceId(src) }
    case 'play_video_brief':
      return {
        type: 'play_video_brief',
        status_title: DEFAULT_PLAY_VIDEO_STATUS_TITLE,
        description: '正在播放视频，请仔细听哦～',
      }
    case 'follow_reading':
      return {
        type: 'follow_reading',
        instruction_primary: DEFAULT_FOLLOW_READING_INSTRUCTION_PRIMARY,
        instruction_hint: DEFAULT_FOLLOW_READING_INSTRUCTION_HINT,
        text_en: '',
        text_zh: '',
        language: 'en_us',
        reference_audio: '',
        positive_feedback_audios: DEFAULT_POSITIVE_FEEDBACK_AUDIOS.map((item) => ({ ...item })),
      }
    case 'single_choice':
      return {
        type: 'single_choice',
        options: ['', '', ''],
        correct_option_index: 0,
        correct_feedback_audio: '',
        correct_feedback_subtitles: [{ start_ms: 0, end_ms: 2000, text: '' }],
        incorrect_feedback_audio: '',
        incorrect_feedback_subtitles: [{ start_ms: 0, end_ms: 2000, text: '' }],
      }
    case 'voice_qa_simple':
      return {
        type: 'voice_qa_simple',
        instruction_primary: DEFAULT_VOICE_QA_INSTRUCTION_PRIMARY,
        instruction_hint: DEFAULT_VOICE_QA_INSTRUCTION_HINT,
        hint_markdown: '',
        question_en: '',
        question_zh: '',
        teaching_objective: '',
        rubric_lines: [],
        standard_answer: '',
        standard_answer_zh: '',
        max_attempts: DEFAULT_VOICE_QA_MAX_ATTEMPTS,
        asr_language: 'en-US',
        tts_voice_id: 'ZxueliLLS',
      }
    case 'guided_speaking':
      return {
        type: 'guided_speaking',
        instruction_primary: DEFAULT_GUIDED_SPEAKING_INSTRUCTION_PRIMARY,
        instruction_hint: DEFAULT_GUIDED_SPEAKING_INSTRUCTION_HINT,
        task_description: '',
        expression_goals: [''],
        initial_hint_markdown: '',
        teaching_objective: '',
        max_rounds: DEFAULT_GUIDED_SPEAKING_MAX_ROUNDS,
        asr_language: 'en-US',
        tts_voice_id: 'ZxueliLLS',
      }
    default: {
      const _e: never = type
      return _e
    }
  }
}

export function createDefaultNode(activityType: AtbActivityType, src: AtbSrcAsset[], nodeId: number | string): SceneNode {
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
  if (activityType === 'scenario_coach') {
    return createScenarioCoachNode(src, nodeId)
  }
  return {
    id: nodeId,
    components: [
      createDefaultComponent('teacher_avatar', src),
      createDefaultComponent('speech', src),
    ],
  }
}

export function isPlayVideoNode(node: SceneNode): boolean {
  return node.components.some((c) => c.type === 'video_play')
}

export function isFollowReadingNode(node: SceneNode): boolean {
  return node.components.some((c) => c.type === 'follow_reading')
}

export function isSingleChoiceNode(node: SceneNode): boolean {
  return node.components.some((c) => c.type === 'single_choice')
}

export function isVoiceQaSimpleNode(node: SceneNode): boolean {
  return node.components.some((c) => c.type === 'voice_qa_simple')
}

export function isGuidedSpeakingNode(node: SceneNode): boolean {
  return node.components.some((c) => c.type === 'guided_speaking')
}

export function isNarrativeNode(node: SceneNode): boolean {
  return node.node_type === 'narrative' || node.components.some((c) => c.type === 'narrative_video')
}

export function isScenarioCoachNode(node: SceneNode): boolean {
  return node.node_type === 'scenario_coach' || node.components.some((c) => c.type === 'scenario_video')
}

export function createFollowReadingNode(src: AtbSrcAsset[], nodeId: number | string): SceneNode {
  return {
    id: nodeId,
    components: [
      createDefaultComponent('teacher_avatar', src),
      createDefaultComponent('follow_reading', src),
    ],
  }
}

export function createSingleChoiceNode(src: AtbSrcAsset[], nodeId: number | string): SceneNode {
  return {
    id: nodeId,
    components: [
      createDefaultComponent('teacher_avatar', src),
      createDefaultComponent('speech', src),
      createDefaultComponent('single_choice', src),
    ],
  }
}

export function createVoiceQaSimpleNode(src: AtbSrcAsset[], nodeId: number | string): SceneNode {
  return {
    id: nodeId,
    components: [
      createDefaultComponent('teacher_avatar', src),
      createDefaultComponent('speech', src),
      createDefaultComponent('voice_qa_simple', src),
    ],
  }
}

export function createGuidedSpeakingNode(src: AtbSrcAsset[], nodeId: number | string): SceneNode {
  return {
    id: nodeId,
    components: [
      createDefaultComponent('teacher_avatar', src),
      createDefaultComponent('speech', src),
      createDefaultComponent('guided_speaking', src),
    ],
  }
}

export function createPlayVideoNode(src: AtbSrcAsset[], nodeId: number | string): SceneNode {
  return {
    id: nodeId,
    components: [
      createDefaultComponent('video_play', src),
      createDefaultComponent('kol_avatar', src),
      createDefaultComponent('play_video_brief', src),
      createDefaultComponent('countdown', src),
      createDefaultComponent('whiteboard', src),
    ],
  }
}

export function createNarrativeNode(src: AtbSrcAsset[], nodeId: number | string): SceneNode {
  return {
    id: nodeId,
    node_type: 'narrative',
    components: [
      createDefaultComponent('narrative_video', src),
      createDefaultComponent('speech', src),
      createDefaultComponent('whiteboard', src),
    ],
  }
}

export function createScenarioCoachNode(src: AtbSrcAsset[], nodeId: number | string): SceneNode {
  return {
    id: nodeId,
    node_type: 'scenario_coach',
    components: [
      createDefaultComponent('scenario_video', src),
      createDefaultComponent('foreigner_prompt', src),
      createDefaultComponent('eva_coach', src),
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
    nodes: [createDefaultNode('submerge_sequence', src, newNodeId())],
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
    nodes: [createDefaultNode('lecture_with_practice', src, newNodeId())],
  }
}

export function createScenarioCoachActivity(id: number, src: AtbSrcAsset[]): AtbActivity {
  return {
    id,
    type: 'scenario_coach',
    layout: 'immersive_scenario_coach',
    description: '',
    coach_name: 'Eva',
    progress_label: '对话进度',
    nodes: [
      createNarrativeNode(src, newNodeId()),
      createScenarioCoachNode(src, newNodeId()),
    ],
  }
}

export function createActivity(type: AtbActivityType, id: number, src: AtbSrcAsset[]): AtbActivity {
  if (type === 'submerge_sequence') return createSubmergeActivity(id, src)
  if (type === 'scenario_coach') return createScenarioCoachActivity(id, src)
  return createLectureActivity(id, src)
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

    if (isScenarioCoachActivity(activity)) {
      if (activity.layout !== 'immersive_scenario_coach') {
        errors.push(`activities[${ai}].layout 须为 immersive_scenario_coach`)
      }
      if (!activity.coach_name?.trim()) {
        errors.push(`activities[${ai}].coach_name 不能为空`)
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
        if (comp.type === 'kol_avatar') {
          if (!comp.source_id?.trim()) {
            errors.push(`activities[${ai}].nodes[${ni}].components[${ci}] kol_avatar 缺少 source_id`)
          } else if (!srcIds.has(comp.source_id)) {
            errors.push(`activities[${ai}].nodes[${ni}].components[${ci}] kol_avatar source_id 未在 src 中找到`)
          }
        }
        if (comp.type === 'background_image' && !comp.img_url?.trim()) {
          errors.push(`activities[${ai}].nodes[${ni}] background_image 缺少 img_url`)
        }
        if (comp.type === 'speech') {
          if (!comp.audio?.trim()) errors.push(`activities[${ai}].nodes[${ni}] speech 缺少 audio`)
          if (!comp.subtitles?.length) errors.push(`activities[${ai}].nodes[${ni}] speech 缺少 subtitles`)
        }
        if (comp.type === 'video_play') {
          if (!comp.source_id?.trim()) {
            errors.push(`activities[${ai}].nodes[${ni}].components[${ci}] video_play 缺少 source_id`)
          } else if (!srcIds.has(comp.source_id)) {
            errors.push(`activities[${ai}].nodes[${ni}].components[${ci}] video_play source_id 未在 src 中找到`)
          } else {
            const asset = doc.src.find((s) => s.id === comp.source_id)
            if (asset && asset.type !== 'video') {
              errors.push(`activities[${ai}].nodes[${ni}].components[${ci}] video_play source_id 须引用 type=video 的资源`)
            }
          }
          if (comp.start_ms >= comp.end_ms) {
            errors.push(`activities[${ai}].nodes[${ni}].components[${ci}] video_play start_ms 须小于 end_ms`)
          }
        }
        if (comp.type === 'narrative_video') {
          if (!comp.source_id?.trim()) {
            errors.push(`activities[${ai}].nodes[${ni}].components[${ci}] narrative_video 缺少 source_id`)
          } else {
            const asset = doc.src.find((s) => s.id === comp.source_id)
            if (!asset) {
              errors.push(`activities[${ai}].nodes[${ni}].components[${ci}] narrative_video source_id 未在 src 中找到`)
            } else if (asset.type !== 'video') {
              errors.push(`activities[${ai}].nodes[${ni}].components[${ci}] narrative_video source_id 须引用 type=video 的资源`)
            }
          }
          if ((comp.start_ms ?? 0) > 0 && (comp.end_ms ?? 0) > 0 && (comp.start_ms ?? 0) >= (comp.end_ms ?? 0)) {
            errors.push(`activities[${ai}].nodes[${ni}].components[${ci}] narrative_video start_ms 须小于 end_ms`)
          }
        }
        if (comp.type === 'scenario_video') {
          if (!comp.visual_source_id?.trim()) {
            errors.push(`activities[${ai}].nodes[${ni}].components[${ci}] scenario_video 缺少 visual_source_id`)
          } else {
            const visualAsset = doc.src.find((s) => s.id === comp.visual_source_id)
            if (!visualAsset) {
              errors.push(`activities[${ai}].nodes[${ni}].components[${ci}] scenario_video visual_source_id 未在 src 中找到`)
            } else if (visualAsset.type !== 'video' && visualAsset.type !== 'image') {
              errors.push(`activities[${ai}].nodes[${ni}].components[${ci}] scenario_video visual_source_id 须引用 type=video 或 type=image 的资源`)
            }
          }
          if (comp.audio_source_id) {
            const audioAsset = doc.src.find((s) => s.id === comp.audio_source_id)
            if (!audioAsset) {
              errors.push(`activities[${ai}].nodes[${ni}].components[${ci}] scenario_video audio_source_id 未在 src 中找到`)
            } else if (audioAsset.type !== 'audio') {
              errors.push(`activities[${ai}].nodes[${ni}].components[${ci}] scenario_video audio_source_id 须引用 type=audio 的资源`)
            }
          }
          if ((comp.start_ms ?? 0) > 0 && (comp.end_ms ?? 0) > 0 && (comp.start_ms ?? 0) >= (comp.end_ms ?? 0)) {
            errors.push(`activities[${ai}].nodes[${ni}].components[${ci}] scenario_video start_ms 须小于 end_ms`)
          }
        }
        if (comp.type === 'foreigner_prompt') {
          if (!comp.foreigner_line_en?.trim()) {
            errors.push(`activities[${ai}].nodes[${ni}].components[${ci}] foreigner_prompt 缺少 foreigner_line_en`)
          }
          if (!comp.teaching_objective?.trim()) {
            errors.push(`activities[${ai}].nodes[${ni}].components[${ci}] foreigner_prompt 缺少 teaching_objective`)
          }
          if (!comp.model_answer_en?.trim()) {
            errors.push(`activities[${ai}].nodes[${ni}].components[${ci}] foreigner_prompt 缺少 model_answer_en`)
          }
        }
        if (comp.type === 'eva_coach') {
          if (!comp.avatar_source_id?.trim()) {
            errors.push(`activities[${ai}].nodes[${ni}].components[${ci}] eva_coach 缺少 avatar_source_id`)
          } else if (!srcIds.has(comp.avatar_source_id)) {
            errors.push(`activities[${ai}].nodes[${ni}].components[${ci}] eva_coach avatar_source_id 未在 src 中找到`)
          }
          const lines = (comp.hint_board?.lines ?? []).filter((line) => line?.trim())
          if (lines.length < 1) {
            errors.push(`activities[${ai}].nodes[${ni}].components[${ci}] eva_coach.hint_board 至少需要 1 行提示`)
          }
        }
        if (comp.type === 'hint_board') {
          const lines = (comp.lines ?? []).filter((line) => line?.trim())
          if (lines.length < 1) {
            errors.push(`activities[${ai}].nodes[${ni}].components[${ci}] hint_board 至少需要 1 行提示`)
          }
        }
        if (comp.type === 'countdown') {
          const dur = comp.duration_sec ?? DEFAULT_COUNTDOWN_SEC
          if (dur < 0) {
            errors.push(`activities[${ai}].nodes[${ni}].components[${ci}] countdown duration_sec 不能为负数`)
          }
        }
        if (comp.type === 'play_video_brief') {
          if (!comp.description?.trim()) {
            errors.push(`activities[${ai}].nodes[${ni}].components[${ci}] play_video_brief 缺少 description`)
          }
        }
        if (comp.type === 'follow_reading') {
          if (!comp.text_en?.trim()) {
            errors.push(`activities[${ai}].nodes[${ni}].components[${ci}] follow_reading 缺少 text_en`)
          }
          if (!comp.reference_audio?.trim()) {
            errors.push(`activities[${ai}].nodes[${ni}].components[${ci}] follow_reading 缺少 reference_audio`)
          }
        }
        if (comp.type === 'single_choice') {
          const optionCount = comp.options?.length ?? 0
          if (optionCount < 2) {
            errors.push(`activities[${ai}].nodes[${ni}].components[${ci}] single_choice 至少需要 2 个选项`)
          }
          if (
            comp.correct_option_index == null ||
            comp.correct_option_index < 0 ||
            comp.correct_option_index >= optionCount
          ) {
            errors.push(
              `activities[${ai}].nodes[${ni}].components[${ci}] single_choice correct_option_index 超出范围`,
            )
          }
          if (comp.options.some((option) => !option?.trim())) {
            errors.push(`activities[${ai}].nodes[${ni}].components[${ci}] single_choice 选项文案不能为空`)
          }
          if (!comp.correct_feedback_audio?.trim()) {
            errors.push(
              `activities[${ai}].nodes[${ni}].components[${ci}] single_choice 缺少 correct_feedback_audio`,
            )
          }
          if (!comp.incorrect_feedback_audio?.trim()) {
            errors.push(
              `activities[${ai}].nodes[${ni}].components[${ci}] single_choice 缺少 incorrect_feedback_audio`,
            )
          }
          if (!comp.correct_feedback_subtitles?.length) {
            errors.push(
              `activities[${ai}].nodes[${ni}].components[${ci}] single_choice 缺少 correct_feedback_subtitles`,
            )
          }
          if (!comp.incorrect_feedback_subtitles?.length) {
            errors.push(
              `activities[${ai}].nodes[${ni}].components[${ci}] single_choice 缺少 incorrect_feedback_subtitles`,
            )
          }
        }
        if (comp.type === 'voice_qa_simple') {
          if (!comp.hint_markdown?.trim()) {
            errors.push(`activities[${ai}].nodes[${ni}].components[${ci}] voice_qa_simple 缺少 hint_markdown`)
          }
          if (!comp.question_en?.trim()) {
            errors.push(`activities[${ai}].nodes[${ni}].components[${ci}] voice_qa_simple 缺少 question_en`)
          }
          if (!comp.teaching_objective?.trim()) {
            errors.push(`activities[${ai}].nodes[${ni}].components[${ci}] voice_qa_simple 缺少 teaching_objective`)
          }
          if (!comp.standard_answer?.trim()) {
            errors.push(`activities[${ai}].nodes[${ni}].components[${ci}] voice_qa_simple 缺少 standard_answer`)
          }
          const maxAttempts = comp.max_attempts ?? DEFAULT_VOICE_QA_MAX_ATTEMPTS
          if (maxAttempts < 1 || maxAttempts > 10) {
            errors.push(
              `activities[${ai}].nodes[${ni}].components[${ci}] voice_qa_simple max_attempts 须在 1~10 之间`,
            )
          }
        }
        if (comp.type === 'guided_speaking') {
          if (!comp.task_description?.trim()) {
            errors.push(`activities[${ai}].nodes[${ni}].components[${ci}] guided_speaking 缺少 task_description`)
          }
          const goals = (comp.expression_goals ?? []).filter((g) => g?.trim())
          if (goals.length < 1) {
            errors.push(
              `activities[${ai}].nodes[${ni}].components[${ci}] guided_speaking 至少需要 1 条 expression_goals`,
            )
          }
          if (!comp.teaching_objective?.trim()) {
            errors.push(`activities[${ai}].nodes[${ni}].components[${ci}] guided_speaking 缺少 teaching_objective`)
          }
          const maxRounds = comp.max_rounds ?? DEFAULT_GUIDED_SPEAKING_MAX_ROUNDS
          if (maxRounds < 1 || maxRounds > 20) {
            errors.push(
              `activities[${ai}].nodes[${ni}].components[${ci}] guided_speaking max_rounds 须在 1~20 之间`,
            )
          }
        }
      }
      if (isPlayVideoNode(node) && node.components.some((c) => c.type === 'speech')) {
        errors.push(`activities[${ai}].nodes[${ni}] playVideo 节点不应同时包含 speech 组件`)
      }
      if (isFollowReadingNode(node) && node.components.some((c) => c.type === 'speech')) {
        // speech 会先播完再解锁跟读，属于支持的用法，降级为提示
        errors.push(`[提示] activities[${ai}].nodes[${ni}] 节点含 speech + follow_reading，speech 将先播，播完后跟读解锁`)
      }
      if (isSingleChoiceNode(node) && node.components.some((c) => c.type === 'speech')) {
        errors.push(`[提示] activities[${ai}].nodes[${ni}] 节点含 speech + single_choice，speech 将先播，播完后选择题解锁`)
      }
      if (isVoiceQaSimpleNode(node) && node.components.some((c) => c.type === 'speech')) {
        errors.push(`[提示] activities[${ai}].nodes[${ni}] 节点含 speech + voice_qa_simple，speech 将先播，播完后语音问答解锁`)
      }
      if (isGuidedSpeakingNode(node) && node.components.some((c) => c.type === 'speech')) {
        errors.push(`[提示] activities[${ai}].nodes[${ni}] 节点含 speech + guided_speaking，speech 将先播，播完后引导口语解锁`)
      }
      if (isGuidedSpeakingNode(node) && isVoiceQaSimpleNode(node)) {
        errors.push(`[提示] activities[${ai}].nodes[${ni}] 节点同时含 voice_qa_simple 与 guided_speaking，请只保留一种语音互动`)
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
