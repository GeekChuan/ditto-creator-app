import { Collapse, Divider, Form, Input, InputNumber } from 'antd'
import type { VoiceQaSimpleComponent } from '../../../types/atbReactionV2'
import {
  DEFAULT_VOICE_QA_INSTRUCTION_HINT,
  DEFAULT_VOICE_QA_INSTRUCTION_PRIMARY,
  DEFAULT_VOICE_QA_MAX_ATTEMPTS,
} from '../../../types/atbReactionV2'
import LinesTextArea from './LinesTextArea'
import TtsVoiceSelect from './TtsVoiceSelect'

interface Props {
  value: VoiceQaSimpleComponent
  onChange: (next: VoiceQaSimpleComponent) => void
}

export default function VoiceQaSimpleComponentForm({ value, onChange }: Props) {
  return (
    <Form layout="vertical" size="small">
      <Divider orientation="left" plain style={{ margin: '0 0 12px', fontSize: 12 }}>
        学员所见（右侧实时预览）
      </Divider>
      <Form.Item label="问题（英文）" required help="question_en · 老师口播的提问">
        <Input.TextArea
          rows={2}
          value={value.question_en}
          onChange={(e) => onChange({ ...value, question_en: e.target.value })}
        />
      </Form.Item>
      <Form.Item label="问题（中文）" help="question_zh · 选填">
        <Input.TextArea
          rows={1}
          autoSize={{ minRows: 1, maxRows: 3 }}
          value={value.question_zh ?? ''}
          onChange={(e) => onChange({ ...value, question_zh: e.target.value })}
        />
      </Form.Item>
      <Form.Item
        label="白板提示"
        required
        help="hint_markdown · 3~4 行，支持 **加粗**、*斜体*、`code`"
      >
        <Input.TextArea
          rows={4}
          value={value.hint_markdown}
          onChange={(e) => onChange({ ...value, hint_markdown: e.target.value })}
        />
      </Form.Item>

      <Divider orientation="left" plain style={{ margin: '4px 0 12px', fontSize: 12 }}>
        AI 判题（学员不可见）
      </Divider>
      <Form.Item label="教学目标" required help="teaching_objective · 供 LLM 判题与反馈参考">
        <Input.TextArea
          rows={2}
          value={value.teaching_objective}
          onChange={(e) => onChange({ ...value, teaching_objective: e.target.value })}
        />
      </Form.Item>
      <Form.Item label="判题要点" help="rubric_lines · 每行一条可接受答案要点，回车新增">
        <LinesTextArea
          value={value.rubric_lines ?? []}
          rows={3}
          placeholder={'I work as a designer.\nI am a designer at ...'}
          onChange={(lines) => onChange({ ...value, rubric_lines: lines })}
        />
      </Form.Item>
      <Form.Item label="标准答案（英文）" required help="standard_answer">
        <Input.TextArea
          rows={2}
          value={value.standard_answer}
          onChange={(e) => onChange({ ...value, standard_answer: e.target.value })}
        />
      </Form.Item>
      <Form.Item label="标准答案（中文）" help="standard_answer_zh · 选填">
        <Input.TextArea
          rows={1}
          autoSize={{ minRows: 1, maxRows: 3 }}
          value={value.standard_answer_zh ?? ''}
          onChange={(e) => onChange({ ...value, standard_answer_zh: e.target.value })}
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
                  help={`instruction_primary · 默认「${DEFAULT_VOICE_QA_INSTRUCTION_PRIMARY}」`}
                >
                  <Input
                    value={value.instruction_primary ?? ''}
                    placeholder={DEFAULT_VOICE_QA_INSTRUCTION_PRIMARY}
                    onChange={(e) => onChange({ ...value, instruction_primary: e.target.value })}
                  />
                </Form.Item>
                <Form.Item
                  label="作答辅助小字"
                  help={`instruction_hint · 默认「${DEFAULT_VOICE_QA_INSTRUCTION_HINT}」`}
                >
                  <Input
                    value={value.instruction_hint ?? ''}
                    placeholder={DEFAULT_VOICE_QA_INSTRUCTION_HINT}
                    onChange={(e) => onChange({ ...value, instruction_hint: e.target.value })}
                  />
                </Form.Item>
                <div style={{ display: 'flex', gap: 12 }}>
                  <Form.Item
                    label="最大作答轮次"
                    style={{ flex: 1 }}
                    help={`max_attempts · 默认 ${DEFAULT_VOICE_QA_MAX_ATTEMPTS}`}
                  >
                    <InputNumber
                      min={1}
                      max={10}
                      style={{ width: '100%' }}
                      value={value.max_attempts ?? DEFAULT_VOICE_QA_MAX_ATTEMPTS}
                      onChange={(n) =>
                        onChange({
                          ...value,
                          max_attempts: typeof n === 'number' ? n : DEFAULT_VOICE_QA_MAX_ATTEMPTS,
                        })
                      }
                    />
                  </Form.Item>
                  <Form.Item label="ASR 语言" style={{ flex: 1 }} help="asr_language · 默认 en-US">
                    <Input
                      value={value.asr_language ?? 'en-US'}
                      onChange={(e) => onChange({ ...value, asr_language: e.target.value })}
                    />
                  </Form.Item>
                </div>
                <Form.Item label="AI 反馈音色" help="tts_voice_id">
                  <TtsVoiceSelect
                    size="middle"
                    value={value.tts_voice_id ?? 'ZxueliLLS'}
                    onChange={(v) => onChange({ ...value, tts_voice_id: v })}
                    style={{ width: '100%' }}
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
