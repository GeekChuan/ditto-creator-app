import { Form, Input, InputNumber, Select, Switch } from 'antd'
import type { AtbSrcAsset, OralOutputComponent } from '../../../types/atbReactionV2'
import { DEFAULT_ORAL_OUTPUT_MAX_ATTEMPTS } from '../../../types/atbReactionV2'
import SrcIdSelect from '../SrcIdSelect'

interface Props {
  value: OralOutputComponent
  src: AtbSrcAsset[]
  onChange: (next: OralOutputComponent) => void
}

export default function OralOutputComponentForm({ value, src, onChange }: Props) {
  return (
    <Form layout="vertical" size="small">
      <Form.Item label="homework_title_markdown" required help="作业题目（Markdown），学员端顶部展示">
        <Input.TextArea
          rows={2}
          value={value.homework_title_markdown}
          onChange={(e) => onChange({ ...value, homework_title_markdown: e.target.value })}
        />
      </Form.Item>
      <Form.Item label="requirements_markdown" help="作业要求（Markdown），卡片区块 1；留空则不展示该区块">
        <Input.TextArea
          rows={5}
          value={value.requirements_markdown ?? ''}
          onChange={(e) => onChange({ ...value, requirements_markdown: e.target.value })}
        />
      </Form.Item>
      <Form.Item label="language_reference_markdown" help="语言参考（Markdown），卡片区块 2；留空则不展示该区块">
        <Input.TextArea
          rows={5}
          value={value.language_reference_markdown ?? ''}
          onChange={(e) => onChange({ ...value, language_reference_markdown: e.target.value })}
        />
      </Form.Item>
      <Form.Item label="example_markdown" help="案例参考文字（Markdown），卡片区块 3；三个区块均为空时整张卡片不渲染">
        <Input.TextArea
          rows={5}
          value={value.example_markdown ?? ''}
          onChange={(e) => onChange({ ...value, example_markdown: e.target.value })}
        />
      </Form.Item>
      <Form.Item label="example_audio_src" help="案例音频，引用资源表中 type=audio 的资源，可不配置">
        <SrcIdSelect
          src={src}
          filterType="audio"
          value={value.example_audio_src ?? ''}
          onChange={(id) => onChange({ ...value, example_audio_src: id || undefined })}
          placeholder="选择案例音频（可选）"
        />
      </Form.Item>
      <Form.Item label="example_video_src" help="案例视频，引用资源表中 type=video 的资源，可不配置">
        <SrcIdSelect
          src={src}
          filterType="video"
          value={value.example_video_src ?? ''}
          onChange={(id) => onChange({ ...value, example_video_src: id || undefined })}
          placeholder="选择案例视频（可选）"
        />
      </Form.Item>
      <Form.Item label="grading_rubric_markdown" required help="批改规则（Markdown），学员不可见，供 AI 批改使用">
        <Input.TextArea
          rows={6}
          value={value.grading_rubric_markdown}
          onChange={(e) => onChange({ ...value, grading_rubric_markdown: e.target.value })}
        />
      </Form.Item>
      <Form.Item label="max_attempts" help={`最大提交次数，1~10，默认 ${DEFAULT_ORAL_OUTPUT_MAX_ATTEMPTS}`}>
        <InputNumber
          min={1}
          max={10}
          step={1}
          precision={0}
          style={{ width: '100%' }}
          value={value.max_attempts ?? DEFAULT_ORAL_OUTPUT_MAX_ATTEMPTS}
          onChange={(v) => onChange({ ...value, max_attempts: v ?? DEFAULT_ORAL_OUTPUT_MAX_ATTEMPTS })}
        />
      </Form.Item>
      <Form.Item label="allow_teleprompter" help="是否允许学员使用提词器，默认允许">
        <Switch
          checked={value.allow_teleprompter !== false}
          onChange={(v) => onChange({ ...value, allow_teleprompter: v })}
        />
      </Form.Item>
      {value.allow_teleprompter !== false ? (
        <Form.Item label="teleprompter_default_text" help="提词器默认文本（可选）">
          <Input.TextArea
            rows={4}
            value={value.teleprompter_default_text ?? ''}
            onChange={(e) => onChange({ ...value, teleprompter_default_text: e.target.value })}
          />
        </Form.Item>
      ) : null}
      <Form.Item
        label="report_delivery"
        help="auto：AI 批改完成后立即返回学员；manual：老师在审核后台确认修改后手动下发"
      >
        <Select
          value={value.report_delivery ?? 'auto'}
          onChange={(v) => onChange({ ...value, report_delivery: v })}
          options={[
            { value: 'auto', label: 'auto（AI 批改后自动下发）' },
            { value: 'manual', label: 'manual（老师审核后手动下发）' },
          ]}
        />
      </Form.Item>
      <Form.Item label="optimize_for_user" help="是否按作业要求为学员生成一版符合其水平的优化内容">
        <Switch
          checked={value.optimize_for_user === true}
          onChange={(v) => onChange({ ...value, optimize_for_user: v })}
        />
      </Form.Item>
      <Form.Item label="asr_language" help="作答语音识别语言，默认 en-US">
        <Input
          value={value.asr_language ?? 'en-US'}
          onChange={(e) => onChange({ ...value, asr_language: e.target.value })}
        />
      </Form.Item>
    </Form>
  )
}
