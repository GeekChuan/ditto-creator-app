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

export interface VideoSubtitleSegment {
  start_ms: number
  end_ms: number
  text: string
  translation_zh?: string
  highlights?: string[]
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
}

export interface ButtonComponent {
  type: 'button'
  text: string
  click_signal: string
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
export const DEFAULT_VOICE_QA_MAX_ATTEMPTS = 2

export interface VoiceQaSimpleComponent {
  type: 'voice_qa_simple'
  instruction_primary?: string
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
export const DEFAULT_GUIDED_SPEAKING_MAX_ROUNDS = 8

export interface GuidedSpeakingComponent {
  type: 'guided_speaking'
  instruction_primary?: string
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
  | KnowledgeCardComponent
  | WhiteboardComponent
  | VideoPlayComponent
  | CountdownComponent
  | PlayVideoBriefComponent
  | FollowReadingComponent
  | SingleChoiceComponent
  | VoiceQaSimpleComponent
  | GuidedSpeakingComponent

export type SceneComponentType = SceneComponent['type']

export interface SceneNode {
  id: number | string
  components: SceneComponent[]
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
  layout: 'react_teaching_with_practice'
  description?: string
  video_source_id: string
  end_signal?: string
  nodes: SceneNode[]
}

export type AtbActivity = SubmergeSequenceActivity | LectureWithPracticeActivity

export type AtbActivityType = AtbActivity['type']

export interface AtbReactionDocument {
  version: string
  lesson_title?: string
  lesson_section?: string
  default_subtitle_mode?: SubtitleMode
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
