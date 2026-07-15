export interface AtbSrcAsset {
  id: string
  url: string
  type: 'image' | 'video' | 'audio'
  description?: string
  /** 视频字幕轨，仅 type=video 时使用 */
  subtitles?: VideoSubtitleTrack
}

export type SubtitleMode = 'auto' | 'on' | 'off'

export interface SubtitleWord {
  start_ms: number
  end_ms: number
  text: string
}

export interface SubtitleCue {
  start_ms: number
  end_ms: number
  text: string
  translation_zh?: string
  highlights?: string[]
  practical_expression?: { en: string; zh: string }
}

export interface PrepPhrase {
  phrase: string
  translation_zh?: string
  explanation?: string
}

export interface PrepExpression {
  expression: string
  translation_zh?: string
  explanation?: string
}

/** 博主在该句实际使用的口语语种（字幕打轴器标记） */
export type SubtitleSpokenLanguage = 'en' | 'zh'

export interface VideoSubtitleSegment {
  start_ms: number
  end_ms: number
  text: string
  translation_zh?: string
  highlights?: string[]
  /** 备课备注，仅在 Creator 字幕打轴器备课模式下编辑 */
  prep_note?: string
  /** 备课单词（同步到元数据词汇） */
  prep_words?: string[]
  /** 备课词组（同步到元数据短语） */
  prep_phrases?: PrepPhrase[]
  /** 备课句型/表达（同步到元数据重点表达） */
  prep_expressions?: PrepExpression[]
  /** 博主本句口语语种，默认按英文讲处理 */
  spoken_language?: SubtitleSpokenLanguage
  words?: SubtitleWord[]
}

export interface VideoSubtitleTrack {
  segments: VideoSubtitleSegment[]
}

export interface BackgroundImageComponent {
  type: 'background_image'
  description?: string
  img_url: string
}

export interface TeacherAvatarComponent {
  type: 'teacher_avatar'
  source_id: string
}

export interface KolAvatarComponent {
  type: 'kol_avatar'
  /** 引用 src 中 type=image 的 KOL 头像资源 */
  source_id: string
}

export interface SpeechComponent {
  type: 'speech'
  subtitles: SubtitleCue[]
  audio: string
  audio_duration: number
  /**
   * 创作侧留存的 speech 原文（含标点）。打轴返回的 subtitles 文本会丢失标点，
   * 留存原文可保证重新 TTS 时不需要重新标点。学员端不消费该字段。
   */
  source_text?: string
}

export interface ButtonComponent {
  type: 'button'
  text: string
  click_signal: string
}

export interface MaterialFollowReadingAnchorComponent {
  type: 'material_follow_reading_anchor'
  /** 自学课跟读列表中的句子 index，0 表示第一句 */
  id: number | string
}

export interface KnowledgeCardComponent {
  type: 'knowledge_card'
  tag?: string
  title: string
  content: string
  collocations?: string[]
  illustration_url?: string
  illustration_source_id?: string
}

export interface WhiteboardComponent {
  type: 'whiteboard'
  img_url?: string
  source_id?: string
  img_width?: number
  img_height?: number
}

export interface VideoPlayComponent {
  type: 'video_play'
  /** 引用 src 中 type=video 的资源 */
  source_id: string
  start_ms: number
  end_ms: number
  playback_rate?: number
  subtitle_override?: SubtitleMode
  autoplay?: boolean
}

export interface NarrativeVideoComponent {
  type: 'narrative_video'
  /** 引用 src 中 type=video 的竖屏讲解视频 */
  source_id: string
  start_ms?: number
  end_ms?: number
  subtitles?: SubtitleCue[]
  autoplay?: boolean
}

export interface ScenarioVideoComponent {
  type: 'scenario_video'
  /** 引用 src 中 type=video 或 type=image 的场景素材 */
  visual_source_id: string
  /** 当 visual_source_id 为 image 时，可用独立音频承载场景台词 */
  audio_source_id?: string
  start_ms?: number
  end_ms?: number
  /** 老外台词播完后定帧暂停的位置（毫秒）；未填、0 或 -1 表示停在 end_ms 或视频结尾 */
  pause_at_ms?: number
  subtitles?: SubtitleCue[]
  prompt_text?: string
  autoplay?: boolean
  /** 判题失败时老外的困惑台词（气泡），同时用于 TTS 合成 */
  confused_prompt_text?: string
  /** @deprecated 困惑音频改走 TTS 合成，见 foreigner_prompt.confused_tts_voice_id */
  confused_audio_source_id?: string
}

export interface ForeignerPromptComponent {
  type: 'foreigner_prompt'
  foreigner_line_en: string
  foreigner_line_zh?: string
  teaching_objective: string
  acceptable_answers: string[]
  model_answer_en: string
  model_answer_zh?: string
  rubric_lines?: string[]
  asr_language?: string
  max_attempts?: number
  /** 判题失败时困惑台词 TTS 音色（Minimax voice_id） */
  confused_tts_voice_id?: string
}

export interface EvaCoachHintBoard {
  title?: string
  lines: string[]
  model_sentence?: string
}

export interface EvaCoachComponent {
  type: 'eva_coach'
  avatar_source_id: string
  /** 用户主动「问 Eva」时的中文开场 */
  ask_intro_text?: string
  /** 判题失败后的中文支招文案 */
  retry_coach_text?: string
  hint_board: EvaCoachHintBoard
  initially_open?: boolean
  tts_voice_id?: string
}

export interface HintBoardComponent {
  type: 'hint_board'
  title?: string
  lines: string[]
  initially_open?: boolean
}

export interface ScenarioCoachNodeMetadata {
  rewind_enabled?: boolean
  on_fail?: {
    confused_prompt_text?: string
    confused_audio_source_id?: string
  }
}

export const DEFAULT_COUNTDOWN_SEC = 3

export interface CountdownComponent {
  type: 'countdown'
  /** 倒计时秒数，默认 3；倒计时结束后才开始播放视频 */
  duration_sec?: number
}

export const DEFAULT_PLAY_VIDEO_STATUS_TITLE = '视频播放中'

export const DEFAULT_FOLLOW_READING_INSTRUCTION_PRIMARY = '试试大声读出下面的句子'
export const DEFAULT_FOLLOW_READING_INSTRUCTION_HINT = '可以先听一遍原音'

export interface FollowReadingPositiveFeedbackAudio {
  text_en: string
  audio_url: string
}

export const DEFAULT_POSITIVE_FEEDBACK_AUDIOS: FollowReadingPositiveFeedbackAudio[] = [
  { text_en: 'Great job! Your pronunciation sounds clear and natural.', audio_url: '' },
  { text_en: 'Well done! Keep up the fantastic work.', audio_url: '' },
  { text_en: 'Nice work! You should feel proud of how well you did.', audio_url: '' },
]

export interface FollowReadingComponent {
  type: 'follow_reading'
  instruction_primary?: string
  instruction_hint?: string
  text_en: string
  text_zh?: string
  language?: string
  reference_audio: string
  positive_feedback_audios?: FollowReadingPositiveFeedbackAudio[]
}

export interface PlayVideoBriefComponent {
  type: 'play_video_brief'
  /** 状态标题，默认「视频播放中」 */
  status_title?: string
  /** 说明文案，如「正在播放视频0-31s，正常速度，请仔细听哦～」 */
  description: string
}

export interface SingleChoiceComponent {
  type: 'single_choice'
  /** 选项文案列表 */
  options: string[]
  /** 正确答案在 options 中的下标 */
  correct_option_index: number
  correct_feedback_audio: string
  correct_feedback_subtitles: SubtitleCue[]
  incorrect_feedback_audio: string
  incorrect_feedback_subtitles: SubtitleCue[]
}

export const DEFAULT_VOICE_QA_INSTRUCTION_PRIMARY = '请用语音回答'
export const DEFAULT_VOICE_QA_INSTRUCTION_HINT =
  '中文、英文、中英混杂都可以，开口是通向流利说的起点！'
export const DEFAULT_VOICE_QA_MAX_ATTEMPTS = 2

export interface VoiceQaSimpleComponent {
  type: 'voice_qa_simple'
  instruction_primary?: string
  /** 辅助小字提示，默认鼓励开口 */
  instruction_hint?: string
  /** 白板 3~4 行 Markdown 提示 */
  hint_markdown: string
  question_en: string
  question_zh?: string
  /** 教学目标，供 LLM 判题与反馈参考 */
  teaching_objective: string
  rubric_lines?: string[]
  standard_answer: string
  standard_answer_zh?: string
  /** 学生最大作答轮次，默认 2 */
  max_attempts?: number
  /** 火山 ASR 语言，默认 en-US */
  asr_language?: string
  /** 动态反馈 TTS 音色 */
  tts_voice_id?: string
}

export const DEFAULT_GUIDED_SPEAKING_INSTRUCTION_PRIMARY = '请用语音回答'
export const DEFAULT_GUIDED_SPEAKING_INSTRUCTION_HINT =
  '中文、英文、中英混杂都可以，开口是通向流利说的起点！'
export const DEFAULT_GUIDED_SPEAKING_MAX_ROUNDS = 8

export interface GuidedSpeakingComponent {
  type: 'guided_speaking'
  instruction_primary?: string
  /** 辅助小字提示，默认鼓励开口 */
  instruction_hint?: string
  task_description: string
  expression_goals: string[]
  initial_hint_markdown?: string
  teaching_objective: string
  max_rounds?: number
  asr_language?: string
  tts_voice_id?: string
}

export type SceneComponent =
  | BackgroundImageComponent
  | TeacherAvatarComponent
  | KolAvatarComponent
  | SpeechComponent
  | ButtonComponent
  | MaterialFollowReadingAnchorComponent
  | KnowledgeCardComponent
  | WhiteboardComponent
  | VideoPlayComponent
  | NarrativeVideoComponent
  | ScenarioVideoComponent
  | ForeignerPromptComponent
  | EvaCoachComponent
  | HintBoardComponent
  | CountdownComponent
  | PlayVideoBriefComponent
  | FollowReadingComponent
  | SingleChoiceComponent
  | VoiceQaSimpleComponent
  | GuidedSpeakingComponent

export type SceneComponentType = SceneComponent['type']

export interface SceneNode {
  /** Stable node UUID for progress checkpoints; number is kept for legacy imported scripts. */
  id: number | string
  node_type?: 'narrative' | 'scenario_coach'
  components: SceneComponent[]
  metadata?: ScenarioCoachNodeMetadata & Record<string, unknown>
}

export interface SubmergeSequenceActivity {
  id: number | string
  type: 'submerge_sequence'
  common_layout: 'single_image_text' | string
  description?: string
  end_signal: string
  nodes: SceneNode[]
}

export interface LectureWithPracticeActivity {
  id: number | string
  type: 'lecture_with_practice'
  layout: 'react_teaching_with_practice' | string
  description?: string
  video_source_id: string
  end_signal?: string
  nodes: SceneNode[]
}

export interface ScenarioCoachActivity {
  id: number | string
  type: 'scenario_coach'
  layout: 'immersive_scenario_coach' | string
  description?: string
  coach_name: string
  progress_label?: string
  end_signal?: string
  nodes: SceneNode[]
}

export type AtbActivity = SubmergeSequenceActivity | LectureWithPracticeActivity | ScenarioCoachActivity

export type AtbActivityType = AtbActivity['type']

/** 课节级元数据，供 AI 老师等功能读取 */
export interface AtbLessonMetadata {
  /** 举手提问等 AI 老师场景的系统提示词 */
  ai_teacher_system_prompt?: string
}

export interface AtbReactionDocument {
  version: string
  lesson_title?: string
  lesson_section?: string
  default_subtitle_mode?: SubtitleMode
  metadata?: AtbLessonMetadata
  src: AtbSrcAsset[]
  activities: AtbActivity[]
}

export function isSubmergeSequenceActivity(
  activity: AtbActivity,
): activity is SubmergeSequenceActivity {
  return activity.type === 'submerge_sequence'
}

export function isLectureWithPracticeActivity(
  activity: AtbActivity,
): activity is LectureWithPracticeActivity {
  return activity.type === 'lecture_with_practice'
}

export function isScenarioCoachActivity(
  activity: AtbActivity,
): activity is ScenarioCoachActivity {
  return activity.type === 'scenario_coach'
}
