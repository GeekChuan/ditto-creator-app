import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Button,
  Checkbox,
  Divider,
  Form,
  Input,
  InputNumber,
  Segmented,
  Slider,
  Space,
  Steps,
  Table,
  Tooltip,
  Typography,
  message,
} from 'antd'
import {
  PauseCircleOutlined,
  PlayCircleOutlined,
  VerticalLeftOutlined,
  VerticalRightOutlined,
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { assetsApi } from '../../../api/assets'
import { toolsApi } from '../../../api/tools'
import type { SpeechComponent, SubtitleCue } from '../../../types/atbReactionV2'
import MediaOssUploadField from '../MediaOssUploadField'
import { mapForcedAlignSegments, resolvePlayableAudioUrl } from '../lib/subtitleAlign'
import TtsVoiceSelect from './TtsVoiceSelect'
import { DEFAULT_TTS_VOICE_ID, useTtsVoiceStore } from '../lib/ttsVoiceStore'
import './speech-preview.css'

const { Text } = Typography
const { TextArea } = Input

const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5]

interface Props {
  value: SpeechComponent
  onChange: (next: SpeechComponent) => void
}

function subtitlesToSourceText(subtitles: SubtitleCue[]): string {
  return subtitles.map((s) => s.text).join(' ').trim()
}

function formatMs(ms: number): string {
  const total = Math.max(0, ms) / 1000
  const m = Math.floor(total / 60)
  const s = total - m * 60
  return `${m}:${s.toFixed(1).padStart(4, '0')}`
}

export default function SpeechComponentForm({ value, onChange }: Props) {
  // 优先用持久化的 source_text（含标点）；旧数据没有该字段时才从 subtitles 拼回（无标点）
  const [sourceText, setSourceText] = useState(
    () => value.source_text?.trim() || subtitlesToSourceText(value.subtitles),
  )
  // 全局音色偏好：选一次所有 TTS 入口共用
  const voiceId = useTtsVoiceStore((s) => s.voiceId)
  const setVoiceId = useTtsVoiceStore((s) => s.setVoiceId)
  const [ttsLoading, setTtsLoading] = useState(false)
  const [alignLoading, setAlignLoading] = useState(false)
  const [autoAlignAfterTts, setAutoAlignAfterTts] = useState(true)

  // ---- 字幕联动预览播放器 ----
  const audioRef = useRef<HTMLAudioElement | null>(null)
  /** 已签名播放地址对应的原始 audio URL，audio 变更后需重新签名 */
  const signedFromRef = useRef('')
  /** 签名地址生效后待执行的动作（跳转位置 + 播放） */
  const pendingRef = useRef<{ ms: number | null } | null>(null)
  const [playUrl, setPlayUrl] = useState('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [currentMs, setCurrentMs] = useState(0)
  const [durationMs, setDurationMs] = useState(0)
  const [rate, setRate] = useState(1)
  /** 播放时字幕表是否自动滚动到当前行，默认关闭以免打断手动微调 */
  const [autoFollow, setAutoFollow] = useState(false)

  useEffect(() => {
    if (!sourceText.trim()) {
      const fallback = value.source_text?.trim() || subtitlesToSourceText(value.subtitles)
      if (fallback) setSourceText(fallback)
    }
  }, [value.source_text, value.subtitles, sourceText])

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = rate
  }, [rate, playUrl])

  const playerLoaded = Boolean(playUrl) && signedFromRef.current === (value.audio?.trim() ?? '')

  const activeIndex = useMemo(
    () =>
      value.subtitles.findIndex(
        (s) => currentMs >= s.start_ms && currentMs < s.end_ms,
      ),
    [value.subtitles, currentMs],
  )
  const activeCue = activeIndex >= 0 ? value.subtitles[activeIndex] : undefined

  // 播放时让当前字幕行保持在可视区域内（需勾选「自动滚动」）
  useEffect(() => {
    if (!autoFollow || !playing || activeIndex < 0) return
    document
      .getElementById(`speech-cue-row-${activeIndex}`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [autoFollow, playing, activeIndex])

  /** 确保签名播放地址可用；audio URL 变化后自动重签 */
  const ensurePreviewLoaded = async (): Promise<boolean> => {
    const raw = value.audio?.trim()
    if (!raw) {
      message.warning('请先通过 TTS 生成或填写音频 URL')
      return false
    }
    if (playUrl && signedFromRef.current === raw) return true
    setPreviewLoading(true)
    try {
      // 私有桶资源不能直接播放，先换取签名播放 URL
      const { play_url } = await assetsApi.getPlaybackUrl({
        file_url: raw,
        expires: 1800,
        nonce: Date.now(),
      })
      signedFromRef.current = raw
      setPlayUrl(play_url)
      setCurrentMs(0)
      return true
    } catch {
      message.error('获取音频播放地址失败，请稍后重试')
      return false
    } finally {
      setPreviewLoading(false)
    }
  }

  const startPlayback = async (ms: number | null) => {
    const raw = value.audio?.trim() ?? ''
    if (playUrl && signedFromRef.current === raw) {
      const el = audioRef.current
      if (!el) return
      if (ms != null) el.currentTime = ms / 1000
      void el.play()
      return
    }
    pendingRef.current = { ms }
    await ensurePreviewLoaded()
    // 剩余动作在 onLoadedMetadata 中完成
  }

  const togglePlay = () => {
    if (playing) {
      audioRef.current?.pause()
      return
    }
    void startPlayback(null)
  }

  const seekMs = (ms: number) => {
    const el = audioRef.current
    if (el && playerLoaded) {
      el.currentTime = ms / 1000
    }
    setCurrentMs(ms)
  }

  const playCue = (index: number) => {
    const cue = value.subtitles[index]
    if (!cue) return
    void startPlayback(cue.start_ms)
  }

  const stampCue = (index: number, field: 'start_ms' | 'end_ms') => {
    const ms = Math.round(currentMs)
    updateSubtitle(index, { [field]: ms })
    message.success(`已把第 ${index + 1} 行 ${field} 设为 ${ms}ms`)
  }

  const updateSubtitle = (index: number, patch: Partial<SubtitleCue>) => {
    onChange({
      ...value,
      subtitles: value.subtitles.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    })
  }

  const runForcedAlign = async (audioUrl: string, text: string) => {
    const script = text.trim()
    if (!script) {
      message.warning('请先输入 speech 原文')
      return
    }
    if (!audioUrl.trim()) {
      message.warning('请先通过 TTS 生成或填写音频 URL')
      return
    }

    setAlignLoading(true)
    try {
      const playableUrl = await resolvePlayableAudioUrl(audioUrl)
      const res = await toolsApi.runTool('asr-forced-align', {
        payload: {
          audio_url: playableUrl,
          text: script,
          caption_type: 'speech',
        },
      })
      if (res.status !== 'ok' || !res.result) {
        throw new Error(res.error || '字幕打轴失败')
      }
      const segments = (res.result.segments as Array<Record<string, unknown>> | undefined) ?? []
      const subtitles = mapForcedAlignSegments(segments)
      if (!subtitles.length) {
        throw new Error('打轴结果为空，请检查原文与音频是否匹配')
      }
      const lastEndSec = subtitles[subtitles.length - 1]?.end_ms ?? 0
      onChange({
        ...value,
        audio: audioUrl,
        source_text: script,
        subtitles,
        audio_duration: Math.max(
          value.audio_duration,
          Math.round((lastEndSec / 1000) * 10) / 10,
        ),
      })
      message.success(`已生成 ${subtitles.length} 条字幕时间轴`)
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '字幕打轴失败')
    } finally {
      setAlignLoading(false)
    }
  }

  const runTts = async () => {
    const text = sourceText.trim()
    if (!text) {
      message.warning('请先输入 speech 原文')
      return
    }
    setTtsLoading(true)
    try {
      const req = {
        text,
        voice_id: voiceId.trim() || DEFAULT_TTS_VOICE_ID,
      }
      const res = await assetsApi.minimaxTts(req)
      const next: SpeechComponent = {
        ...value,
        audio: res.audio_url,
        audio_duration: res.audio_duration ?? value.audio_duration,
        source_text: text,
      }
      onChange(next)
      message.success('TTS 音频已生成')
      if (autoAlignAfterTts) {
        await runForcedAlign(res.audio_url, text)
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      const detail = err?.response?.data?.detail
      message.error(typeof detail === 'string' ? detail : 'TTS 生成失败')
    } finally {
      setTtsLoading(false)
    }
  }

  const lastCueEndMs = value.subtitles.reduce((max, s) => Math.max(max, s.end_ms), 0)
  const sliderMaxMs = Math.max(durationMs, lastCueEndMs, value.audio_duration * 1000, 1000)

  const columns: ColumnsType<SubtitleCue> = [
    {
      title: '',
      width: 40,
      render: (_, __, index) => (
        <Tooltip title="从本句开始播放">
          <Button
            size="small"
            type="text"
            icon={<PlayCircleOutlined />}
            disabled={!value.audio?.trim()}
            onClick={() => playCue(index)}
          />
        </Tooltip>
      ),
    },
    {
      title: 'start_ms',
      width: 96,
      render: (_, __, index) => (
        <InputNumber
          size="small"
          min={0}
          style={{ width: '100%' }}
          value={value.subtitles[index]?.start_ms}
          onChange={(v) => updateSubtitle(index, { start_ms: v ?? 0 })}
        />
      ),
    },
    {
      title: 'end_ms',
      width: 96,
      render: (_, __, index) => (
        <InputNumber
          size="small"
          min={0}
          style={{ width: '100%' }}
          value={value.subtitles[index]?.end_ms}
          onChange={(v) => updateSubtitle(index, { end_ms: v ?? 0 })}
        />
      ),
    },
    {
      title: '对时',
      width: 76,
      render: (_, __, index) => (
        <Space size={0}>
          <Tooltip title="把当前播放时间设为本行 start_ms">
            <Button
              size="small"
              type="text"
              icon={<VerticalRightOutlined />}
              disabled={!playerLoaded}
              onClick={() => stampCue(index, 'start_ms')}
            />
          </Tooltip>
          <Tooltip title="把当前播放时间设为本行 end_ms">
            <Button
              size="small"
              type="text"
              icon={<VerticalLeftOutlined />}
              disabled={!playerLoaded}
              onClick={() => stampCue(index, 'end_ms')}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: 'text',
      render: (_, __, index) => (
        <Input
          size="small"
          value={value.subtitles[index]?.text}
          onChange={(e) => updateSubtitle(index, { text: e.target.value })}
        />
      ),
    },
    {
      title: 'translation_zh',
      render: (_, __, index) => (
        <Input
          size="small"
          value={value.subtitles[index]?.translation_zh ?? ''}
          onChange={(e) => updateSubtitle(index, { translation_zh: e.target.value })}
        />
      ),
    },
    {
      title: 'highlights',
      width: 100,
      render: (_, __, index) => (
        <Input
          size="small"
          placeholder="逗号分隔"
          value={(value.subtitles[index]?.highlights ?? []).join(', ')}
          onChange={(e) =>
            updateSubtitle(index, {
              highlights: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
            })
          }
        />
      ),
    },
    {
      title: '',
      width: 50,
      render: (_, __, index) => (
        <Button
          size="small"
          danger
          type="link"
          onClick={() =>
            onChange({
              ...value,
              subtitles: value.subtitles.filter((_, i) => i !== index),
            })
          }
        >
          删
        </Button>
      ),
    },
  ]

  const stepStatus = {
    text: sourceText.trim() ? 1 : 0,
    audio: value.audio?.trim() ? 1 : 0,
    align: value.subtitles.length ? 1 : 0,
  }

  return (
    <Form layout="vertical" size="small">
      <Steps
        size="small"
        style={{ marginBottom: 12 }}
        items={[
          { title: '输入原文', status: stepStatus.text ? 'finish' : 'process' },
          { title: '获取音频', status: stepStatus.audio ? 'finish' : stepStatus.text ? 'process' : 'wait' },
          {
            title: '字幕打轴',
            status: stepStatus.align ? 'finish' : stepStatus.audio ? 'process' : 'wait',
          },
        ]}
      />

      {/* 原文与音频并排，压缩纵向空间，让下方预览与字幕表尽量一屏可见 */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        <Form.Item
          label="speech 原文（整段）"
          required
          style={{ flex: '1.2 1 320px', minWidth: 300, marginBottom: 8 }}
        >
          <TextArea
            rows={6}
            value={sourceText}
            onChange={(e) => {
              setSourceText(e.target.value)
              // 持久化含标点的原文，避免打轴后从无标点的 subtitles 反推导致标点丢失
              onChange({ ...value, source_text: e.target.value })
            }}
            placeholder="输入完整讲解稿，将作为 TTS 输入与打轴对照文本"
          />
        </Form.Item>

        <div style={{ flex: '1 1 300px', minWidth: 280 }}>
          <Form.Item label="audio" style={{ marginBottom: 8 }}>
            <MediaOssUploadField
              value={value.audio}
              onChange={(url) => onChange({ ...value, audio: url })}
              accept="audio/*"
              mediaLabel="音频"
            />
          </Form.Item>
          <Space wrap style={{ marginBottom: 8 }}>
            <TtsVoiceSelect value={voiceId} onChange={setVoiceId} style={{ width: 170 }} />
            <Button size="small" loading={ttsLoading} onClick={() => void runTts()}>
              Minimax TTS 生成音频
            </Button>
            <Checkbox
              checked={autoAlignAfterTts}
              onChange={(e) => setAutoAlignAfterTts(e.target.checked)}
            >
              TTS 后自动打轴
            </Checkbox>
          </Space>
          <Space size={8} align="center">
            <Text type="secondary" style={{ fontSize: 12 }}>
              audio_duration（秒）
            </Text>
            <InputNumber
              size="small"
              min={0}
              step={0.1}
              style={{ width: 120 }}
              value={value.audio_duration}
              onChange={(v) => onChange({ ...value, audio_duration: v ?? 0 })}
            />
          </Space>
        </div>
      </div>

      <Divider style={{ margin: '10px 0' }} />

      <Space wrap style={{ marginBottom: 8 }} align="center">
        <Button
          type="primary"
          size="small"
          loading={alignLoading}
          disabled={!sourceText.trim() || !value.audio?.trim()}
          onClick={() => void runForcedAlign(value.audio, sourceText)}
        >
          火山引擎字幕打轴
        </Button>
        <Button
          size="small"
          onClick={() =>
            onChange({
              ...value,
              subtitles: [...value.subtitles, { start_ms: 0, end_ms: 3000, text: '' }],
            })
          }
        >
          手动添加字幕行
        </Button>
        <Text type="secondary" style={{ fontSize: 12 }}>
          打轴用 asr-forced-align 生成精确时间轴，生成后可在下表微调。
        </Text>
      </Space>

      <div className="speech-preview-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Button
            type="primary"
            shape="circle"
            loading={previewLoading}
            disabled={!value.audio?.trim()}
            icon={playing ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={togglePlay}
          />
          <div style={{ flex: 1, minWidth: 200 }}>
            <Slider
              min={0}
              max={Math.round(sliderMaxMs)}
              step={10}
              value={Math.round(currentMs)}
              disabled={!playerLoaded}
              tooltip={{ formatter: (v) => formatMs(v ?? 0) }}
              onChange={(v) => seekMs(v)}
            />
          </div>
          <Text type="secondary" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
            {formatMs(currentMs)} / {formatMs(sliderMaxMs)}
          </Text>
          <Segmented
            size="small"
            value={rate}
            onChange={(v) => setRate(Number(v))}
            options={PLAYBACK_RATES.map((r) => ({ label: `${r}x`, value: r }))}
          />
          <Checkbox
            checked={autoFollow}
            onChange={(e) => setAutoFollow(e.target.checked)}
            style={{ whiteSpace: 'nowrap' }}
          >
            自动滚动
          </Checkbox>
        </div>

        <div className="speech-preview-caption">
          {activeCue ? (
            <>
              <div className="speech-preview-caption-text">{activeCue.text || '（空字幕）'}</div>
              {activeCue.translation_zh ? (
                <div className="speech-preview-caption-translation">{activeCue.translation_zh}</div>
              ) : null}
            </>
          ) : (
            <div className="speech-preview-caption-translation">
              {playerLoaded
                ? '（当前时间点没有字幕，可用「对时」按钮校准）'
                : '点击播放后，此处实时显示当前字幕；表格中对应行会同步高亮'}
            </div>
          )}
        </div>

        <audio
          ref={audioRef}
          src={playUrl || undefined}
          preload="metadata"
          style={{ display: 'none' }}
          onLoadedMetadata={(e) => {
            const el = e.currentTarget
            setDurationMs(Math.round(el.duration * 1000))
            el.playbackRate = rate
            const pending = pendingRef.current
            if (pending) {
              pendingRef.current = null
              if (pending.ms != null) el.currentTime = pending.ms / 1000
              void el.play()
            }
          }}
          onTimeUpdate={(e) => setCurrentMs(e.currentTarget.currentTime * 1000)}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
      </div>

      <Table
        size="small"
        rowKey={(_, i) => String(i)}
        pagination={false}
        dataSource={value.subtitles}
        columns={columns}
        scroll={{ x: 860, y: 380 }}
        locale={{ emptyText: '完成打轴后将在此显示字幕时间轴' }}
        rowClassName={(_, index) => (index === activeIndex ? 'speech-cue-row-active' : '')}
        onRow={(_, index) => ({ id: `speech-cue-row-${index ?? 0}` })}
      />
    </Form>
  )
}
