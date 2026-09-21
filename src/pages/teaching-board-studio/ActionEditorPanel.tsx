import { Alert, Button, Empty, Form, Input, InputNumber, Popconfirm, Segmented, Select, Space, Typography } from 'antd'
import { DeleteOutlined, PlusOutlined, SendOutlined } from '@ant-design/icons'
import type {
  TeachingBoardAction,
  TeachingBoardBlock,
  TeachingBoardCommand,
  TeachingBoardEffect,
  TeachingBoardEffectType,
  TeachingBoardSubtitleAxis,
} from '../../types/teachingBoard'
import { uid } from './model'
import { formatTimelineTime, resolveActionTimeReference } from './subtitleAxis'

interface AnchorOption {
  id: string
  text: string
  location: string
}

interface Props {
  action?: TeachingBoardAction
  anchors: AnchorOption[]
  blocks: TeachingBoardBlock[]
  subtitleAxis?: TeachingBoardSubtitleAxis
  currentMs: number
  onCreate: (action: TeachingBoardAction) => void
  onChange: (action: TeachingBoardAction) => void
  onDelete: (actionId: string) => void
  onBroadcast: (action: TeachingBoardAction) => void
  onTimeChange: (timeMs: number) => void
}

function createDefaultAction(anchors: AnchorOption[], currentMs: number): TeachingBoardAction {
  const anchorId = anchors[0]?.id ?? ''
  return {
    id: uid('action'),
    name: '新动作',
    at_ms: Math.round(currentMs / 100) * 100,
    command: {
      type: 'apply_effect',
      effect: {
        effect_id: uid('effect'),
        type: 'highlight',
        tone: 'annotation',
        target: { anchor_id: anchorId },
      },
    },
  }
}

export default function ActionEditorPanel({
  action,
  anchors,
  blocks,
  subtitleAxis,
  currentMs,
  onCreate,
  onChange,
  onDelete,
  onBroadcast,
  onTimeChange,
}: Props) {
  const anchorOptions = anchors.map((anchor) => ({
    value: anchor.id,
    label: `${anchor.id} · ${anchor.text || '空文字'}`,
  }))
  const listBlocks = blocks.filter((block) => block.type === 'order_list')

  if (!action) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={anchors.length ? '选择时间线动作，或在当前时间创建动作' : '请先为文字片段设置 Anchor'}
      >
        <Button
          type="primary"
          icon={<PlusOutlined />}
          disabled={!anchors.length}
          onClick={() => onCreate(createDefaultAction(anchors, currentMs))}
        >
          在 {(currentMs / 1000).toFixed(1)}s 创建动作
        </Button>
      </Empty>
    )
  }

  const patchCommandType = (type: TeachingBoardCommand['type']) => {
    if (type === 'clear_effects') {
      onChange({ ...action, command: { type } })
      return
    }
    if (type === 'set_order_list_active_item') {
      const block = listBlocks[0]
      onChange({
        ...action,
        command: {
          type,
          block_id: block?.id ?? '',
          item_id: block?.type === 'order_list' ? block.items[0]?.id : undefined,
        },
      })
      return
    }
    onChange({
      ...action,
      command: {
        type: 'apply_effect',
        effect: {
          effect_id: uid('effect'),
          type: 'highlight',
          tone: 'annotation',
          target: { anchor_id: anchors[0]?.id ?? '' },
        },
      },
    })
  }

  const patchEffect = (patch: Partial<TeachingBoardEffect>) => {
    if (action.command.type !== 'apply_effect') return
    onChange({ ...action, command: { ...action.command, effect: { ...action.command.effect, ...patch } } })
  }

  const applyEffectCommand = action.command.type === 'apply_effect' ? action.command : undefined
  const listActiveCommand = action.command.type === 'set_order_list_active_item'
    ? action.command
    : undefined
  const effectRange = applyEffectCommand && 'anchor_range' in applyEffectCommand.effect.target
    ? applyEffectCommand.effect.target.anchor_range
    : undefined
  const singleAnchorId = applyEffectCommand && 'anchor_id' in applyEffectCommand.effect.target
    ? applyEffectCommand.effect.target.anchor_id
    : undefined
  const referencedSegment = subtitleAxis?.segments.find((segment) => segment.id === action.time_ref?.segment_id)
  const referencedToken = referencedSegment?.tokens.find((token) => token.id === action.time_ref?.token_id)

  const applySubtitleTime = (
    segmentId: string,
    tokenId: string,
    boundary: 'start' | 'end',
  ) => {
    const timeRef = { segment_id: segmentId, token_id: tokenId, boundary }
    const atMs = resolveActionTimeReference(subtitleAxis, timeRef)
    if (atMs === undefined) return
    onChange({ ...action, at_ms: atMs, time_ref: timeRef })
    onTimeChange(atMs)
  }

  return (
    <Form layout="vertical" size="small" className="tb-action-editor">
      <div className="tb-inspector-title-row">
        <div>
          <Typography.Text strong>动作编辑</Typography.Text>
          <Typography.Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
            {action.id}
          </Typography.Text>
        </div>
        <Space>
          <Button size="small" type="primary" icon={<SendOutlined />} onClick={() => onBroadcast(action)}>
            发广播
          </Button>
          <Popconfirm title="删除这个动作？" onConfirm={() => onDelete(action.id)}>
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      </div>

      <Form.Item label="动作名称">
        <Input value={action.name} onChange={(event) => onChange({ ...action, name: event.target.value })} />
      </Form.Item>

      {subtitleAxis?.segments.length ? (
        <div className="tb-action-time-picker">
          <div className="tb-action-time-picker-heading">
            <Typography.Text strong>从字幕轴定位</Typography.Text>
            {action.time_ref && referencedToken ? (
              <Typography.Text type="success">已绑定 {formatTimelineTime(action.at_ms)}</Typography.Text>
            ) : (
              <Typography.Text type="secondary">可选</Typography.Text>
            )}
          </div>
          <Form.Item label="1. 选择一句话">
            <Select
              showSearch
              optionFilterProp="label"
              placeholder="选择句子"
              value={referencedSegment?.id}
              options={subtitleAxis.segments.map((segment, index) => ({
                value: segment.id,
                label: `${index + 1}. ${segment.text}`,
              }))}
              onChange={(segmentId) => {
                const segment = subtitleAxis.segments.find((item) => item.id === segmentId)
                const token = segment?.tokens.find((item) => item.text.trim())
                if (segment && token) applySubtitleTime(segment.id, token.id, action.time_ref?.boundary ?? 'start')
              }}
            />
          </Form.Item>
          <Form.Item label="2. 选择字 / 单词">
            <Select
              showSearch
              optionFilterProp="label"
              placeholder={referencedSegment ? '选择字或单词' : '请先选择一句话'}
              disabled={!referencedSegment}
              value={referencedToken?.id}
              options={referencedSegment?.tokens.filter((token) => token.text.trim()).map((token, index) => ({
                value: token.id,
                label: `${index + 1}. ${token.text} · ${formatTimelineTime(token.start_ms)}–${formatTimelineTime(token.end_ms)}`,
              }))}
              onChange={(tokenId) => {
                if (referencedSegment) applySubtitleTime(referencedSegment.id, tokenId, action.time_ref?.boundary ?? 'start')
              }}
            />
          </Form.Item>
          <Form.Item label="3. 选择时间边界">
            <Segmented
              block
              disabled={!referencedToken}
              value={action.time_ref?.boundary ?? 'start'}
              options={[
                { value: 'start', label: referencedToken ? `开始 · ${formatTimelineTime(referencedToken.start_ms)}` : '开始' },
                { value: 'end', label: referencedToken ? `结束 · ${formatTimelineTime(referencedToken.end_ms)}` : '结束' },
              ]}
              onChange={(boundary) => {
                if (referencedSegment && referencedToken) {
                  applySubtitleTime(referencedSegment.id, referencedToken.id, boundary as 'start' | 'end')
                }
              }}
            />
          </Form.Item>
        </div>
      ) : (
        <Alert type="info" showIcon message="导入逐字字幕轴后，可以直接选择某个字/单词的开始或结束时间。" />
      )}

      <Form.Item label="最终执行时间（ms）" extra={action.time_ref ? '手动修改会解除字幕字词绑定，但不会影响动作执行。' : undefined}>
        <InputNumber
          min={0}
          step={100}
          style={{ width: '100%' }}
          value={action.at_ms}
          onChange={(value) => {
            const atMs = value ?? 0
            onChange({ ...action, at_ms: atMs, time_ref: undefined })
            onTimeChange(atMs)
          }}
        />
      </Form.Item>
      <Form.Item label="命令">
        <Select
          value={action.command.type}
          options={[
            { value: 'apply_effect', label: '应用圈画/批注效果' },
            { value: 'clear_effects', label: '清空全部效果' },
            { value: 'set_order_list_active_item', label: '切换列表激活项' },
          ]}
          onChange={patchCommandType}
        />
      </Form.Item>

      {applyEffectCommand ? (
        <>
          <Form.Item label="效果类型">
            <Select<TeachingBoardEffectType>
              value={applyEffectCommand.effect.type}
              options={[
                { value: 'underline', label: '划线' },
                { value: 'circle', label: '圈画' },
                { value: 'highlight', label: '高亮' },
                { value: 'text_emphasis', label: '文字强调/变色' },
                { value: 'label', label: '手写批注' },
              ]}
              onChange={(type) => patchEffect({ type })}
            />
          </Form.Item>
          <Form.Item label="颜色语义">
            <Select
              value={applyEffectCommand.effect.tone ?? 'annotation'}
              options={[
                { value: 'primary', label: 'Primary · 绿色强调' },
                { value: 'annotation', label: 'Annotation · 主批注' },
                { value: 'secondary', label: 'Secondary · 次批注' },
              ]}
              onChange={(tone) => patchEffect({ tone })}
            />
          </Form.Item>
          <Form.Item label="目标模式">
            <Select
              value={effectRange ? 'range' : 'single'}
              options={[
                { value: 'single', label: '单个 Anchor' },
                { value: 'range', label: 'Anchor 区间' },
              ]}
              onChange={(mode) => {
                const first = anchors[0]?.id ?? ''
                patchEffect({
                  target: mode === 'range'
                    ? { anchor_range: { start_anchor_id: first, end_anchor_id: anchors[1]?.id ?? first } }
                    : { anchor_id: first },
                })
              }}
            />
          </Form.Item>
          {!effectRange ? (
            <Form.Item label="Anchor">
              <Select
                showSearch
                optionFilterProp="label"
                value={singleAnchorId}
                options={anchorOptions}
                onChange={(anchor_id) => patchEffect({ target: { anchor_id } })}
              />
            </Form.Item>
          ) : (
            <Space size={8} align="start" style={{ width: '100%' }}>
              <Form.Item label="起点 Anchor" style={{ flex: 1 }}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  value={effectRange.start_anchor_id}
                  options={anchorOptions}
                  onChange={(start_anchor_id) => patchEffect({
                    target: {
                      anchor_range: {
                        ...effectRange,
                        start_anchor_id,
                      },
                    },
                  })}
                />
              </Form.Item>
              <Form.Item label="终点 Anchor" style={{ flex: 1 }}>
                <Select
                  showSearch
                  optionFilterProp="label"
                  value={effectRange.end_anchor_id}
                  options={anchorOptions}
                  onChange={(end_anchor_id) => patchEffect({
                    target: {
                      anchor_range: {
                        ...effectRange,
                        end_anchor_id,
                      },
                    },
                  })}
                />
              </Form.Item>
            </Space>
          )}
          {applyEffectCommand.effect.type === 'label' ? (
            <Form.Item label="批注文字">
              <Input value={applyEffectCommand.effect.text ?? ''} onChange={(event) => patchEffect({ text: event.target.value })} />
            </Form.Item>
          ) : null}
          {effectRange ? (
            <Alert type="info" showIcon message="同一文本行内的 Anchor 区间会合并成一笔连续效果。" />
          ) : null}
        </>
      ) : null}

      {listActiveCommand ? (
        <>
          <Form.Item label="列表组件">
            <Select
              value={listActiveCommand.block_id}
              options={listBlocks.map((block) => ({ value: block.id, label: block.id }))}
              onChange={(block_id) => {
                const block = listBlocks.find((candidate) => candidate.id === block_id)
                onChange({
                  ...action,
                  command: {
                    type: 'set_order_list_active_item',
                    block_id,
                    item_id: block?.type === 'order_list' ? block.items[0]?.id : undefined,
                  },
                })
              }}
            />
          </Form.Item>
          <Form.Item label="激活项">
            <Select
              allowClear
              value={listActiveCommand.item_id}
              options={listBlocks
                .find((block) => block.id === listActiveCommand.block_id && block.type === 'order_list')
                ?.items.map((item) => ({ value: item.id, label: item.id })) ?? []}
              onChange={(item_id) => onChange({
                ...action,
                command: { ...listActiveCommand, item_id },
              })}
            />
          </Form.Item>
        </>
      ) : null}
    </Form>
  )
}
