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

export interface PlayVideoBriefComponent {
  type: 'play_video_brief'
  /** 状态标题，默认「视频播放中」 */
  status_title?: string
  /** 说明文案，如「正在播放视频0-31s，正常速度，请仔细听哦～」 */
  description: string
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
