import { Button, Form, Input, Space } from 'antd'
import type {
  FollowReadingComponent,
  FollowReadingPositiveFeedbackAudio,
} from '../../../types/atbReactionV2'
import {
  DEFAULT_FOLLOW_READING_INSTRUCTION_HINT,
  DEFAULT_FOLLOW_READING_INSTRUCTION_PRIMARY,
} from '../../../types/atbReactionV2'
import MediaOssUploadField from '../MediaOssUploadField'

interface Props {
  value: FollowReadingComponent
  onChange: (next: FollowReadingComponent) => void
}

export default function FollowReadingComponentForm({ value, onChange }: Props) {
  const feedbacks = value.positive_feedback_audios ?? []

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
      <Form.Item label="reference_audio" required help="原音参考朗读音频">
        <MediaOssUploadField
          accept="audio/*"
          value={value.reference_audio}
          onChange={(url) => onChange({ ...value, reference_audio: url })}
        />
      </Form.Item>
      <Form.Item label="positive_feedback_audios" help="高分时随机播放，建议配置 3 条">
        <Space direction="vertical" style={{ width: '100%' }}>
          {feedbacks.map((item, index) => (
            <div
              key={index}
              style={{
                border: '1px solid #f0f0f0',
                borderRadius: 8,
                padding: 8,
              }}
            >
              <Form.Item label={`text_en #${index + 1}`} style={{ marginBottom: 8 }}>
                <Input
                  value={item.text_en}
                  onChange={(e) => updateFeedback(index, { text_en: e.target.value })}
                />
              </Form.Item>
              <Form.Item label="audio_url" style={{ marginBottom: 0 }}>
                <MediaOssUploadField
                  accept="audio/*"
                  value={item.audio_url}
                  onChange={(url) => updateFeedback(index, { audio_url: url })}
                />
              </Form.Item>
            </div>
          ))}
          <Button size="small" onClick={addFeedback}>
            添加反馈音频
          </Button>
        </Space>
      </Form.Item>
    </Form>
  )
}
