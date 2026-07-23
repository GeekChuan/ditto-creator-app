import { Collapse, Divider, Form, Input, InputNumber } from 'antd'
import type { GuidedSpeakingComponent } from '../../../types/atbReactionV2'
import {
  DEFAULT_GUIDED_SPEAKING_INSTRUCTION_HINT,
  DEFAULT_GUIDED_SPEAKING_INSTRUCTION_PRIMARY,
  DEFAULT_GUIDED_SPEAKING_MAX_ROUNDS,
} from '../../../types/atbReactionV2'
import LinesTextArea from './LinesTextArea'
import TtsVoiceSelect from './TtsVoiceSelect'

interface Props {
  value: GuidedSpeakingComponent
  onChange: (next: GuidedSpeakingComponent) => void
}

export default function GuidedSpeakingComponentForm({ value, onChange }: Props) {
  return (
    <Form layout="vertical" size="small">
      <Divider orientation="left" plain style={{ margin: '0 0 12px', fontSize: 12 }}>
        学员所见（右侧实时预览）
      </Divider>
      <Form.Item label="任务描述" required help="task_description · 学员可见">
        <Input.TextArea
          rows={3}
          value={value.task_description}
          onChange={(e) => onChange({ ...value, task_description: e.target.value })}
        />
      </Form.Item>
      <Form.Item
        label="表达目标"
        required
        help="expression_goals · 每行一条 checklist 目标，至少 1 条，回车新增"
      >
        <LinesTextArea
          value={value.expression_goals ?? []}
          rows={4}
          placeholder={'说出自己的职业\n说出工作年限'}
          onChange={(lines) => onChange({ ...value, expression_goals: lines })}
        />
      </Form.Item>
      <Form.Item
        label="首轮语料提示"
        help="initial_hint_markdown · 选填，支持 **加粗**、*斜体*、`code`"
      >
        <Input.TextArea
          rows={4}
          value={value.initial_hint_markdown ?? ''}
          onChange={(e) => onChange({ ...value, initial_hint_markdown: e.target.value })}
        />
      </Form.Item>

      <Divider orientation="left" plain style={{ margin: '4px 0 12px', fontSize: 12 }}>
        AI 引导（学员不可见）
      </Divider>
      <Form.Item label="教学目标" required help="teaching_objective · 供 LLM 参考">
        <Input.TextArea
          rows={2}
          value={value.teaching_objective}
          onChange={(e) => onChange({ ...value, teaching_objective: e.target.value })}
        />
      </Form.Item>

      <Collapse
        ghost
        size="small"
        items={[
          {
            key: 'advanced',
            label: '高级设置（作答文案 / 轮次 / 语音）',
            children: (
              <>
                <Form.Item
                  label="作答主提示"
                  help={`instruction_primary · 默认「${DEFAULT_GUIDED_SPEAKING_INSTRUCTION_PRIMARY}」`}
                >
                  <Input
                    value={value.instruction_primary ?? ''}
                    placeholder={DEFAULT_GUIDED_SPEAKING_INSTRUCTION_PRIMARY}
                    onChange={(e) => onChange({ ...value, instruction_primary: e.target.value })}
                  />
                </Form.Item>
                <Form.Item
                  label="作答辅助小字"
                  help={`instruction_hint · 默认「${DEFAULT_GUIDED_SPEAKING_INSTRUCTION_HINT}」`}
                >
                  <Input
                    value={value.instruction_hint ?? ''}
                    placeholder={DEFAULT_GUIDED_SPEAKING_INSTRUCTION_HINT}
                    onChange={(e) => onChange({ ...value, instruction_hint: e.target.value })}
                  />
                </Form.Item>
                <div style={{ display: 'flex', gap: 12 }}>
                  <Form.Item
                    label="安全轮次上限"
                    style={{ flex: 1 }}
                    help={`max_rounds · 默认 ${DEFAULT_GUIDED_SPEAKING_MAX_ROUNDS}`}
                  >
                    <InputNumber
                      min={1}
                      max={20}
                      style={{ width: '100%' }}
                      value={value.max_rounds ?? DEFAULT_GUIDED_SPEAKING_MAX_ROUNDS}
                      onChange={(n) =>
                        onChange({
                          ...value,
                          max_rounds: typeof n === 'number' ? n : DEFAULT_GUIDED_SPEAKING_MAX_ROUNDS,
                        })
                      }
                    />
                  </Form.Item>
                  <Form.Item label="ASR 语言" style={{ flex: 1 }} help="asr_language · 默认 en-US">
                    <Input
                      value={value.asr_language ?? ''}
                      placeholder="en-US"
                      onChange={(e) => onChange({ ...value, asr_language: e.target.value })}
                    />
                  </Form.Item>
                </div>
                <Form.Item label="动态反馈音色" help="tts_voice_id · 留空用运行时默认">
                  <TtsVoiceSelect
                    size="middle"
                    allowClear
                    value={value.tts_voice_id ?? ''}
                    onChange={(v) => onChange({ ...value, tts_voice_id: v })}
                    style={{ width: '100%' }}
                    placeholder="ZxueliLLS"
                  />
                </Form.Item>
              </>
            ),
          },
        ]}
      />
    </Form>
  )
}
