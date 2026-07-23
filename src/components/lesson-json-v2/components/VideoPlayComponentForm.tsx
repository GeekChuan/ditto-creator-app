import { Form, InputNumber, Select, Switch } from 'antd'
import type { AtbSrcAsset, VideoPlayComponent } from '../../../types/atbReactionV2'
import SrcIdSelect from '../SrcIdSelect'
import VideoClipPicker from './VideoClipPicker'

interface Props {
  value: VideoPlayComponent
  src: AtbSrcAsset[]
  onChange: (next: VideoPlayComponent) => void
}

export default function VideoPlayComponentForm({ value, src, onChange }: Props) {
  return (
    <Form layout="vertical" size="small">
      <Form.Item label="source_id" required>
        <SrcIdSelect
          src={src}
          filterType="video"
          value={value.source_id}
          onChange={(id) => onChange({ ...value, source_id: id })}
          placeholder="选择视频资源"
        />
      </Form.Item>

      <Form.Item label="播放片段" required style={{ marginBottom: 12 }}>
        <VideoClipPicker
          src={src}
          sourceId={value.source_id}
          startMs={value.start_ms}
          endMs={value.end_ms}
          playbackRate={value.playback_rate ?? 1}
          onChangeRange={(patch) => onChange({ ...value, ...patch })}
        />
      </Form.Item>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Form.Item label="playback_rate" style={{ flex: 1, minWidth: 140, marginBottom: 8 }}>
          <InputNumber
            min={0.1}
            max={3}
            step={0.1}
            style={{ width: '100%' }}
            value={value.playback_rate ?? 1}
            onChange={(v) => onChange({ ...value, playback_rate: v ?? 1 })}
          />
        </Form.Item>
        <Form.Item label="subtitle_override" style={{ flex: 1, minWidth: 140, marginBottom: 8 }}>
          <Select
            allowClear
            value={value.subtitle_override}
            onChange={(v) => onChange({ ...value, subtitle_override: v })}
            options={[
              { value: 'auto', label: 'auto' },
              { value: 'on', label: 'on' },
              { value: 'off', label: 'off' },
            ]}
          />
        </Form.Item>
        <Form.Item label="autoplay" style={{ flexShrink: 0, marginBottom: 8 }}>
          <Switch
            checked={value.autoplay !== false}
            onChange={(v) => onChange({ ...value, autoplay: v })}
          />
        </Form.Item>
      </div>
    </Form>
  )
}
