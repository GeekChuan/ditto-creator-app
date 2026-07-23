import { useEffect, useState } from 'react'
import {
  Button,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Radio,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { assetsApi } from '../../../api/assets'
import { toolsApi } from '../../../api/tools'
import type {
  AtbSrcAsset,
  SingleChoiceComponent,
  SingleChoiceReviewVideo,
  SubtitleCue,
} from '../../../types/atbReactionV2'
import { DEFAULT_SINGLE_CHOICE_TITLE } from '../../../types/atbReactionV2'
import MediaOssUploadField from '../MediaOssUploadField'
import SrcIdSelect from '../SrcIdSelect'
import TtsVoiceSelect from './TtsVoiceSelect'
import VideoClipPicker from './VideoClipPicker'
import { mapForcedAlignSegments, resolvePlayableAudioUrl } from '../lib/subtitleAlign'
import { DEFAULT_TTS_VOICE_ID, useTtsVoiceStore } from '../lib/ttsVoiceStore'

const { Text } = Typography
const { TextArea } = Input

interface Props {
  value: SingleChoiceComponent
  src: AtbSrcAsset[]
  onChange: (next: SingleChoiceComponent) => void
}

const DEFAULT_REVIEW_VIDEO: SingleChoiceReviewVideo = {
  source_id: '',
  start_ms: 0,
  end_ms: 0,
  playback_rate: 1,
  autoplay: true,
}

function subtitlesToSourceText(subtitles: SubtitleCue[]): string {
  return subtitles.map((s) => s.text).join(' ').trim()
}

interface FeedbackAudioEditorProps {
  /** 字段名，用于提示信息，如 correct_feedback */
  label: string
  /** 展示名，如 正确反馈 */
  displayName: string
  help: string
  audioUrl: string
  subtitles: SubtitleCue[]
  voiceId: string
  autoAlignAfterTts: boolean
  onChange: (patch: { audioUrl: string; subtitles: SubtitleCue[] }) => void
}

function FeedbackAudioEditor({
  label,
  displayName,
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
  // 详略分层：音频 URL / 字幕表默认收起，仅在需要微调时展开
  const [detailOpen, setDetailOpen] = useState(false)

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
        voice_id: voiceId.trim() || DEFAULT_TTS_VOICE_ID,
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

  const hasAudio = Boolean(audioUrl.trim())
  const status = hasAudio ? (
    subtitles.length ? (
      <Tag color="green" style={{ marginRight: 0 }}>
        音频 ✓ · 字幕 {subtitles.length} 条
      </Tag>
    ) : (
      <Tag color="orange" style={{ marginRight: 0 }}>
        音频 ✓ · 未打轴
      </Tag>
    )
  ) : (
    <Tag style={{ marginRight: 0 }}>未配置</Tag>
  )

  return (
    <div
      style={{
        border: '1px solid #f0f0f0',
        borderRadius: 8,
        padding: '10px 12px',
        marginBottom: 10,
        background: '#fcfcfd',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Text strong style={{ fontSize: 13 }}>
          {displayName}
        </Text>
        <Text type="secondary" style={{ fontSize: 11 }}>
          {label}
        </Text>
        {status}
        <span style={{ flex: 1 }} />
        <Button type="link" size="small" onClick={() => setDetailOpen((v) => !v)}>
          {detailOpen ? '收起详情' : '详细设置'}
        </Button>
      </div>

      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <TextArea
          autoSize={{ minRows: 2, maxRows: 4 }}
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          placeholder={`${help}；输入文案后一键生成`}
          style={{ flex: 1 }}
        />
        <Button
          type="primary"
          size="small"
          loading={ttsLoading || alignLoading}
          disabled={!sourceText.trim()}
          onClick={() => void runTts()}
        >
          {autoAlignAfterTts ? 'TTS 生成 + 打轴' : 'TTS 生成音频'}
        </Button>
      </div>

      {detailOpen ? (
        <div style={{ marginTop: 10 }}>
          <Form.Item label={`${label} audio`} required style={{ marginBottom: 8 }}>
            <MediaOssUploadField
              accept="audio/*"
              value={audioUrl}
              onChange={(url) => onChange({ audioUrl: url, subtitles })}
              mediaLabel="音频"
            />
          </Form.Item>

          <Space wrap style={{ marginBottom: 8 }}>
            <Button
              size="small"
              loading={alignLoading}
              disabled={!sourceText.trim() || !audioUrl.trim()}
              onClick={() => void runForcedAlign(audioUrl, sourceText)}
            >
              重新打轴
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
            <Text type="secondary" style={{ fontSize: 12 }}>
              打轴用 asr-forced-align，生成后可在下表微调。
            </Text>
          </Space>

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
      ) : null}
    </div>
  )
}

export default function SingleChoiceComponentForm({ value, src, onChange }: Props) {
  const options = value.options ?? []
  // 全局音色偏好：选一次所有 TTS 入口共用
  const voiceId = useTtsVoiceStore((s) => s.voiceId)
  const setVoiceId = useTtsVoiceStore((s) => s.setVoiceId)
  const [autoAlignAfterTts, setAutoAlignAfterTts] = useState(true)

  const reviewVideo = value.review_video

  const updateReviewVideo = (patch: Partial<SingleChoiceReviewVideo>) => {
    if (!reviewVideo) return
    onChange({ ...value, review_video: { ...reviewVideo, ...patch } })
  }

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
    // 删除正确答案之前的选项时下标前移，保持指向同一个选项
    let nextCorrectIndex = value.correct_option_index
    if (index < nextCorrectIndex) {
      nextCorrectIndex -= 1
    }
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
      <Form.Item
        label="title"
        help={`题干文案，选填；为空时学员端显示默认文案「${DEFAULT_SINGLE_CHOICE_TITLE}」`}
      >
        <Input
          value={value.title ?? ''}
          onChange={(e) => onChange({ ...value, title: e.target.value })}
          placeholder={DEFAULT_SINGLE_CHOICE_TITLE}
        />
      </Form.Item>

      <Form.Item label="options" required help="至少 2 个选项；勾选「正确」标记正确答案">
        <Space direction="vertical" style={{ width: '100%' }}>
          {options.map((option, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Input
                addonBefore={String.fromCharCode(65 + index)}
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
                style={{ flex: 1 }}
              />
              <Radio
                checked={value.correct_option_index === index}
                onChange={() => onChange({ ...value, correct_option_index: index })}
              >
                正确
              </Radio>
              <Button
                size="small"
                danger
                disabled={options.length <= 2}
                onClick={() => removeOption(index)}
              >
                删除
              </Button>
            </div>
          ))}
          <Button size="small" onClick={addOption}>
            添加选项
          </Button>
        </Space>
      </Form.Item>

      <Space wrap style={{ marginBottom: 16 }}>
        <TtsVoiceSelect value={voiceId} onChange={setVoiceId} style={{ width: 200 }} />
        <Checkbox checked={autoAlignAfterTts} onChange={(e) => setAutoAlignAfterTts(e.target.checked)}>
          TTS 后自动打轴
        </Checkbox>
      </Space>

      <FeedbackAudioEditor
        label="correct_feedback"
        displayName="正确反馈"
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
        displayName="错误反馈"
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

      <div
        style={{
          border: '1px solid #f0f0f0',
          borderRadius: 8,
          padding: '10px 12px',
          background: '#fcfcfd',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text strong style={{ fontSize: 13 }}>
            回看视频
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            review_video · 选填，学员端在题目旁显示「回看视频」半胶囊
          </Text>
          <span style={{ flex: 1 }} />
          <Switch
            size="small"
            checked={Boolean(reviewVideo)}
            checkedChildren="已启用"
            unCheckedChildren="未启用"
            onChange={(enabled) => {
              if (enabled) {
                onChange({ ...value, review_video: { ...DEFAULT_REVIEW_VIDEO } })
              } else {
                const next = { ...value }
                delete next.review_video
                onChange(next)
              }
            }}
          />
        </div>

        {reviewVideo ? (
          <div style={{ marginTop: 10 }}>
            <Form.Item label="source_id" required style={{ marginBottom: 8 }}>
              <SrcIdSelect
                src={src}
                filterType="video"
                value={reviewVideo.source_id}
                onChange={(id) => updateReviewVideo({ source_id: id })}
                placeholder="选择回看的视频资源"
              />
            </Form.Item>
            <Form.Item label="回看片段" required style={{ marginBottom: 8 }}>
              <VideoClipPicker
                src={src}
                sourceId={reviewVideo.source_id}
                startMs={reviewVideo.start_ms}
                endMs={reviewVideo.end_ms}
                playbackRate={reviewVideo.playback_rate ?? 1}
                onChangeRange={(patch) => updateReviewVideo(patch)}
              />
            </Form.Item>
            <div style={{ display: 'flex', gap: 8 }}>
              <Form.Item label="playback_rate" style={{ flex: 1, marginBottom: 4 }}>
                <InputNumber
                  min={0.1}
                  max={3}
                  step={0.1}
                  style={{ width: '100%' }}
                  value={reviewVideo.playback_rate ?? 1}
                  onChange={(v) => updateReviewVideo({ playback_rate: v ?? 1 })}
                />
              </Form.Item>
              <Form.Item label="subtitle_override" style={{ flex: 1, marginBottom: 4 }}>
                <Select
                  allowClear
                  value={reviewVideo.subtitle_override}
                  onChange={(v) => updateReviewVideo({ subtitle_override: v })}
                  options={[
                    { value: 'auto', label: 'auto' },
                    { value: 'on', label: 'on' },
                    { value: 'off', label: 'off' },
                  ]}
                />
              </Form.Item>
            </div>
          </div>
        ) : null}
      </div>
    </Form>
  )
}
