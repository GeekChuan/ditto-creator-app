import { useRef } from 'react'
import {
  Alert,
  Button,
  Divider,
  Empty,
  Popconfirm,
  Space,
  Tag,
  Typography,
  message,
} from 'antd'
import { DeleteOutlined, FileTextOutlined, UploadOutlined } from '@ant-design/icons'
import MediaOssUploadField from '../../components/lesson-json-v2/MediaOssUploadField'
import type { TeachingBoardNarrationTrack } from '../../types/teachingBoard'
import {
  formatTimelineTime,
  parseSubtitleAxis,
  subtitleAxisEndMs,
  subtitleTokenCount,
} from './subtitleAxis'

const { Text, Title } = Typography

interface Props {
  narration?: TeachingBoardNarrationTrack
  signedAudioUrl?: string
  currentMs: number
  onChange: (narration: TeachingBoardNarrationTrack | undefined) => void
  onSeek: (timeMs: number) => void
}

function inferredAudioName(url: string): string | undefined {
  try {
    return decodeURIComponent(new URL(url).pathname.split('/').pop() ?? '') || undefined
  } catch {
    return url.split('/').pop() || undefined
  }
}

export default function NarrationTrackPanel({
  narration,
  signedAudioUrl,
  currentMs,
  onChange,
  onSeek,
}: Props) {
  const subtitleInputRef = useRef<HTMLInputElement>(null)
  const axis = narration?.subtitle_axis
  const activeSegment = axis?.segments.find(
    (segment) => currentMs >= segment.start_ms && currentMs <= segment.end_ms,
  )

  const handleSubtitleFile = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as unknown
      const subtitleAxis = parseSubtitleAxis(parsed)
      onChange({ ...narration, subtitle_axis: subtitleAxis })
      message.success(`已导入 ${subtitleAxis.segments.length} 句、${subtitleTokenCount(subtitleAxis)} 个字词`)
    } catch (error) {
      message.error(error instanceof Error ? error.message : '字幕轴导入失败')
    }
  }

  return (
    <div className="tb-narration-panel">
      <div className="tb-inspector-title-row">
        <div>
          <Title level={5}>语音与字幕轴</Title>
          <Text type="secondary">OSS 原始链接持久化，播放时自动加签</Text>
        </div>
        {narration?.audio_url ? <Tag color={signedAudioUrl ? 'success' : 'processing'}>{signedAudioUrl ? '已加签' : '加签中'}</Tag> : null}
      </div>

      <Divider orientation="left" plain>语音文件</Divider>
      <MediaOssUploadField
        value={narration?.audio_url}
        accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg"
        mediaLabel="语音"
        placeholder="粘贴 OSS URL，或上传语音文件"
        onChange={(audioUrl) => onChange({
          ...narration,
          audio_url: audioUrl || undefined,
          audio_name: audioUrl ? inferredAudioName(audioUrl) : undefined,
        })}
      />
      {narration?.audio_url ? (
        <Space className="tb-narration-file-meta" wrap>
          <Text ellipsis={{ tooltip: narration.audio_name ?? narration.audio_url }}>
            {narration.audio_name ?? '已配置语音文件'}
          </Text>
          <Popconfirm
            title="移除语音文件？"
            description="字幕轴和动作会保留。"
            onConfirm={() => onChange({ ...narration, audio_url: undefined, audio_name: undefined, duration_ms: undefined })}
          >
            <Button size="small" type="text" danger icon={<DeleteOutlined />}>移除</Button>
          </Popconfirm>
        </Space>
      ) : (
        <Alert type="info" showIcon message="上传后保存的是 OSS 原始 URL，不会把临时签名写进项目 JSON。" />
      )}

      <Divider orientation="left" plain>逐字字幕轴</Divider>
      <Space wrap>
        <Button icon={<UploadOutlined />} onClick={() => subtitleInputRef.current?.click()}>
          {axis ? '替换字幕 JSON' : '导入字幕 JSON'}
        </Button>
        {axis ? (
          <Popconfirm title="移除字幕轴？" description="已有动作的 at_ms 会保留。" onConfirm={() => onChange({ ...narration, subtitle_axis: undefined })}>
            <Button danger icon={<DeleteOutlined />}>移除字幕</Button>
          </Popconfirm>
        ) : null}
      </Space>
      <input
        ref={subtitleInputRef}
        hidden
        type="file"
        accept="application/json,.json,.txt"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void handleSubtitleFile(file)
          event.target.value = ''
        }}
      />

      {axis ? (
        <>
          <div className="tb-subtitle-axis-summary">
            <FileTextOutlined />
            <span><strong>{axis.segments.length}</strong> 句</span>
            <span><strong>{subtitleTokenCount(axis)}</strong> 字词</span>
            <span>{formatTimelineTime(subtitleAxisEndMs(axis))}</span>
            {axis.source_task_id ? <Tag>{axis.source_task_id}</Tag> : null}
          </div>
          <div className="tb-subtitle-segment-list">
            {axis.segments.map((segment, segmentIndex) => (
              <button
                type="button"
                key={segment.id}
                className={['tb-subtitle-segment-card', segment.id === activeSegment?.id ? 'is-active' : ''].join(' ')}
                onClick={() => onSeek(segment.start_ms)}
              >
                <span>{String(segmentIndex + 1).padStart(2, '0')}</span>
                <strong>{segment.text}</strong>
                <small>{formatTimelineTime(segment.start_ms)} – {formatTimelineTime(segment.end_ms)}</small>
              </button>
            ))}
          </div>
        </>
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="支持 segments[].words[] 字/单词级时间数据" />
      )}
    </div>
  )
}
