import { Button, Collapse, Empty, Form, Input, Select, Space, Switch, Typography } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import type {
  TeachingBoardBlock,
  TeachingBoardOrderListBlock,
  TeachingBoardText,
} from '../../types/teachingBoard'
import AnchorTextEditor from './AnchorTextEditor'
import { BLOCK_LABELS, uid } from './model'

interface Props {
  block?: TeachingBoardBlock
  selectedAnchorId?: string
  onChange: (block: TeachingBoardBlock) => void
  onSelectAnchor: (anchorId: string) => void
}

const emptyText = (): TeachingBoardText => [{ text: '' }]

export default function BlockInspector({
  block,
  selectedAnchorId,
  onChange,
  onSelectAnchor,
}: Props) {
  if (!block) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="在画布或结构树中选择组件" />

  const anchorEditor = (label: string, value: TeachingBoardText, update: (value: TeachingBoardText) => void) => (
    <AnchorTextEditor
      label={label}
      value={value}
      selectedAnchorId={selectedAnchorId}
      onChange={update}
      onSelectAnchor={onSelectAnchor}
    />
  )

  const renderOrderList = (list: TeachingBoardOrderListBlock) => (
    <>
      <Form.Item label="列表样式">
        <Select
          value={list.variant ?? 'normal'}
          options={[
            { value: 'normal', label: 'Normal · 卡片列表' },
            { value: 'simple', label: 'Simple · 轻量列表' },
          ]}
          onChange={(variant) => onChange({ ...list, variant })}
        />
      </Form.Item>
      <Form.Item label="初始激活项">
        <Select
          allowClear
          value={list.initial_active_item_id}
          options={list.items.map((item, index) => ({ value: item.id, label: `${index + 1}. ${item.id}` }))}
          onChange={(value) => onChange({ ...list, initial_active_item_id: value })}
        />
      </Form.Item>
      <Collapse
        size="small"
        items={list.items.map((item, itemIndex) => ({
          key: item.id,
          label: `${itemIndex + 1}. ${item.title.map((segment) => segment.text).join('') || '未命名项'}`,
          extra: (
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              onClick={(event) => {
                event.stopPropagation()
                onChange({ ...list, items: list.items.filter((candidate) => candidate.id !== item.id) })
              }}
            />
          ),
          children: (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Input
                addonBefore="item_id"
                value={item.id}
                onChange={(event) => {
                  const id = event.target.value
                  onChange({
                    ...list,
                    items: list.items.map((candidate) => candidate.id === item.id ? { ...candidate, id } : candidate),
                  })
                }}
              />
              {anchorEditor('标题', item.title, (title) => {
                onChange({
                  ...list,
                  items: list.items.map((candidate) => candidate.id === item.id ? { ...candidate, title } : candidate),
                })
              })}
              {anchorEditor('说明', item.description ?? emptyText(), (description) => {
                onChange({
                  ...list,
                  items: list.items.map((candidate) => candidate.id === item.id ? { ...candidate, description } : candidate),
                })
              })}
            </Space>
          ),
        }))}
      />
      <Button
        block
        type="dashed"
        icon={<PlusOutlined />}
        style={{ marginTop: 10 }}
        onClick={() => onChange({
          ...list,
          items: [
            ...list.items,
            { id: uid('item'), title: [{ text: 'ITEM' }], description: [{ text: 'Add a prompt.' }] },
          ],
        })}
      >
        添加列表项
      </Button>
    </>
  )

  return (
    <Form layout="vertical" size="small" className="tb-block-inspector">
      <div className="tb-inspector-title-row">
        <div>
          <Typography.Text strong>{BLOCK_LABELS[block.type] ?? block.type}</Typography.Text>
          <Typography.Text type="secondary" style={{ display: 'block', fontSize: 11 }}>
            {block.type}
          </Typography.Text>
        </div>
      </div>
      <Form.Item label="Block ID" help="动作和扩展组件通过稳定 ID 寻址">
        <Input value={block.id} onChange={(event) => onChange({ ...block, id: event.target.value })} />
      </Form.Item>

      {block.type === 'title' ? (
        <>
          <Form.Item label="标题样式">
            <Select
              value={block.variant ?? 'normal'}
              options={[
                { value: 'normal', label: 'Normal' },
                { value: 'capsule', label: 'Capsule' },
              ]}
              onChange={(variant) => onChange({ ...block, variant })}
            />
          </Form.Item>
          {anchorEditor('标题文字', block.text, (text) => onChange({ ...block, text }))}
        </>
      ) : null}

      {block.type === 'content'
        ? anchorEditor('正文文字', block.text, (text) => onChange({ ...block, text }))
        : null}

      {block.type === 'quote' ? (
        <>
          {block.paragraphs.map((paragraph, index) => (
            <div className="tb-quote-paragraph-editor" key={index}>
              <div className="tb-quote-paragraph-heading">
                <Typography.Text type="secondary">原文第 {index + 1} 行</Typography.Text>
                <Button
                  type="text"
                  danger
                  size="small"
                  icon={<DeleteOutlined />}
                  disabled={block.paragraphs.length <= 1}
                  onClick={() => onChange({
                    ...block,
                    paragraphs: block.paragraphs.filter((_, paragraphIndex) => paragraphIndex !== index),
                  })}
                />
              </div>
              {anchorEditor(`Paragraph ${index + 1}`, paragraph, (next) => onChange({
                ...block,
                paragraphs: block.paragraphs.map((current, paragraphIndex) => paragraphIndex === index ? next : current),
              }))}
            </div>
          ))}
          <Button
            block
            type="dashed"
            icon={<PlusOutlined />}
            onClick={() => onChange({ ...block, paragraphs: [...block.paragraphs, emptyText()] })}
          >
            添加原文行
          </Button>
        </>
      ) : null}

      {block.type === 'order_list' ? renderOrderList(block) : null}

      {block.type === 'image' ? (
        <>
          <Form.Item label="图片 URL">
            <Input value={block.url ?? ''} onChange={(event) => onChange({ ...block, url: event.target.value })} />
          </Form.Item>
          <Form.Item label="source_id" help="嵌入课程后推荐使用顶层 src 资源 ID">
            <Input value={block.source_id ?? ''} onChange={(event) => onChange({ ...block, source_id: event.target.value || undefined })} />
          </Form.Item>
          <Form.Item label="替代文本">
            <Input value={block.alt ?? ''} onChange={(event) => onChange({ ...block, alt: event.target.value })} />
          </Form.Item>
          {anchorEditor('图片说明', block.caption ?? emptyText(), (caption) => onChange({ ...block, caption }))}
        </>
      ) : null}

      {block.type === 'video' ? (
        <>
          <Form.Item label="视频 URL">
            <Input value={block.url ?? ''} onChange={(event) => onChange({ ...block, url: event.target.value })} />
          </Form.Item>
          <Form.Item label="source_id" help="嵌入课程后推荐使用顶层 src 资源 ID">
            <Input value={block.source_id ?? ''} onChange={(event) => onChange({ ...block, source_id: event.target.value || undefined })} />
          </Form.Item>
          <Form.Item label="封面 URL">
            <Input value={block.poster_url ?? ''} onChange={(event) => onChange({ ...block, poster_url: event.target.value })} />
          </Form.Item>
          <Space size="large" style={{ marginBottom: 14 }}>
            <Switch checked={block.controls !== false} onChange={(controls) => onChange({ ...block, controls })} checkedChildren="控制条" unCheckedChildren="无控制条" />
            <Switch checked={Boolean(block.autoplay)} onChange={(autoplay) => onChange({ ...block, autoplay })} checkedChildren="自动播" unCheckedChildren="手动播" />
            <Switch checked={Boolean(block.loop)} onChange={(loop) => onChange({ ...block, loop })} checkedChildren="循环" unCheckedChildren="单次" />
          </Space>
          {anchorEditor('视频说明', block.caption ?? emptyText(), (caption) => onChange({ ...block, caption }))}
        </>
      ) : null}
    </Form>
  )
}
