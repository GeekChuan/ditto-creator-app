import { Button, Input, InputNumber, Space, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { VideoSubtitleSegment } from '../../types/atbReactionV2'

const { Text } = Typography

interface Props {
  segments: VideoSubtitleSegment[]
  onChange: (segments: VideoSubtitleSegment[]) => void
  label?: string
}

export default function VideoSubtitleEditor({ segments, onChange, label }: Props) {
  const updateRow = (index: number, patch: Partial<VideoSubtitleSegment>) => {
    const next = segments.map((s, i) => (i === index ? { ...s, ...patch } : s))
    onChange(next)
  }

  const columns: ColumnsType<VideoSubtitleSegment> = [
    {
      title: 'start_ms',
      width: 100,
      render: (_, __, index) => (
        <InputNumber
          size="small"
          min={0}
          style={{ width: '100%' }}
          value={segments[index]?.start_ms}
          onChange={(v) => updateRow(index, { start_ms: v ?? 0 })}
        />
      ),
    },
    {
      title: 'end_ms',
      width: 100,
      render: (_, __, index) => (
        <InputNumber
          size="small"
          min={0}
          style={{ width: '100%' }}
          value={segments[index]?.end_ms}
          onChange={(v) => updateRow(index, { end_ms: v ?? 0 })}
        />
      ),
    },
    {
      title: 'text',
      render: (_, __, index) => (
        <Input
          size="small"
          value={segments[index]?.text}
          onChange={(e) => updateRow(index, { text: e.target.value })}
        />
      ),
    },
    {
      title: 'translation_zh',
      render: (_, __, index) => (
        <Input
          size="small"
          value={segments[index]?.translation_zh ?? ''}
          onChange={(e) => updateRow(index, { translation_zh: e.target.value })}
        />
      ),
    },
    {
      title: 'highlights',
      width: 120,
      render: (_, __, index) => (
        <Input
          size="small"
          placeholder="逗号分隔"
          value={(segments[index]?.highlights ?? []).join(', ')}
          onChange={(e) =>
            updateRow(index, {
              highlights: e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      ),
    },
    {
      title: '',
      width: 60,
      render: (_, __, index) => (
        <Button
          size="small"
          danger
          type="link"
          onClick={() => onChange(segments.filter((_, i) => i !== index))}
        >
          删
        </Button>
      ),
    },
  ]

  return (
    <div>
      <Space style={{ marginBottom: 8, width: '100%', justifyContent: 'space-between' }}>
        <Text strong>{label ?? 'subtitles.segments'}</Text>
        <Button
          size="small"
          onClick={() =>
            onChange([
              ...segments,
              { start_ms: 0, end_ms: 3000, text: '', highlights: [] },
            ])
          }
        >
          添加字幕段
        </Button>
      </Space>
      <Table
        size="small"
        rowKey={(_, i) => String(i)}
        pagination={false}
        dataSource={segments}
        columns={columns}
        scroll={{ x: 720 }}
        locale={{ emptyText: '暂无字幕，可点击「识别英文字幕」或手动添加' }}
      />
    </div>
  )
}
