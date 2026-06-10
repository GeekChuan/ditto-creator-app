import { Form, Input, InputNumber, Select, Switch } from 'antd'
import type {
  AtbActivity,
  AtbSrcAsset,
  SceneComponent,
} from '../../types/atbReactionV2'
import { isSubmergeSequenceActivity } from '../../types/atbReactionV2'
import ImageOssUploadField from '../ImageOssUploadField'
import SrcIdSelect from './SrcIdSelect'
import FollowReadingComponentForm from './components/FollowReadingComponentForm'
import SpeechComponentForm from './components/SpeechComponentForm'

interface Props {
  component: SceneComponent
  activity: AtbActivity
  src: AtbSrcAsset[]
  onChange: (next: SceneComponent) => void
}

export default function ComponentEditor({ component, activity, src, onChange }: Props) {
  switch (component.type) {
    case 'background_image':
      return (
        <Form layout="vertical" size="small">
          <Form.Item label="description">
            <Input
              value={component.description ?? ''}
              onChange={(e) => onChange({ ...component, description: e.target.value })}
            />
          </Form.Item>
          <Form.Item label="img_url" required>
            <ImageOssUploadField
              value={component.img_url}
              onChange={(url) => onChange({ ...component, img_url: url })}
            />
          </Form.Item>
        </Form>
      )
    case 'teacher_avatar':
      return (
        <Form layout="vertical" size="small">
          <Form.Item label="source_id" required>
            <SrcIdSelect
              src={src}
              filterType="image"
              value={component.source_id}
              onChange={(id) => onChange({ ...component, source_id: id })}
            />
          </Form.Item>
        </Form>
      )
    case 'speech':
      return <SpeechComponentForm value={component} onChange={onChange} />
    case 'button':
      return (
        <Form layout="vertical" size="small">
          <Form.Item label="text" required>
            <Input
              value={component.text}
              onChange={(e) => onChange({ ...component, text: e.target.value })}
            />
          </Form.Item>
          <Form.Item label="click_signal" required>
            <Input
              value={component.click_signal}
              onChange={(e) => onChange({ ...component, click_signal: e.target.value })}
              addonAfter={
                isSubmergeSequenceActivity(activity) ? (
                  <a
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      onChange({ ...component, click_signal: activity.end_signal })
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onChange({ ...component, click_signal: activity.end_signal })
                      }
                    }}
                  >
                    对齐 end_signal
                  </a>
                ) : null
              }
            />
          </Form.Item>
        </Form>
      )
    case 'knowledge_card':
      return (
        <Form layout="vertical" size="small">
          <Form.Item label="tag">
            <Input
              value={component.tag ?? ''}
              onChange={(e) => onChange({ ...component, tag: e.target.value })}
            />
          </Form.Item>
          <Form.Item label="title" required>
            <Input
              value={component.title}
              onChange={(e) => onChange({ ...component, title: e.target.value })}
            />
          </Form.Item>
          <Form.Item label="content" required>
            <Input.TextArea
              rows={2}
              value={component.content}
              onChange={(e) => onChange({ ...component, content: e.target.value })}
            />
          </Form.Item>
          <Form.Item label="collocations（每行一条）">
            <Input.TextArea
              rows={3}
              value={(component.collocations ?? []).join('\n')}
              onChange={(e) =>
                onChange({
                  ...component,
                  collocations: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean),
                })
              }
            />
          </Form.Item>
          <Form.Item label="illustration_url">
            <ImageOssUploadField
              value={component.illustration_url ?? ''}
              onChange={(url) => onChange({ ...component, illustration_url: url })}
            />
          </Form.Item>
        </Form>
      )
    case 'whiteboard':
      return (
        <Form layout="vertical" size="small">
          <Form.Item label="img_url">
            <ImageOssUploadField
              value={component.img_url ?? ''}
              onChange={(url) => onChange({ ...component, img_url: url })}
              onUploaded={({ width, height, url }) =>
                onChange({
                  ...component,
                  img_url: url,
                  img_width: width,
                  img_height: height,
                })
              }
            />
          </Form.Item>
          <Form.Item label="img_width">
            <InputNumber
              style={{ width: '100%' }}
              value={component.img_width ?? 0}
              onChange={(v) => onChange({ ...component, img_width: v ?? 0 })}
            />
          </Form.Item>
          <Form.Item label="img_height">
            <InputNumber
              style={{ width: '100%' }}
              value={component.img_height ?? 0}
              onChange={(v) => onChange({ ...component, img_height: v ?? 0 })}
            />
          </Form.Item>
        </Form>
      )
    case 'video_play':
      return (
        <Form layout="vertical" size="small">
          <Form.Item label="source_id" required>
            <SrcIdSelect
              src={src}
              filterType="video"
              value={component.source_id}
              onChange={(id) => onChange({ ...component, source_id: id })}
              placeholder="选择视频资源"
            />
          </Form.Item>
          <Form.Item
            label="start_ms"
            required
            validateStatus={component.start_ms >= component.end_ms ? 'warning' : undefined}
            help={
              component.start_ms >= component.end_ms ? 'start_ms 须小于 end_ms' : undefined
            }
          >
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              value={component.start_ms}
              onChange={(v) => onChange({ ...component, start_ms: v ?? 0 })}
            />
          </Form.Item>
          <Form.Item label="end_ms" required>
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              value={component.end_ms}
              onChange={(v) => onChange({ ...component, end_ms: v ?? 0 })}
            />
          </Form.Item>
          <Form.Item label="playback_rate">
            <InputNumber
              min={0.1}
              max={3}
              step={0.1}
              style={{ width: '100%' }}
              value={component.playback_rate ?? 1}
              onChange={(v) => onChange({ ...component, playback_rate: v ?? 1 })}
            />
          </Form.Item>
          <Form.Item label="subtitle_override">
            <Select
              allowClear
              value={component.subtitle_override}
              onChange={(v) => onChange({ ...component, subtitle_override: v })}
              options={[
                { value: 'auto', label: 'auto' },
                { value: 'on', label: 'on' },
                { value: 'off', label: 'off' },
              ]}
            />
          </Form.Item>
          <Form.Item label="autoplay">
            <Switch
              checked={component.autoplay !== false}
              onChange={(v) => onChange({ ...component, autoplay: v })}
            />
          </Form.Item>
        </Form>
      )
    case 'countdown':
      return (
        <Form layout="vertical" size="small">
          <Form.Item label="duration_sec" help="倒计时结束后才开始播放视频，默认 3 秒">
            <InputNumber
              min={0}
              max={60}
              step={1}
              style={{ width: '100%' }}
              value={component.duration_sec ?? 3}
              onChange={(v) => onChange({ ...component, duration_sec: v ?? 3 })}
            />
          </Form.Item>
        </Form>
      )
    case 'kol_avatar':
      return (
        <Form layout="vertical" size="small">
          <Form.Item label="source_id" required help="引用 src 中的 KOL 头像（type=image）">
            <SrcIdSelect
              src={src}
              filterType="image"
              value={component.source_id}
              onChange={(id) => onChange({ ...component, source_id: id })}
              placeholder="选择 KOL 头像"
            />
          </Form.Item>
        </Form>
      )
    case 'play_video_brief':
      return (
        <Form layout="vertical" size="small">
          <Form.Item label="status_title" help="默认「视频播放中」">
            <Input
              value={component.status_title ?? ''}
              placeholder="视频播放中"
              onChange={(e) => onChange({ ...component, status_title: e.target.value })}
            />
          </Form.Item>
          <Form.Item label="description" required>
            <Input.TextArea
              rows={3}
              value={component.description}
              placeholder="正在播放视频0-31s，正常速度，请仔细听哦～"
              onChange={(e) => onChange({ ...component, description: e.target.value })}
            />
          </Form.Item>
        </Form>
      )
    case 'follow_reading':
      return <FollowReadingComponentForm value={component} onChange={onChange} />
    default: {
      const _e: never = component
      return _e
    }
  }
}
