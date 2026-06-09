import { Form, Input, Select } from 'antd'
import type { AtbReactionDocument } from '../../types/atbReactionV2'

interface Props {
  doc: AtbReactionDocument
  onChange: (patch: Partial<AtbReactionDocument>) => void
}

export default function LessonMetaForm({ doc, onChange }: Props) {
  return (
    <Form layout="vertical" size="small">
      <Form.Item label="version" required>
        <Input
          value={doc.version}
          onChange={(e) => onChange({ version: e.target.value })}
          placeholder="0.0.2"
        />
      </Form.Item>
      <Form.Item label="lesson_title">
        <Input
          value={doc.lesson_title ?? ''}
          onChange={(e) => onChange({ lesson_title: e.target.value })}
          placeholder="Purple 紫色"
        />
      </Form.Item>
      <Form.Item label="lesson_section">
        <Input
          value={doc.lesson_section ?? ''}
          onChange={(e) => onChange({ lesson_section: e.target.value })}
          placeholder="1-1"
        />
      </Form.Item>
      <Form.Item label="default_subtitle_mode">
        <Select
          value={doc.default_subtitle_mode ?? 'auto'}
          onChange={(v) => onChange({ default_subtitle_mode: v })}
          options={[
            { value: 'auto', label: 'auto' },
            { value: 'on', label: 'on' },
            { value: 'off', label: 'off' },
          ]}
        />
      </Form.Item>
    </Form>
  )
}
