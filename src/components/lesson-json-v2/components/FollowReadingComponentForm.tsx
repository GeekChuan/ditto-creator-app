import { useState } from 'react'
import { Button, Form, Input, Space, message } from 'antd'
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

/** Minimax 音色 ID 区分大小写 */
const DEFAULT_MINIMAX_VOICE_ID = 'DittoEva01'

interface Props {
  value: FollowReadingComponent
  onChange: (next: FollowReadingComponent) => void
}

interface PositiveFeedbackAudioItemProps {
  index: number
  item: FollowReadingPositiveFeedbackAudio
  voiceId: string
  onUpdate: (patch: Partial<FollowReadingPositiveFeedbackAudio>) => void
}

function PositiveFeedbackAudioItem({
  index,
  item,
  voiceId,
  onUpdate,
}: PositiveFeedbackAudioItemProps) {
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
        voice_id: voiceId.trim() || DEFAULT_MINIMAX_VOICE_ID,
      })
      onUpdate({ audio_url: res.audio_url })
      message.success(`反馈 #${index + 1} TTS 音频已生成`)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      const detail = err?.response?.data?.detail
      message.error(typeof detail === 'string' ? detail : 'TTS 生成失败')
    } finally {
      setTtsLoading(false)
    }
  }

  return (
    <div
      style={{
        border: '1px solid #f0f0f0',
        borderRadius: 8,
        padding: 8,
      }}
    >
      <Form.Item label={`text_en #${index + 1}`} style={{ marginBottom: 8 }}>
        <Input
          value={item.text_en}
          onChange={(e) => onUpdate({ text_en: e.target.value })}
        />
      </Form.Item>
      <Form.Item label="audio_url" style={{ marginBottom: 8 }}>
        <MediaOssUploadField
          accept="audio/*"
          value={item.audio_url}
          onChange={(url) => onUpdate({ audio_url: url })}
          mediaLabel="音频"
        />
      </Form.Item>
      <Button size="small" loading={ttsLoading} onClick={() => void runTts()}>
        Minimax TTS 生成音频
      </Button>
    </div>
  )
}

export default function FollowReadingComponentForm({ value, onChange }: Props) {
  const feedbacks = value.positive_feedback_audios ?? []
  const [voiceId, setVoiceId] = useState(DEFAULT_MINIMAX_VOICE_ID)
  const [referenceTtsLoading, setReferenceTtsLoading] = useState(false)
  const [batchTtsLoading, setBatchTtsLoading] = useState(false)

  const resolveVoiceId = () => voiceId.trim() || DEFAULT_MINIMAX_VOICE_ID

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
      positive_feedback_audios: [
        ...feedbacks,
        { text_en: '', audio_url: '' },
      ],
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
      const res = await assetsApi.minimaxTts({
        text,
        voice_id: resolveVoiceId(),
      })
      onChange({ ...value, reference_audio: res.audio_url })
      message.success('原音 reference_audio TTS 已生成')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      const detail = err?.response?.data?.detail
      message.error(typeof detail === 'string' ? detail : 'TTS 生成失败')
    } finally {
      setReferenceTtsLoading(false)
    }
  }

  const runBatchTts = async () => {
    const pending = feedbacks.filter((item) => item.text_en.trim())
    if (!pending.length) {
      message.warning('请先填写至少一条反馈英文文案')
      return
    }
    setBatchTtsLoading(true)
    try {
      const nextFeedbacks = [...feedbacks]
      let generated = 0
      for (let i = 0; i < nextFeedbacks.length; i++) {
        const text = nextFeedbacks[i].text_en.trim()
        if (!text) continue
        const res = await assetsApi.minimaxTts({
          text,
          voice_id: resolveVoiceId(),
        })
        nextFeedbacks[i] = { ...nextFeedbacks[i], audio_url: res.audio_url }
        generated += 1
      }
      onChange({ ...value, positive_feedback_audios: nextFeedbacks })
      message.success(`已生成 ${generated} 条反馈音频`)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      const detail = err?.response?.data?.detail
      message.error(typeof detail === 'string' ? detail : 'TTS 生成失败')
    } finally {
      setBatchTtsLoading(false)
    }
  }

  return (
    <Form layout="vertical" size="small">
      <Form.Item label="instruction_primary" help={`默认：${DEFAULT_FOLLOW_READING_INSTRUCTION_PRIMARY}`}>
        <Input
          value={value.instruction_primary ?? ''}
          placeholder={DEFAULT_FOLLOW_READING_INSTRUCTION_PRIMARY}
          onChange={(e) => onChange({ ...value, instruction_primary: e.target.value })}
        />
      </Form.Item>
      <Form.Item label="instruction_hint" help={`默认：${DEFAULT_FOLLOW_READING_INSTRUCTION_HINT}`}>
        <Input
          value={value.instruction_hint ?? ''}
          placeholder={DEFAULT_FOLLOW_READING_INSTRUCTION_HINT}
          onChange={(e) => onChange({ ...value, instruction_hint: e.target.value })}
        />
      </Form.Item>
      <Form.Item label="text_en" required>
        <Input.TextArea
          rows={2}
          value={value.text_en}
          onChange={(e) => onChange({ ...value, text_en: e.target.value })}
        />
      </Form.Item>
      <Form.Item label="text_zh">
        <Input.TextArea
          rows={2}
          value={value.text_zh ?? ''}
          onChange={(e) => onChange({ ...value, text_zh: e.target.value })}
        />
      </Form.Item>
      <Form.Item label="language" help="讯飞评测语言，默认 en_us">
        <Input
          value={value.language ?? 'en_us'}
          onChange={(e) => onChange({ ...value, language: e.target.value })}
        />
      </Form.Item>
      <Form.Item label="Minimax voice_id" help={`原音与反馈音频共用，默认 ${DEFAULT_MINIMAX_VOICE_ID}`}>
        <Input
          size="small"
          placeholder={DEFAULT_MINIMAX_VOICE_ID}
          value={voiceId}
          onChange={(e) => setVoiceId(e.target.value)}
        />
      </Form.Item>
      <Form.Item label="reference_audio" required help="原音参考朗读音频，可用 text_en 生成 TTS">
        <Space direction="vertical" style={{ width: '100%' }}>
          <MediaOssUploadField
            accept="audio/*"
            value={value.reference_audio}
            onChange={(url) => onChange({ ...value, reference_audio: url })}
            mediaLabel="音频"
          />
          <Button
            size="small"
            loading={referenceTtsLoading}
            disabled={!value.text_en.trim()}
            onClick={() => void runReferenceTts()}
          >
            Minimax TTS 生成原音
          </Button>
        </Space>
      </Form.Item>
      <Form.Item label="positive_feedback_audios" help="高分时随机播放，建议配置 3 条">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button
            size="small"
            loading={batchTtsLoading}
            disabled={!feedbacks.some((item) => item.text_en.trim())}
            onClick={() => void runBatchTts()}
          >
            全部 TTS 生成
          </Button>
          {feedbacks.map((item, index) => (
            <PositiveFeedbackAudioItem
              key={index}
              index={index}
              item={item}
              voiceId={voiceId}
              onUpdate={(patch) => updateFeedback(index, patch)}
            />
          ))}
          <Button size="small" onClick={addFeedback}>
            添加反馈音频
          </Button>
        </Space>
      </Form.Item>
    </Form>
  )
}
