import { useEffect, useState } from 'react'
import {
  Button,
  Checkbox,
  Divider,
  Form,
  Input,
  InputNumber,
  Space,
  Steps,
  Table,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { assetsApi } from '../../../api/assets'
import { toolsApi } from '../../../api/tools'
import type { SpeechComponent, SubtitleCue } from '../../../types/atbReactionV2'
import AudioPlayerModal from '../../AudioPlayerModal'
import MediaOssUploadField from '../MediaOssUploadField'
import { mapForcedAlignSegments, resolvePlayableAudioUrl } from '../lib/subtitleAlign'

const { Text } = Typography
const { TextArea } = Input

/** Minimax 音色 ID 区分大小写，与 V1 课例脚本及后端默认一致 */
const DEFAULT_MINIMAX_VOICE_ID = 'ZxueliLLS'

interface Props {
  value: SpeechComponent
  onChange: (next: SpeechComponent) => void
}

function subtitlesToSourceText(subtitles: SubtitleCue[]): string {
  return subtitles.map((s) => s.text).join(' ').trim()
}

export default function SpeechComponentForm({ value, onChange }: Props) {
  // 优先用持久化的 source_text（含标点）；旧数据没有该字段时才从 subtitles 拼回（无标点）
  const [sourceText, setSourceText] = useState(
    () => value.source_text?.trim() || subtitlesToSourceText(value.subtitles),
  )
  const [voiceId, setVoiceId] = useState(DEFAULT_MINIMAX_VOICE_ID)
  const [ttsLoading, setTtsLoading] = useState(false)
  const [alignLoading, setAlignLoading] = useState(false)
  const [autoAlignAfterTts, setAutoAlignAfterTts] = useState(true)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState('')

  useEffect(() => {
    if (!sourceText.trim()) {
      const fallback = value.source_text?.trim() || subtitlesToSourceText(value.subtitles)
      if (fallback) setSourceText(fallback)
    }
  }, [value.source_text, value.subtitles, sourceText])

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

  const openAudioPreview = async () => {
    const rawUrl = value.audio?.trim()
    if (!rawUrl) {
      message.warning('请先通过 TTS 生成或填写音频 URL')
      return
    }
    setPreviewLoading(true)
    try {
      // 私有桶资源不能直接播放，先换取签名播放 URL
      const { play_url } = await assetsApi.getPlaybackUrl({
        file_url: rawUrl,
        expires: 1800,
        nonce: Date.now(),
      })
      setPreviewUrl(play_url)
      setPreviewOpen(true)
    } catch {
      message.error('获取音频播放地址失败，请稍后重试')
    } finally {
      setPreviewLoading(false)
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
        voice_id: voiceId.trim() || DEFAULT_MINIMAX_VOICE_ID,
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

  const columns: ColumnsType<SubtitleCue> = [
    {
      title: 'start_ms',
      width: 90,
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
      width: 90,
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
        style={{ marginBottom: 16 }}
        items={[
          { title: '输入原文', status: stepStatus.text ? 'finish' : 'process' },
          { title: '获取音频', status: stepStatus.audio ? 'finish' : stepStatus.text ? 'process' : 'wait' },
          {
            title: '字幕打轴',
            status: stepStatus.align ? 'finish' : stepStatus.audio ? 'process' : 'wait',
          },
        ]}
      />

      <Form.Item label="speech 原文（整段）" required>
        <TextArea
          rows={5}
          value={sourceText}
          onChange={(e) => {
            setSourceText(e.target.value)
            // 持久化含标点的原文，避免打轴后从无标点的 subtitles 反推导致标点丢失
            onChange({ ...value, source_text: e.target.value })
          }}
          placeholder="输入完整讲解稿，将作为 TTS 输入与打轴对照文本"
        />
      </Form.Item>

      <Divider style={{ margin: '12px 0' }} />

      <Form.Item label="audio">
        <MediaOssUploadField
          value={value.audio}
          onChange={(url) => onChange({ ...value, audio: url })}
          accept="audio/*"
          mediaLabel="音频"
        />
      </Form.Item>
      <Space wrap style={{ marginBottom: 12 }}>
        <Input
          size="small"
          placeholder={`Minimax voice_id（默认 ${DEFAULT_MINIMAX_VOICE_ID}）`}
          value={voiceId}
          onChange={(e) => setVoiceId(e.target.value)}
          style={{ width: 200 }}
        />
        <Button size="small" loading={ttsLoading} onClick={() => void runTts()}>
          Minimax TTS 生成音频
        </Button>
        <Button
          size="small"
          loading={previewLoading}
          disabled={!value.audio?.trim()}
          onClick={() => void openAudioPreview()}
        >
          预览音频
        </Button>
        <Checkbox checked={autoAlignAfterTts} onChange={(e) => setAutoAlignAfterTts(e.target.checked)}>
          TTS 后自动打轴
        </Checkbox>
      </Space>

      <Form.Item label="audio_duration (秒)">
        <InputNumber
          min={0}
          step={0.1}
          style={{ width: '100%' }}
          value={value.audio_duration}
          onChange={(v) => onChange({ ...value, audio_duration: v ?? 0 })}
        />
      </Form.Item>

      <Divider style={{ margin: '12px 0' }} />

      <Space wrap style={{ marginBottom: 8 }}>
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
      </Space>
      <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
        打轴使用工具 asr-forced-align：根据原文与音频 URL 生成精确时间轴，生成后可在下表微调。
      </Text>

      <Table
        size="small"
        rowKey={(_, i) => String(i)}
        pagination={false}
        dataSource={value.subtitles}
        columns={columns}
        scroll={{ x: 680 }}
        locale={{ emptyText: '完成打轴后将在此显示字幕时间轴' }}
      />

      <AudioPlayerModal
        open={previewOpen}
        url={previewUrl}
        title="TTS 音频预览"
        onClose={() => setPreviewOpen(false)}
      />
    </Form>
  )
}
