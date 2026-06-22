import { Button, Form, Input, InputNumber, Space } from 'antd'
import type { GuidedSpeakingComponent } from '../../../types/atbReactionV2'
import {
  DEFAULT_GUIDED_SPEAKING_INSTRUCTION_PRIMARY,
  DEFAULT_GUIDED_SPEAKING_MAX_ROUNDS,
} from '../../../types/atbReactionV2'

interface Props {
  value: GuidedSpeakingComponent
  onChange: (next: GuidedSpeakingComponent) => void
}

export default function GuidedSpeakingComponentForm({ value, onChange }: Props) {
  const goals = value.expression_goals ?? []

  const updateGoal = (index: number, text: string) => {
    onChange({
      ...value,
      expression_goals: goals.map((line, i) => (i === index ? text : line)),
    })
  }

  return (
    <Form layout="vertical" size="small">
      <Form.Item label="instruction_primary" help={`默认：${DEFAULT_GUIDED_SPEAKING_INSTRUCTION_PRIMARY}`}>
        <Input
          value={value.instruction_primary ?? ''}
          placeholder={DEFAULT_GUIDED_SPEAKING_INSTRUCTION_PRIMARY}
          onChange={(e) => onChange({ ...value, instruction_primary: e.target.value })}
        />
      </Form.Item>
      <Form.Item label="task_description" required help="学员可见任务描述">
        <Input.TextArea
          rows={3}
          value={value.task_description}
          onChange={(e) => onChange({ ...value, task_description: e.target.value })}
        />
      </Form.Item>
      <Form.Item label="expression_goals" required help="表达目标 checklist，至少 1 条">
        {goals.map((line, index) => (
          <Space key={index} style={{ display: 'flex', marginBottom: 8 }} align="start">
            <Input
              style={{ flex: 1 }}
              value={line}
              onChange={(e) => updateGoal(index, e.target.value)}
            />
            <Button
              danger
              size="small"
              onClick={() =>
                onChange({
                  ...value,
                  expression_goals: goals.filter((_, i) => i !== index),
                })
              }
            >
              删除
            </Button>
          </Space>
        ))}
        <Button
          size="small"
          onClick={() => onChange({ ...value, expression_goals: [...goals, ''] })}
        >
          添加目标
        </Button>
      </Form.Item>
      <Form.Item label="initial_hint_markdown" help="首轮语料提示 Markdown（可选）">
        <Input.TextArea
          rows={4}
          value={value.initial_hint_markdown ?? ''}
          onChange={(e) => onChange({ ...value, initial_hint_markdown: e.target.value })}
        />
      </Form.Item>
      <Form.Item label="teaching_objective" required help="教学目标，供 LLM 参考">
        <Input.TextArea
          rows={2}
          value={value.teaching_objective}
          onChange={(e) => onChange({ ...value, teaching_objective: e.target.value })}
        />
      </Form.Item>
      <Form.Item label="max_rounds" help={`安全轮次上限，默认 ${DEFAULT_GUIDED_SPEAKING_MAX_ROUNDS}`}>
        <InputNumber
          min={1}
          max={20}
          value={value.max_rounds ?? DEFAULT_GUIDED_SPEAKING_MAX_ROUNDS}
          onChange={(n) =>
            onChange({
              ...value,
              max_rounds: typeof n === 'number' ? n : DEFAULT_GUIDED_SPEAKING_MAX_ROUNDS,
            })
          }
        />
      </Form.Item>
      <Form.Item label="asr_language" help="默认 en-US">
        <Input
          value={value.asr_language ?? ''}
          placeholder="en-US"
          onChange={(e) => onChange({ ...value, asr_language: e.target.value })}
        />
      </Form.Item>
      <Form.Item label="tts_voice_id" help="动态反馈 TTS 音色">
        <Input
          value={value.tts_voice_id ?? ''}
          placeholder="ZxueliLLS"
          onChange={(e) => onChange({ ...value, tts_voice_id: e.target.value })}
        />
      </Form.Item>
    </Form>
  )
}
