import { useEffect, useState } from 'react'
import {
  Button,
  Checkbox,
  Divider,
  Form,
  Input,
  InputNumber,
  Space,
  Table,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { assetsApi } from '../../../api/assets'
import { toolsApi } from '../../../api/tools'
import type { SingleChoiceComponent, SubtitleCue } from '../../../types/atbReactionV2'
import MediaOssUploadField from '../MediaOssUploadField'
import { mapForcedAlignSegments, resolvePlayableAudioUrl } from '../lib/subtitleAlign'

const { Text } = Typography
const { TextArea } = Input

/** Minimax 音色 ID 区分大小写，与 speech 组件一致 */
const DEFAULT_MINIMAX_VOICE_ID = 'ZxueliLLS'

interface Props {
  value: SingleChoiceComponent
  onChange: (next: SingleChoiceComponent) => void
}

function subtitlesToSourceText(subtitles: SubtitleCue[]): string {
  return subtitles.map((s) => s.text).join(' ').trim()
}

interface FeedbackAudioEditorProps {
  label: string
  help: string
  audioUrl: string
  subtitles: SubtitleCue[]
  voiceId: string
  autoAlignAfterTts: boolean
  onChange: (patch: { audioUrl: string; subtitles: SubtitleCue[] }) => void
}

function FeedbackAudioEditor({
  label,
  help,
  audioUrl,
  subtitles,
  voiceId,
  autoAlignAfterTts,
  onChange,
}: FeedbackAudioEditorProps) {
  const [sourceText, setSourceText] = useState(() => subtitlesToSourceText(subtitles))
  const [ttsLoading, setTtsLoading] = useState(false)
  const [alignLoading, setAlignLoading] = useState(false)

  useEffect(() => {
    if (!sourceText.trim() && subtitles.length) {
      setSourceText(subtitlesToSourceText(subtitles))
    }
  }, [subtitles, sourceText])

  const updateSubtitle = (index: number, patch: Partial<SubtitleCue>) => {
    onChange({
      audioUrl,
      subtitles: subtitles.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    })
  }

  const runForcedAlign = async (nextAudioUrl: string, text: string) => {
    const script = text.trim()
    if (!script) {
      message.warning(`请先输入${label}原文`)
      return
    }
    if (!nextAudioUrl.trim()) {
      message.warning(`请先通过 TTS 生成或填写${label}音频 URL`)
      return
    }

    setAlignLoading(true)
    try {
      const playableUrl = await resolvePlayableAudioUrl(nextAudioUrl)
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
      const nextSubtitles = mapForcedAlignSegments(segments)
      if (!nextSubtitles.length) {
        throw new Error('打轴结果为空，请检查原文与音频是否匹配')
      }
      onChange({ audioUrl: nextAudioUrl, subtitles: nextSubtitles })
      message.success(`${label}已生成 ${nextSubtitles.length} 条字幕时间轴`)
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '字幕打轴失败')
    } finally {
      setAlignLoading(false)
    }
  }

  const runTts = async () => {
    const text = sourceText.trim()
    if (!text) {
      message.warning(`请先输入${label}原文`)
      return
    }
    setTtsLoading(true)
    try {
      const res = await assetsApi.minimaxTts({
        text,
        voice_id: voiceId.trim() || DEFAULT_MINIMAX_VOICE_ID,
      })
      onChange({ audioUrl: res.audio_url, subtitles })
      message.success(`${label} TTS 音频已生成`)
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
          value={subtitles[index]?.start_ms}
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
          value={subtitles[index]?.end_ms}
          onChange={(v) => updateSubtitle(index, { end_ms: v ?? 0 })}
        />
      ),
    },
    {
      title: 'text',
      render: (_, __, index) => (
        <Input
          size="small"
          value={subtitles[index]?.text}
          onChange={(e) => updateSubtitle(index, { text: e.target.value })}
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
              audioUrl,
              subtitles: subtitles.filter((_, i) => i !== index),
            })
          }
        >
          删
        </Button>
      ),
    },
  ]

  return (
    <div style={{ marginBottom: 24 }}>
      <Divider style={{ margin: '12px 0' }}>{label}</Divider>

      <Form.Item label={`${label} 原文`} required help={help}>
        <TextArea
          rows={3}
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          placeholder="输入完整反馈文案，将作为 TTS 输入与打轴对照文本"
        />
      </Form.Item>

      <Form.Item label={`${label} audio`} required>
        <MediaOssUploadField
          accept="audio/*"
          value={audioUrl}
          onChange={(url) => onChange({ audioUrl: url, subtitles })}
          mediaLabel="音频"
        />
      </Form.Item>

      <Space wrap style={{ marginBottom: 12 }}>
        <Button size="small" loading={ttsLoading} onClick={() => void runTts()}>
          Minimax TTS 生成音频
        </Button>
        <Button
          type="primary"
          size="small"
          loading={alignLoading}
          disabled={!sourceText.trim() || !audioUrl.trim()}
          onClick={() => void runForcedAlign(audioUrl, sourceText)}
        >
          火山引擎字幕打轴
        </Button>
        <Button
          size="small"
          onClick={() =>
            onChange({
              audioUrl,
              subtitles: [...subtitles, { start_ms: 0, end_ms: 2000, text: '' }],
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
        dataSource={subtitles}
        columns={columns}
        scroll={{ x: 420 }}
        locale={{ emptyText: '完成打轴后将在此显示字幕时间轴' }}
      />
    </div>
  )
}

export default function SingleChoiceComponentForm({ value, onChange }: Props) {
  const options = value.options ?? []
  const [voiceId, setVoiceId] = useState(DEFAULT_MINIMAX_VOICE_ID)
  const [autoAlignAfterTts, setAutoAlignAfterTts] = useState(true)

  const updateOption = (index: number, text: string) => {
    onChange({
      ...value,
      options: options.map((option, i) => (i === index ? text : option)),
    })
  }

  const addOption = () => {
    onChange({
      ...value,
      options: [...options, ''],
    })
  }

  const removeOption = (index: number) => {
    const nextOptions = options.filter((_, i) => i !== index)
    let nextCorrectIndex = value.correct_option_index
    if (nextCorrectIndex >= nextOptions.length) {
      nextCorrectIndex = Math.max(0, nextOptions.length - 1)
    }
    onChange({
      ...value,
      options: nextOptions,
      correct_option_index: nextCorrectIndex,
    })
  }

  return (
    <Form layout="vertical" size="small">
      <Form.Item label="options" required help="至少 2 个选项">
        <Space direction="vertical" style={{ width: '100%' }}>
          {options.map((option, index) => (
            <Space key={index} style={{ width: '100%' }}>
              <Input
                addonBefore={String.fromCharCode(65 + index)}
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
              />
              <Button
                size="small"
                danger
                disabled={options.length <= 2}
                onClick={() => removeOption(index)}
              >
                删除
              </Button>
            </Space>
          ))}
          <Button size="small" onClick={addOption}>
            添加选项
          </Button>
        </Space>
      </Form.Item>

      <Form.Item label="correct_option_index" required help="正确答案在 options 中的下标，从 0 开始">
        <InputNumber
          min={0}
          max={Math.max(0, options.length - 1)}
          style={{ width: '100%' }}
          value={value.correct_option_index}
          onChange={(v) => onChange({ ...value, correct_option_index: v ?? 0 })}
        />
      </Form.Item>

      <Space wrap style={{ marginBottom: 16 }}>
        <Input
          size="small"
          placeholder={`Minimax voice_id（默认 ${DEFAULT_MINIMAX_VOICE_ID}）`}
          value={voiceId}
          onChange={(e) => setVoiceId(e.target.value)}
          style={{ width: 220 }}
        />
        <Checkbox checked={autoAlignAfterTts} onChange={(e) => setAutoAlignAfterTts(e.target.checked)}>
          TTS 后自动打轴
        </Checkbox>
      </Space>

      <FeedbackAudioEditor
        label="correct_feedback"
        help="选对后播放的鼓励语音"
        audioUrl={value.correct_feedback_audio}
        subtitles={value.correct_feedback_subtitles ?? []}
        voiceId={voiceId}
        autoAlignAfterTts={autoAlignAfterTts}
        onChange={({ audioUrl, subtitles }) =>
          onChange({
            ...value,
            correct_feedback_audio: audioUrl,
            correct_feedback_subtitles: subtitles,
          })
        }
      />

      <FeedbackAudioEditor
        label="incorrect_feedback"
        help="选错后播放的提示语音"
        audioUrl={value.incorrect_feedback_audio}
        subtitles={value.incorrect_feedback_subtitles ?? []}
        voiceId={voiceId}
        autoAlignAfterTts={autoAlignAfterTts}
        onChange={({ audioUrl, subtitles }) =>
          onChange({
            ...value,
            incorrect_feedback_audio: audioUrl,
            incorrect_feedback_subtitles: subtitles,
          })
        }
      />
    </Form>
  )
}
