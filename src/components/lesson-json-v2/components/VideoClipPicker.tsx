import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, InputNumber, Select, Space, Typography } from 'antd'
import { PauseOutlined, PlayCircleOutlined } from '@ant-design/icons'
import { useSignedMediaUrl } from '../../../hooks/useSignedMediaUrl'
import type { AtbSrcAsset } from '../../../types/atbReactionV2'
import {
  findActiveSegmentIndex,
  formatMs,
} from '../../subtitle-timing/normalizeSegments'

const { Text } = Typography

interface Props {
  src: AtbSrcAsset[]
  sourceId: string
  startMs: number
  endMs: number
  playbackRate?: number
  onChangeRange: (patch: { start_ms?: number; end_ms?: number }) => void
}

/**
 * 视频片段选择器：起止时间可直接从视频字幕句中选择
 * （开始=某句的头时间，结束=某句的尾时间），右侧可播放该片段并跟随显示字幕。
 */
export default function VideoClipPicker({
  src,
  sourceId,
  startMs,
  endMs,
  playbackRate = 1,
  onChangeRange,
}: Props) {
  const videoAsset = useMemo(
    () => src.find((s) => s.id === sourceId && s.type === 'video') ?? null,
    [src, sourceId],
  )
  const segments = videoAsset?.subtitles?.segments ?? []
  const playUrl = useSignedMediaUrl(videoAsset?.url)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [currentMs, setCurrentMs] = useState<number | null>(null)
  // 用 ref 存边界，避免 timeupdate 闭包拿到旧值
  const stopAtRef = useRef(endMs)
  stopAtRef.current = endMs

  const startIndex = segments.findIndex((s) => s.start_ms === startMs)
  const endIndex = segments.findIndex((s) => s.end_ms === endMs)

  const segmentOptions = (kind: 'start' | 'end') =>
    segments.map((s, i) => ({
      value: i,
      label: `${formatMs(kind === 'start' ? s.start_ms : s.end_ms)}  ${s.text}`,
    }))

  const playClip = () => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = startMs / 1000
    video.playbackRate = playbackRate
    void video.play()
  }

  const pause = () => videoRef.current?.pause()

  useEffect(() => {
    const video = videoRef.current
    if (video) video.playbackRate = playbackRate
  }, [playbackRate, playUrl])

  const activeIndex = currentMs === null ? -1 : findActiveSegmentIndex(segments, currentMs)
  const activeSegment = activeIndex >= 0 ? segments[activeIndex] : null

  if (!videoAsset) {
    return (
      <Text type="secondary" style={{ fontSize: 12 }}>
        先选择视频资源，才能预览片段和从字幕选时间
      </Text>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
      {/* 左：从字幕选起止 + 毫秒微调 */}
      <div style={{ flex: 1, minWidth: 260, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            开始于（句子的头时间）
          </Text>
          <Select
            size="small"
            style={{ width: '100%', marginTop: 2 }}
            showSearch
            optionFilterProp="label"
            disabled={segments.length === 0}
            placeholder={segments.length ? '选择开始句' : '该视频资源没有字幕'}
            value={startIndex >= 0 ? startIndex : undefined}
            onChange={(i: number) => onChangeRange({ start_ms: segments[i].start_ms })}
            options={segmentOptions('start')}
          />
        </div>
        <div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            结束于（句子的尾时间）
          </Text>
          <Select
            size="small"
            style={{ width: '100%', marginTop: 2 }}
            showSearch
            optionFilterProp="label"
            disabled={segments.length === 0}
            placeholder={segments.length ? '选择结束句' : '该视频资源没有字幕'}
            value={endIndex >= 0 ? endIndex : undefined}
            onChange={(i: number) => onChangeRange({ end_ms: segments[i].end_ms })}
            options={segmentOptions('end')}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              start_ms
            </Text>
            <InputNumber
              size="small"
              min={0}
              style={{ width: '100%', marginTop: 2 }}
              value={startMs}
              onChange={(v) => onChangeRange({ start_ms: v ?? 0 })}
            />
          </div>
          <div style={{ flex: 1 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              end_ms
            </Text>
            <InputNumber
              size="small"
              min={0}
              style={{ width: '100%', marginTop: 2 }}
              value={endMs}
              onChange={(v) => onChangeRange({ end_ms: v ?? 0 })}
            />
          </div>
        </div>
        {startMs >= endMs ? (
          <Text type="warning" style={{ fontSize: 12 }}>
            start_ms 须小于 end_ms
          </Text>
        ) : (
          <Text type="secondary" style={{ fontSize: 12 }}>
            片段 {formatMs(startMs)} ~ {formatMs(endMs)} · 时长{' '}
            {((endMs - startMs) / 1000).toFixed(1)}s
          </Text>
        )}
        {segments.length === 0 ? (
          <Text type="secondary" style={{ fontSize: 12 }}>
            提示：可在资源池对该视频「识别英文字幕」，或从素材库带字幕重新导入
          </Text>
        ) : null}
      </div>

      {/* 右：片段预览（视频 + 字幕跟随） */}
      <div style={{ width: 300, flexShrink: 0 }}>
        <div style={{ position: 'relative', background: '#000', borderRadius: 8, overflow: 'hidden' }}>
          <video
            ref={videoRef}
            src={playUrl ?? undefined}
            controls
            preload="metadata"
            style={{ width: '100%', maxHeight: 220, display: 'block' }}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onTimeUpdate={(e) => {
              const video = e.currentTarget
              const ms = Math.round(video.currentTime * 1000)
              setCurrentMs(ms)
              // 播到片段结束自动停（留 40ms 容差防止 timeupdate 粒度跳过）
              if (!video.paused && stopAtRef.current > 0 && ms >= stopAtRef.current - 40) {
                video.pause()
              }
            }}
          />
        </div>
        <div
          style={{
            minHeight: 40,
            marginTop: 6,
            padding: '4px 8px',
            borderRadius: 6,
            background: 'rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          {activeSegment ? (
            <>
              <Text style={{ fontSize: 12, lineHeight: 1.4 }}>{activeSegment.text}</Text>
              {activeSegment.translation_zh ? (
                <Text type="secondary" style={{ fontSize: 11, lineHeight: 1.4 }}>
                  {activeSegment.translation_zh}
                </Text>
              ) : null}
            </>
          ) : (
            <Text type="secondary" style={{ fontSize: 11 }}>
              {segments.length ? '播放后此处跟随显示字幕' : '该视频没有字幕'}
            </Text>
          )}
        </div>
        <Space style={{ marginTop: 6 }}>
          {playing ? (
            <Button size="small" icon={<PauseOutlined />} onClick={pause}>
              暂停
            </Button>
          ) : (
            <Button
              size="small"
              type="primary"
              icon={<PlayCircleOutlined />}
              disabled={!playUrl || startMs >= endMs}
              onClick={playClip}
            >
              播放片段
            </Button>
          )}
          {currentMs !== null ? (
            <Text type="secondary" style={{ fontSize: 11 }}>
              {formatMs(currentMs)}
            </Text>
          ) : null}
        </Space>
      </div>
    </div>
  )
}
