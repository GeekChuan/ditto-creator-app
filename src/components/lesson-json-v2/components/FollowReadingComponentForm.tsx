import { useState } from 'react'
import { Button, Form, Input, Space, Tag, Typography, message } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import type {
  FollowReadingComponent,
  FollowReadingPositiveFeedbackAudio,
} from '../../../types/atbReactionV2'
import {
  DEFAULT_FOLLOW_READING_INSTRUCTION_HINT,
  DEFAULT_FOLLOW_READING_INSTRUCTION_PRIMARY,
} from '../../../types/atbReactionV2'
import { assetsApi } from '../../../api/assets'
import MediaOssUploadField from '../MediaOssUploadField'
import TtsVoiceSelect from './TtsVoiceSelect'
import { DEFAULT_TTS_VOICE_ID, useTtsVoiceStore } from '../lib/ttsVoiceStore'

const { Text } = Typography

interface Props {
  value: FollowReadingComponent
  onChange: (next: FollowReadingComponent) => void
}

function ttsErrorMessage(e: unknown): string {
  const err = e as { response?: { data?: { detail?: string } } }
  const detail = err?.response?.data?.detail
  return typeof detail === 'string' ? detail : 'TTS 生成失败'
}

interface FeedbackRowProps {
  index: number
  item: FollowReadingPositiveFeedbackAudio
  voiceId: string
  showDetail: boolean
  onUpdate: (patch: Partial<FollowReadingPositiveFeedbackAudio>) => void
  onRemove: () => void
}

function FeedbackRow({ index, item, voiceId, showDetail, onUpdate, onRemove }: FeedbackRowProps) {
  const [ttsLoading, setTtsLoading] = useState(false)

  const runTts = async () => {
    const text = item.text_en.trim()
    if (!text) {
      message.warning(`请先输入反馈 #${index + 1} 的英文文案`)
      return
    }
    setTtsLoading(true)
    try {
      const res = await assetsApi.minimaxTts({
        text,
        voice_id: voiceId.trim() || DEFAULT_TTS_VOICE_ID,
      })
      onUpdate({ audio_url: res.audio_url })
      message.success(`反馈 #${index + 1} TTS 音频已生成`)
    } catch (e: unknown) {
      message.error(ttsErrorMessage(e))
    } finally {
      setTtsLoading(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Text type="secondary" style={{ fontSize: 12, width: 16, textAlign: 'right' }}>
          {index + 1}
        </Text>
        <Input
          size="small"
          value={item.text_en}
          placeholder="英文反馈文案，如 Great job!"
          onChange={(e) => onUpdate({ text_en: e.target.value })}
          style={{ flex: 1 }}
        />
        {item.audio_url.trim() ? (
          <Tag color="green" style={{ marginRight: 0 }}>
            音频 ✓
          </Tag>
        ) : (
          <Tag style={{ marginRight: 0 }}>无音频</Tag>
        )}
        <Button size="small" loading={ttsLoading} disabled={!item.text_en.trim()} onClick={() => void runTts()}>
          TTS
        </Button>
        <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={onRemove} />
      </div>
      {showDetail ? (
        <div style={{ margin: '6px 0 8px 22px' }}>
          <MediaOssUploadField
            accept="audio/*"
            value={item.audio_url}
            onChange={(url) => onUpdate({ audio_url: url })}
            mediaLabel="音频"
          />
        </div>
      ) : null}
    </div>
  )
}

export default function FollowReadingComponentForm({ value, onChange }: Props) {
  const feedbacks = value.positive_feedback_audios ?? []
  // 全局音色偏好：选一次所有 TTS 入口共用
  const voiceId = useTtsVoiceStore((s) => s.voiceId)
  const setVoiceId = useTtsVoiceStore((s) => s.setVoiceId)
  const [referenceTtsLoading, setReferenceTtsLoading] = useState(false)
  const [batchTtsLoading, setBatchTtsLoading] = useState(false)
  // 详略分层：音频 URL / 指令文案 / 评测语言默认收起
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const resolveVoiceId = () => voiceId.trim() || DEFAULT_TTS_VOICE_ID

  const updateFeedback = (index: number, patch: Partial<FollowReadingPositiveFeedbackAudio>) => {
    onChange({
      ...value,
      positive_feedback_audios: feedbacks.map((item, i) =>
        i === index ? { ...item, ...patch } : item,
      ),
    })
  }

  const addFeedback = () => {
    onChange({
      ...value,
      positive_feedback_audios: [...feedbacks, { text_en: '', audio_url: '' }],
    })
  }

  const removeFeedback = (index: number) => {
    onChange({
      ...value,
      positive_feedback_audios: feedbacks.filter((_, i) => i !== index),
    })
  }

  const runReferenceTts = async () => {
    const text = value.text_en.trim()
    if (!text) {
      message.warning('请先填写 text_en，将作为原音 TTS 输入')
      return
    }
    setReferenceTtsLoading(true)
    try {
      const res = await assetsApi.minimaxTts({ text, voice_id: resolveVoiceId() })
      onChange({ ...value, reference_audio: res.audio_url })
      message.success('原音 reference_audio TTS 已生成')
    } catch (e: unknown) {
      message.error(ttsErrorMessage(e))
    } finally {
      setReferenceTtsLoading(false)
    }
  }

  /** 只补有文案但缺音频的反馈条，已生成的不重复跑 */
  const runBatchTts = async () => {
    const pendingIndexes = feedbacks
      .map((item, i) => ({ item, i }))
      .filter(({ item }) => item.text_en.trim() && !item.audio_url.trim())
      .map(({ i }) => i)
    if (!pendingIndexes.length) {
      message.info('没有缺音频的反馈条（文案为空的请先填写）')
      return
    }
    setBatchTtsLoading(true)
    try {
      const nextFeedbacks = [...feedbacks]
      for (const i of pendingIndexes) {
        const res = await assetsApi.minimaxTts({
          text: nextFeedbacks[i].text_en.trim(),
          voice_id: resolveVoiceId(),
        })
        nextFeedbacks[i] = { ...nextFeedbacks[i], audio_url: res.audio_url }
      }
      onChange({ ...value, positive_feedback_audios: nextFeedbacks })
      message.success(`已补全 ${pendingIndexes.length} 条反馈音频`)
    } catch (e: unknown) {
      message.error(ttsErrorMessage(e))
    } finally {
      setBatchTtsLoading(false)
    }
  }

  const hasReference = Boolean(value.reference_audio?.trim())
  const missingFeedbackAudio = feedbacks.filter(
    (f) => f.text_en.trim() && !f.audio_url.trim(),
  ).length

  return (
    <Form layout="vertical" size="small">
      <Form.Item label="text_en（跟读句子）" required style={{ marginBottom: 8 }}>
        <Input.TextArea
          autoSize={{ minRows: 2, maxRows: 4 }}
          value={value.text_en}
          placeholder="学员要跟读的英文句子，也作为原音 TTS 输入"
          onChange={(e) => onChange({ ...value, text_en: e.target.value })}
        />
      </Form.Item>
      <Form.Item label="text_zh（中文释义，选填）" style={{ marginBottom: 8 }}>
        <Input.TextArea
          autoSize={{ minRows: 1, maxRows: 3 }}
          value={value.text_zh ?? ''}
          onChange={(e) => onChange({ ...value, text_zh: e.target.value })}
        />
      </Form.Item>

      {/* 原音：常显状态 + 一键生成，上传/URL 收进高级设置 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Text strong style={{ fontSize: 13 }}>
          原音
        </Text>
        {hasReference ? (
          <Tag color="green" style={{ marginRight: 0 }}>
            已配置
          </Tag>
        ) : (
          <Tag color="orange" style={{ marginRight: 0 }}>
            未配置
          </Tag>
        )}
        <TtsVoiceSelect value={voiceId} onChange={setVoiceId} style={{ width: 150 }} />
        <Button
          type="primary"
          size="small"
          loading={referenceTtsLoading}
          disabled={!value.text_en.trim()}
          onClick={() => void runReferenceTts()}
        >
          用 text_en 生成原音
        </Button>
      </div>

      {/* 高分反馈：单行列表 + 一键补全缺失 */}
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
            高分反馈语音
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            建议 3 条，学员读得好时随机播放
          </Text>
          <span style={{ flex: 1 }} />
          <Button
            size="small"
            loading={batchTtsLoading}
            disabled={!missingFeedbackAudio}
            onClick={() => void runBatchTts()}
          >
            TTS 补全缺失（{missingFeedbackAudio}）
          </Button>
          <Button size="small" icon={<PlusOutlined />} onClick={addFeedback}>
            添加
          </Button>
        </div>
        <Space direction="vertical" size={6} style={{ width: '100%' }}>
          {feedbacks.length === 0 ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              还没有反馈条，点右上「添加」，填英文文案后点行内 TTS 或一键补全。
            </Text>
          ) : (
            feedbacks.map((item, index) => (
              <FeedbackRow
                key={index}
                index={index}
                item={item}
                voiceId={voiceId}
                showDetail={advancedOpen}
                onUpdate={(patch) => updateFeedback(index, patch)}
                onRemove={() => removeFeedback(index)}
              />
            ))
          )}
        </Space>
      </div>

      <Button type="link" size="small" style={{ paddingLeft: 0 }} onClick={() => setAdvancedOpen((v) => !v)}>
        {advancedOpen ? '收起高级设置' : '高级设置（指令文案 / 音频 URL / 评测语言）'}
      </Button>

      {advancedOpen ? (
        <div style={{ marginTop: 8 }}>
          <Form.Item
            label="instruction_primary"
            help={`默认：${DEFAULT_FOLLOW_READING_INSTRUCTION_PRIMARY}`}
            style={{ marginBottom: 8 }}
          >
            <Input
              value={value.instruction_primary ?? ''}
              placeholder={DEFAULT_FOLLOW_READING_INSTRUCTION_PRIMARY}
              onChange={(e) => onChange({ ...value, instruction_primary: e.target.value })}
            />
          </Form.Item>
          <Form.Item
            label="instruction_hint"
            help={`默认：${DEFAULT_FOLLOW_READING_INSTRUCTION_HINT}`}
            style={{ marginBottom: 8 }}
          >
            <Input
              value={value.instruction_hint ?? ''}
              placeholder={DEFAULT_FOLLOW_READING_INSTRUCTION_HINT}
              onChange={(e) => onChange({ ...value, instruction_hint: e.target.value })}
            />
          </Form.Item>
          <Form.Item label="language" help="讯飞评测语言，默认 en_us" style={{ marginBottom: 8 }}>
            <Input
              value={value.language ?? 'en_us'}
              onChange={(e) => onChange({ ...value, language: e.target.value })}
            />
          </Form.Item>
          <Form.Item label="reference_audio（原音 URL / 上传）" style={{ marginBottom: 8 }}>
            <MediaOssUploadField
              accept="audio/*"
              value={value.reference_audio}
              onChange={(url) => onChange({ ...value, reference_audio: url })}
              mediaLabel="音频"
            />
          </Form.Item>
        </div>
      ) : null}
    </Form>
  )
}
