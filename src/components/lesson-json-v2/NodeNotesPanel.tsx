import { useMemo, useState } from 'react'
import { Button, Dropdown, Input, Select, Tag, Tooltip, Typography, message } from 'antd'
import { CheckOutlined, DeleteOutlined, DownloadOutlined, UndoOutlined } from '@ant-design/icons'
import { findNodeLocation } from '../../types/atbReactionV2Editor'
import { useAtbV2EditorStore } from '../../pages/lesson-json-design-v2/store'
import { downloadTextFile, notesToCsv, notesToMarkdown } from '../../utils/noteExport'

const { Text } = Typography

/** 常见问题维度，点选后随备注一起记录，方便定位是哪个 component 出问题 */
const PRESET_TAGS = ['语音', '字幕', '图片', '视频', '文案', '交互', '其他']

interface NoteTarget {
  activityId: string
  nodeId: string
  label: string
}

interface Props {
  /** 预览播放中的节点；有值时备注优先记到该节点（否则记到左侧选中节点） */
  playingTarget?: NoteTarget | null
}

/** 紧凑版快速备注：单行「标签 + 输入」，列表限高，适合内嵌在预览框里 */
export default function NodeNotesPanel({ playingTarget = null }: Props) {
  const doc = useAtbV2EditorStore((s) => s.doc)
  const selection = useAtbV2EditorStore((s) => s.selection)
  const setSelection = useAtbV2EditorStore((s) => s.setSelection)
  const notes = useAtbV2EditorStore((s) => s.notes)
  const addNote = useAtbV2EditorStore((s) => s.addNote)
  const toggleNoteDone = useAtbV2EditorStore((s) => s.toggleNoteDone)
  const removeNote = useAtbV2EditorStore((s) => s.removeNote)

  const [tag, setTag] = useState<string | null>(null)
  const [text, setText] = useState('')

  const selectedNode = useMemo<NoteTarget | null>(() => {
    if (selection.kind !== 'node') return null
    const location = findNodeLocation(doc, selection.activityId, selection.nodeId)
    if (!location) return null
    return {
      activityId: selection.activityId,
      nodeId: selection.nodeId,
      label: `A${location.activityIndex + 1} · 节点${location.nodeIndex + 1}`,
    }
  }, [doc, selection])

  const target = playingTarget ?? selectedNode
  const targetFromPlaying = playingTarget !== null
  const openCount = useMemo(() => notes.filter((n) => !n.done).length, [notes])

  const submit = () => {
    const trimmed = text.trim()
    if (!target) {
      message.warning('先选中一个节点或开始预览，再记备注')
      return
    }
    if (!trimmed) return
    addNote({
      activityId: target.activityId,
      nodeId: target.nodeId,
      locationLabel: target.label,
      tag,
      text: trimmed,
    })
    setText('')
  }

  const jumpTo = (activityId: string, nodeId: string) => {
    if (!findNodeLocation(doc, activityId, nodeId)) {
      message.warning('该节点已不存在（可能被删除）')
      return
    }
    setSelection({ kind: 'node', activityId, nodeId })
  }

  const exportNotes = (format: 'md' | 'csv') => {
    if (notes.length === 0) {
      message.info('暂无备注可导出')
      return
    }
    const stamp = new Date().toISOString().slice(0, 10)
    if (format === 'md') {
      downloadTextFile(`快速备注_${stamp}.md`, notesToMarkdown(notes, `快速备注（${stamp}）`), 'text/markdown')
    } else {
      downloadTextFile(`快速备注_${stamp}.csv`, notesToCsv(notes), 'text/csv')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Text strong style={{ fontSize: 12, flexShrink: 0 }}>
          快速备注
        </Text>
        <Text type="secondary" style={{ fontSize: 11, flex: 1, minWidth: 0 }} ellipsis>
          {target
            ? `记到：${target.label}${targetFromPlaying ? '（播放中）' : ''}`
            : '选中节点或开始预览后可记'}
        </Text>
        <Text type="secondary" style={{ fontSize: 11, flexShrink: 0 }}>
          {openCount} 待处理
        </Text>
        <Dropdown
          trigger={['click']}
          menu={{
            items: [
              { key: 'md', label: '导出 Markdown' },
              { key: 'csv', label: '导出 CSV（Excel）' },
            ],
            onClick: ({ key }) => exportNotes(key as 'md' | 'csv'),
          }}
        >
          <Tooltip title="导出全部备注">
            <Button
              type="text"
              size="small"
              style={{ height: 20, width: 20, minWidth: 20, flexShrink: 0 }}
              icon={<DownloadOutlined />}
            />
          </Tooltip>
        </Dropdown>
      </div>

      <div style={{ display: 'flex', gap: 6 }}>
        <Select
          size="small"
          value={tag}
          onChange={(v) => setTag(v ?? null)}
          allowClear
          placeholder="标签"
          style={{ width: 84, flexShrink: 0 }}
          options={PRESET_TAGS.map((t) => ({ value: t, label: t }))}
        />
        <Input
          size="small"
          value={text}
          disabled={!target}
          onChange={(e) => setText(e.target.value)}
          onPressEnter={submit}
          placeholder={target ? '问题描述，回车记录' : '先选中节点或开始预览'}
          allowClear
        />
      </div>

      {notes.length === 0 ? null : (
        <div style={{ maxHeight: 132, overflow: 'auto' }}>
          {notes.map((note) => (
            <div
              key={note.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 0',
                opacity: note.done ? 0.55 : 1,
              }}
            >
              <Tag
                color="blue"
                style={{
                  marginRight: 0,
                  fontSize: 11,
                  lineHeight: '16px',
                  padding: '0 4px',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
                onClick={() => jumpTo(note.activityId, note.nodeId)}
              >
                {note.locationLabel}
              </Tag>
              {note.tag ? (
                <Tag
                  color="purple"
                  style={{
                    marginRight: 0,
                    fontSize: 11,
                    lineHeight: '16px',
                    padding: '0 4px',
                    flexShrink: 0,
                  }}
                >
                  {note.tag}
                </Tag>
              ) : null}
              <Text
                style={{
                  fontSize: 12,
                  flex: 1,
                  minWidth: 0,
                  textDecoration: note.done ? 'line-through' : 'none',
                }}
                ellipsis={{ tooltip: note.text }}
              >
                {note.text}
              </Text>
              <Tooltip title={note.done ? '恢复为待处理' : '标记已解决'}>
                <Button
                  type="text"
                  size="small"
                  style={{ height: 20, width: 20, minWidth: 20 }}
                  icon={note.done ? <UndoOutlined /> : <CheckOutlined />}
                  onClick={() => toggleNoteDone(note.id)}
                />
              </Tooltip>
              <Button
                type="text"
                size="small"
                danger
                style={{ height: 20, width: 20, minWidth: 20 }}
                icon={<DeleteOutlined />}
                onClick={() => removeNote(note.id)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
