import { Tag, Tooltip, Typography } from 'antd'
import type {
  TeachingBoardActionTimeReference,
  TeachingBoardSubtitleAxis,
} from '../../types/teachingBoard'
import { findSubtitleSegmentAt, formatTimelineTime } from './subtitleAxis'

const { Text } = Typography

interface Props {
  axis?: TeachingBoardSubtitleAxis
  durationMs: number
  currentMs: number
  selectedTimeRef?: TeachingBoardActionTimeReference
  onSeek: (timeMs: number) => void
}

function visibleTokenText(text: string): string {
  return text.trim() ? text : '␠'
}

export default function SubtitleTimelineTrack({
  axis,
  durationMs,
  currentMs,
  selectedTimeRef,
  onSeek,
}: Props) {
  if (!axis?.segments.length) {
    return (
      <div className="tb-subtitle-timeline-empty">
        <Text type="secondary">尚未配置逐字字幕轴，可在右侧“语音轴”中导入。</Text>
      </div>
    )
  }

  const activeSegment = findSubtitleSegmentAt(axis, currentMs)
  const safeDuration = Math.max(1, durationMs)

  return (
    <div className="tb-subtitle-timeline">
      <div className="tb-subtitle-sentence-lane" aria-label="句子时间轴">
        {axis.segments.map((segment, index) => {
          const left = (segment.start_ms / safeDuration) * 100
          const width = Math.max(0.35, ((segment.end_ms - segment.start_ms) / safeDuration) * 100)
          return (
            <Tooltip key={segment.id} title={`${index + 1}. ${segment.text} · ${formatTimelineTime(segment.start_ms)}`}>
              <button
                type="button"
                className={['tb-subtitle-sentence-block', segment.id === activeSegment?.id ? 'is-active' : ''].join(' ')}
                style={{ left: `${left}%`, width: `${width}%` }}
                onClick={() => onSeek(segment.start_ms)}
              >
                {segment.text}
              </button>
            </Tooltip>
          )
        })}
        <span className="tb-subtitle-playhead" style={{ left: `${(currentMs / safeDuration) * 100}%` }} />
      </div>

      <div className="tb-subtitle-token-lane">
        <Tag color="green">{activeSegment ? axis.segments.indexOf(activeSegment) + 1 : '—'}</Tag>
        <div className="tb-subtitle-token-copy">
          {activeSegment?.tokens.map((token) => {
            const isPlaying = currentMs >= token.start_ms && currentMs <= token.end_ms
            const isReferenced = token.id === selectedTimeRef?.token_id
            return (
              <Tooltip
                key={token.id}
                title={`开始 ${formatTimelineTime(token.start_ms)} · 结束 ${formatTimelineTime(token.end_ms)}`}
              >
                <button
                  type="button"
                  className={[
                    'tb-subtitle-token',
                    isPlaying ? 'is-playing' : '',
                    isReferenced ? 'is-referenced' : '',
                  ].join(' ')}
                  onClick={() => onSeek(token.start_ms)}
                >
                  {visibleTokenText(token.text)}
                </button>
              </Tooltip>
            )
          }) ?? <Text type="secondary">当前时间没有对应句子</Text>}
        </div>
      </div>
    </div>
  )
}
