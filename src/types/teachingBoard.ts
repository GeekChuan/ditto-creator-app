export interface TeachingBoardTextSegment {
  text: string
  anchor_id?: string
}

export type TeachingBoardText = TeachingBoardTextSegment[]

interface TeachingBoardBlockBase {
  id: string
  type: string
}

export interface TeachingBoardTitleBlock extends TeachingBoardBlockBase {
  type: 'title'
  variant?: 'normal' | 'capsule'
  text: TeachingBoardText
}

export interface TeachingBoardContentBlock extends TeachingBoardBlockBase {
  type: 'content'
  variant?: 'normal'
  text: TeachingBoardText
}

export interface TeachingBoardQuoteBlock extends TeachingBoardBlockBase {
  type: 'quote'
  variant?: 'normal'
  paragraphs: TeachingBoardText[]
}

export interface TeachingBoardOrderListItem {
  id: string
  title: TeachingBoardText
  description?: TeachingBoardText
}

export interface TeachingBoardOrderListBlock extends TeachingBoardBlockBase {
  type: 'order_list'
  variant?: 'normal' | 'simple'
  items: TeachingBoardOrderListItem[]
  initial_active_item_id?: string
}

export interface TeachingBoardImageBlock extends TeachingBoardBlockBase {
  type: 'image'
  source_id?: string
  url?: string
  alt?: string
  caption?: TeachingBoardText
}

export interface TeachingBoardVideoBlock extends TeachingBoardBlockBase {
  type: 'video'
  source_id?: string
  url?: string
  poster_source_id?: string
  poster_url?: string
  caption?: TeachingBoardText
  autoplay?: boolean
  loop?: boolean
  muted?: boolean
  controls?: boolean
}

export interface TeachingBoardExtensionBlock extends TeachingBoardBlockBase {
  type: `x_${string}`
  [key: string]: unknown
}

export type TeachingBoardBlock =
  | TeachingBoardTitleBlock
  | TeachingBoardContentBlock
  | TeachingBoardQuoteBlock
  | TeachingBoardOrderListBlock
  | TeachingBoardImageBlock
  | TeachingBoardVideoBlock
  | TeachingBoardExtensionBlock

export interface TeachingBoardDocument {
  schema: 'ditto.teaching-board.v1'
  board_id: string
  broadcast_channel?: string
  blocks: TeachingBoardBlock[]
}

export type TeachingBoardEffectType =
  | 'underline'
  | 'circle'
  | 'highlight'
  | 'text_emphasis'
  | 'label'

export type TeachingBoardEffectTone = 'primary' | 'annotation' | 'secondary'

export type TeachingBoardAnchorTarget =
  | { anchor_id: string }
  | {
      anchor_range: {
        start_anchor_id: string
        end_anchor_id: string
      }
    }

export interface TeachingBoardEffect {
  effect_id: string
  type: TeachingBoardEffectType
  target: TeachingBoardAnchorTarget
  tone?: TeachingBoardEffectTone
  text?: string
}

export type TeachingBoardCommand =
  | { type: 'apply_effect'; effect: TeachingBoardEffect }
  | { type: 'remove_effect'; effect_id: string }
  | { type: 'clear_effects' }
  | { type: 'set_order_list_active_item'; block_id: string; item_id?: string }

export interface TeachingBoardBroadcastMessage {
  message_id: string
  channel: string
  board_id?: string
  command: TeachingBoardCommand
}

export interface TeachingBoardAction {
  id: string
  name: string
  at_ms: number
  /**
   * Creator 中选择字幕字词边界时保留的可编辑引用。
   * at_ms 始终是播放器和广播执行时使用的最终时间。
   */
  time_ref?: TeachingBoardActionTimeReference
  command: TeachingBoardCommand
}

export interface TeachingBoardTimedToken {
  id: string
  text: string
  start_ms: number
  end_ms: number
}

export interface TeachingBoardSubtitleSegment {
  id: string
  text: string
  start_ms: number
  end_ms: number
  tokens: TeachingBoardTimedToken[]
}

export interface TeachingBoardSubtitleAxis {
  source_task_id?: string
  segments: TeachingBoardSubtitleSegment[]
}

export interface TeachingBoardNarrationTrack {
  /** 持久化 OSS 地址；Creator 和播放器预览时再获取临时签名地址。 */
  audio_url?: string
  audio_name?: string
  duration_ms?: number
  subtitle_axis?: TeachingBoardSubtitleAxis
}

export interface TeachingBoardActionTimeReference {
  segment_id: string
  token_id: string
  boundary: 'start' | 'end'
}

/** Creator 编辑态：动作属于教学编排，不写回 TeachingBoardDocument。 */
export interface TeachingBoardProject {
  schema: 'ditto.teaching-board-project.v1'
  name: string
  document: TeachingBoardDocument
  actions: TeachingBoardAction[]
  narration?: TeachingBoardNarrationTrack
}
