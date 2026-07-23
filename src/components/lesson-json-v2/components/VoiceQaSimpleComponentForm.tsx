import { Button, Form, Input, InputNumber, Space } from 'antd'
import type { VoiceQaSimpleComponent } from '../../../types/atbReactionV2'
import {
  DEFAULT_VOICE_QA_INSTRUCTION_HINT,
  DEFAULT_VOICE_QA_INSTRUCTION_PRIMARY,
  DEFAULT_VOICE_QA_MAX_ATTEMPTS,
} from '../../../types/atbReactionV2'
import TtsVoiceSelect from './TtsVoiceSelect'

interface Props {
  value: VoiceQaSimpleComponent
  onChange: (next: VoiceQaSimpleComponent) => void
}

export default function VoiceQaSimpleComponentForm({ value, onChange }: Props) {
  const rubricLines = value.rubric_lines ?? []

  const updateRubricLine = (index: number, text: string) => {
    onChange({
      ...value,
      rubric_lines: rubricLines.map((line, i) => (i === index ? text : line)),
    })
  }

  return (
    <Form layout="vertical" size="small">
      <Form.Item label="instruction_primary" help={`默认：${DEFAULT_VOICE_QA_INSTRUCTION_PRIMARY}`}>
        <Input
          value={value.instruction_primary ?? ''}
          placeholder={DEFAULT_VOICE_QA_INSTRUCTION_PRIMARY}
          onChange={(e) => onChange({ ...value, instruction_primary: e.target.value })}
        />
      </Form.Item>
      <Form.Item label="instruction_hint" help={`默认：${DEFAULT_VOICE_QA_INSTRUCTION_HINT}`}>
        <Input
          value={value.instruction_hint ?? ''}
          placeholder={DEFAULT_VOICE_QA_INSTRUCTION_HINT}
          onChange={(e) => onChange({ ...value, instruction_hint: e.target.value })}
        />
      </Form.Item>
      <Form.Item
        label="hint_markdown"
        required
        help="白板 Markdown 提示，支持 **加粗**、*斜体*、行内 `code`"
      >
        <Input.TextArea
          rows={4}
          value={value.hint_markdown}
          onChange={(e) => onChange({ ...value, hint_markdown: e.target.value })}
        />
      </Form.Item>
      <Form.Item label="question_en" required>
        <Input.TextArea
          rows={2}
          value={value.question_en}
          onChange={(e) => onChange({ ...value, question_en: e.target.value })}
        />
      </Form.Item>
      <Form.Item label="question_zh">
        <Input.TextArea
          rows={2}
          value={value.question_zh ?? ''}
          onChange={(e) => onChange({ ...value, question_zh: e.target.value })}
        />
      </Form.Item>
      <Form.Item label="teaching_objective" required help="教学目标，供 LLM 判题与反馈参考">
        <Input.TextArea
          rows={2}
          value={value.teaching_objective}
          onChange={(e) => onChange({ ...value, teaching_objective: e.target.value })}
        />
      </Form.Item>
      <Form.Item label="rubric_lines" help="可接受答案要点 / 判题逻辑，供 LLM 参考">
        {rubricLines.map((line, index) => (
          <Space key={index} style={{ display: 'flex', marginBottom: 8 }} align="start">
            <Input
              style={{ flex: 1 }}
              value={line}
              onChange={(e) => updateRubricLine(index, e.target.value)}
            />
            <Button
              danger
              size="small"
              onClick={() =>
                onChange({
                  ...value,
                  rubric_lines: rubricLines.filter((_, i) => i !== index),
                })
              }
            >
              删除
            </Button>
          </Space>
        ))}
        <Button
          size="small"
          onClick={() => onChange({ ...value, rubric_lines: [...rubricLines, ''] })}
        >
          添加要点
        </Button>
      </Form.Item>
      <Form.Item label="standard_answer" required>
        <Input.TextArea
          rows={2}
          value={value.standard_answer}
          onChange={(e) => onChange({ ...value, standard_answer: e.target.value })}
        />
      </Form.Item>
      <Form.Item label="standard_answer_zh">
        <Input.TextArea
          rows={2}
          value={value.standard_answer_zh ?? ''}
          onChange={(e) => onChange({ ...value, standard_answer_zh: e.target.value })}
        />
      </Form.Item>
      <Form.Item
        label="max_attempts"
        help={`学生最大作答轮次，默认 ${DEFAULT_VOICE_QA_MAX_ATTEMPTS}；达到上限后 AI 收尾一句结束本节点`}
      >
        <InputNumber
          min={1}
          max={10}
          value={value.max_attempts ?? DEFAULT_VOICE_QA_MAX_ATTEMPTS}
          onChange={(n) =>
            onChange({
              ...value,
              max_attempts: typeof n === 'number' ? n : DEFAULT_VOICE_QA_MAX_ATTEMPTS,
            })
          }
        />
      </Form.Item>
      <Form.Item label="asr_language" help="火山 ASR 语言，默认 en-US">
        <Input
          value={value.asr_language ?? 'en-US'}
          onChange={(e) => onChange({ ...value, asr_language: e.target.value })}
        />
      </Form.Item>
      <Form.Item label="tts_voice_id" help="AI 反馈 TTS 音色">
        <TtsVoiceSelect
          size="middle"
          value={value.tts_voice_id ?? 'ZxueliLLS'}
          onChange={(v) => onChange({ ...value, tts_voice_id: v })}
          style={{ width: '100%' }}
        />
      </Form.Item>
    </Form>
  )
}
