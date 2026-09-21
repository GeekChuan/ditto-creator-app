import { Button, Input, Space, Tag, Tooltip, Typography } from 'antd'
import { DeleteOutlined, LinkOutlined, PlusOutlined, ScissorOutlined } from '@ant-design/icons'
import type { TeachingBoardText } from '../../types/teachingBoard'
import { uid } from './model'

interface Props {
  label: string
  value: TeachingBoardText
  selectedAnchorId?: string
  onChange: (value: TeachingBoardText) => void
  onSelectAnchor: (anchorId: string) => void
}

export default function AnchorTextEditor({
  label,
  value,
  selectedAnchorId,
  onChange,
  onSelectAnchor,
}: Props) {
  const patchSegment = (index: number, patch: Partial<TeachingBoardText[number]>) => {
    onChange(value.map((segment, segmentIndex) => segmentIndex === index ? { ...segment, ...patch } : segment))
  }

  const removeSegment = (index: number) => {
    if (value.length <= 1) return
    onChange(value.filter((_, segmentIndex) => segmentIndex !== index))
  }

  const splitSegment = (index: number) => {
    const segment = value[index]
    if (!segment) return
    const midpoint = Math.max(1, Math.floor(segment.text.length / 2))
    const before = segment.text.slice(0, midpoint)
    const after = segment.text.slice(midpoint)
    onChange([
      ...value.slice(0, index),
      { ...segment, text: before },
      { text: after },
      ...value.slice(index + 1),
    ])
  }

  return (
    <div className="tb-anchor-editor">
      <div className="tb-anchor-editor-heading">
        <Typography.Text strong>{label}</Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 11 }}>
          每个片段就是一个可标注断点
        </Typography.Text>
      </div>
      <div className="tb-anchor-segments">
        {value.map((segment, index) => (
          <div
            className={[
              'tb-anchor-segment',
              segment.anchor_id ? 'has-anchor' : '',
              segment.anchor_id === selectedAnchorId ? 'is-selected' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            key={`${index}-${segment.anchor_id ?? 'plain'}`}
            onClick={() => segment.anchor_id && onSelectAnchor(segment.anchor_id)}
          >
            <div className="tb-anchor-segment-index">{index + 1}</div>
            <div className="tb-anchor-segment-fields">
              <Input.TextArea
                autoSize={{ minRows: 1, maxRows: 3 }}
                value={segment.text}
                placeholder="输入文字"
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => patchSegment(index, { text: event.target.value })}
              />
              <Input
                size="small"
                value={segment.anchor_id ?? ''}
                prefix={<LinkOutlined />}
                placeholder="无 Anchor"
                status={segment.anchor_id && segment.anchor_id === selectedAnchorId ? 'warning' : undefined}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => {
                  const anchor = event.target.value.trim() || undefined
                  patchSegment(index, { anchor_id: anchor })
                  if (anchor) onSelectAnchor(anchor)
                }}
              />
            </div>
            <Space direction="vertical" size={2}>
              <Tooltip title="自动生成 Anchor ID">
                <Button
                  size="small"
                  type={segment.anchor_id ? 'primary' : 'default'}
                  icon={<LinkOutlined />}
                  onClick={(event) => {
                    event.stopPropagation()
                    const anchorId = segment.anchor_id ?? uid('anchor')
                    patchSegment(index, { anchor_id: anchorId })
                    onSelectAnchor(anchorId)
                  }}
                />
              </Tooltip>
              <Tooltip title="从中间切分片段">
                <Button
                  size="small"
                  icon={<ScissorOutlined />}
                  disabled={segment.text.length < 2}
                  onClick={(event) => {
                    event.stopPropagation()
                    splitSegment(index)
                  }}
                />
              </Tooltip>
              <Button
                size="small"
                danger
                icon={<DeleteOutlined />}
                disabled={value.length <= 1}
                onClick={(event) => {
                  event.stopPropagation()
                  removeSegment(index)
                }}
              />
            </Space>
          </div>
        ))}
      </div>
      <Button
        block
        size="small"
        type="dashed"
        icon={<PlusOutlined />}
        onClick={() => onChange([...value, { text: '' }])}
      >
        添加文字片段
      </Button>
      <div className="tb-anchor-text-preview">
        {value.map((segment, index) =>
          segment.anchor_id ? (
            <Tag color="geekblue" key={`${segment.anchor_id}-${index}`}>{segment.text || '空片段'}</Tag>
          ) : (
            <span key={`plain-${index}`}>{segment.text}</span>
          ),
        )}
      </div>
    </div>
  )
}
