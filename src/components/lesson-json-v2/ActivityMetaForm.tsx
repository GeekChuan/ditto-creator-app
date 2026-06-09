import { Form, Input } from 'antd'
import type { AtbActivity } from '../../types/atbReactionV2'
import { isLectureWithPracticeActivity, isSubmergeSequenceActivity } from '../../types/atbReactionV2'
import SrcIdSelect from './SrcIdSelect'
import type { AtbSrcAsset } from '../../types/atbReactionV2'

interface Props {
  activity: AtbActivity
  src: AtbSrcAsset[]
  onChange: (next: AtbActivity) => void
}

export default function ActivityMetaForm({ activity, src, onChange }: Props) {
  return (
    <Form layout="vertical" size="small">
      <Form.Item label="id" required>
        <Input
          value={String(activity.id)}
          onChange={(e) => {
            const raw = e.target.value
            const num = parseInt(raw, 10)
            onChange({ ...activity, id: Number.isNaN(num) ? raw : num })
          }}
        />
      </Form.Item>
      <Form.Item label="type">
        <Input value={activity.type} disabled />
      </Form.Item>
      <Form.Item label="description">
        <Input.TextArea
          rows={2}
          value={activity.description ?? ''}
          onChange={(e) => onChange({ ...activity, description: e.target.value })}
        />
      </Form.Item>
      {isSubmergeSequenceActivity(activity) ? (
        <>
          <Form.Item label="common_layout">
            <Input value={activity.common_layout} disabled />
          </Form.Item>
          <Form.Item label="end_signal" required>
            <Input
              value={activity.end_signal}
              onChange={(e) => onChange({ ...activity, end_signal: e.target.value })}
            />
          </Form.Item>
        </>
      ) : null}
      {isLectureWithPracticeActivity(activity) ? (
        <>
          <Form.Item label="layout">
            <Input value={activity.layout} disabled />
          </Form.Item>
          <Form.Item label="video_source_id" required>
            <SrcIdSelect
              src={src}
              filterType="video"
              value={activity.video_source_id}
              onChange={(id) => onChange({ ...activity, video_source_id: id })}
            />
          </Form.Item>
          <Form.Item label="end_signal">
            <Input
              value={activity.end_signal ?? ''}
              onChange={(e) => onChange({ ...activity, end_signal: e.target.value })}
            />
          </Form.Item>
        </>
      ) : null}
    </Form>
  )
}
