import { useMemo } from 'react'
import {
  Alert,
  Button,
  Collapse,
  Empty,
  Popconfirm,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd'
import {
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  ArrowUpOutlined,
  CopyOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons'
import type {
  ButtonComponent,
  SceneComponent,
  SceneComponentType,
  SceneNode,
} from '../../types/atbReactionV2'
import { isSubmergeSequenceActivity } from '../../types/atbReactionV2'
import type { ValidationIssue } from '../../types/atbReactionV2Editor'
import {
  COMPONENT_TYPES,
  createDefaultComponent,
  findNodeLocation,
  moveItem,
  newNodeId,
  nodeKeyOf,
} from '../../types/atbReactionV2Editor'
import { useAtbV2EditorStore } from '../../pages/lesson-json-design-v2/store'
import ComponentEditor from './ComponentEditor'
import { componentLabel, getNodeKind, getNodeSummary } from './lib/nodeSummary'

const { Text } = Typography

interface Props {
  activityId: string
  nodeId: string
  issues: ValidationIssue[]
  /** 打开单节点手机预览（从该节点开始播放） */
  onPreview?: () => void
}

export default function NodeEditorPanel({ activityId, nodeId, issues, onPreview }: Props) {
  const doc = useAtbV2EditorStore((s) => s.doc)
  const setSelection = useAtbV2EditorStore((s) => s.setSelection)
  const updateDoc = useAtbV2EditorStore((s) => s.updateDoc)

  const location = findNodeLocation(doc, activityId, nodeId)
  const activity = location ? doc.activities[location.activityIndex] : undefined
  const node = location && activity ? activity.nodes[location.nodeIndex] : undefined

  const nodeIssues = useMemo(() => {
    if (!location) return []
    return issues.filter(
      (i) => i.activityIndex === location.activityIndex && i.nodeIndex === location.nodeIndex,
    )
  }, [issues, location])

  if (!location || !activity || !node) {
    return <Empty description="节点不存在，请在左侧大纲重新选择" />
  }

  const { activityIndex, nodeIndex } = location
  const kind = getNodeKind(node)

  const updateNode = (nextNode: SceneNode, historyGroup?: string) => {
    updateDoc(
      (prev) => {
        const loc = findNodeLocation(prev, activityId, nodeId)
        if (!loc) return prev
        return {
          ...prev,
          activities: prev.activities.map((a, ai) =>
            ai === loc.activityIndex
              ? { ...a, nodes: a.nodes.map((n, ni) => (ni === loc.nodeIndex ? nextNode : n)) }
              : a,
          ),
        }
      },
      historyGroup ? { historyGroup } : undefined,
    )
  }

  const updateComponent = (componentIndex: number, next: SceneComponent) => {
    updateNode(
      {
        ...node,
        components: node.components.map((c, i) => (i === componentIndex ? next : c)),
      },
      `component:${activityId}:${nodeId}:${componentIndex}`,
    )
  }

  const moveComponent = (from: number, to: number) => {
    updateNode({ ...node, components: moveItem(node.components, from, to) })
  }

  const removeComponent = (componentIndex: number) => {
    updateNode({ ...node, components: node.components.filter((_, i) => i !== componentIndex) })
  }

  const addComponent = (type: SceneComponentType) => {
    updateNode({ ...node, components: [...node.components, createDefaultComponent(type, doc.src)] })
  }

  const gotoSibling = (offset: number) => {
    const target = activity.nodes[nodeIndex + offset]
    if (!target) return
    setSelection({ kind: 'node', activityId, nodeId: nodeKeyOf(target) })
  }

  const duplicateNode = () => {
    const copy = structuredClone(node)
    copy.id = newNodeId()
    updateDoc((prev) => {
      const loc = findNodeLocation(prev, activityId, nodeId)
      if (!loc) return prev
      return {
        ...prev,
        activities: prev.activities.map((a, ai) => {
          if (ai !== loc.activityIndex) return a
          const nodes = [...a.nodes]
          nodes.splice(loc.nodeIndex + 1, 0, copy)
          return { ...a, nodes }
        }),
      }
    })
    setSelection({ kind: 'node', activityId, nodeId: nodeKeyOf(copy) })
    message.success('已复制节点')
  }

  const deleteNode = () => {
    const neighbor = activity.nodes[nodeIndex + 1] ?? activity.nodes[nodeIndex - 1]
    updateDoc((prev) => {
      const loc = findNodeLocation(prev, activityId, nodeId)
      if (!loc) return prev
      return {
        ...prev,
        activities: prev.activities.map((a, ai) =>
          ai === loc.activityIndex
            ? { ...a, nodes: a.nodes.filter((_, ni) => ni !== loc.nodeIndex) }
            : a,
        ),
      }
    })
    if (neighbor) {
      setSelection({ kind: 'node', activityId, nodeId: nodeKeyOf(neighbor) })
    } else {
      setSelection({ kind: 'activity', activityId })
    }
    message.success('已删除节点')
  }

  const addEndButton = () => {
    if (!isSubmergeSequenceActivity(activity)) return
    const btn = createDefaultComponent('button', doc.src) as ButtonComponent
    btn.text = '开始学习'
    btn.click_signal = activity.end_signal
    updateNode({ ...node, components: [...node.components, btn] })
    message.success('已添加结束按钮（click_signal 已对齐 end_signal）')
  }

  const collapseItems = node.components.map((comp, componentIndex) => ({
    key: String(componentIndex),
    label: (
      <Space size={6}>
        <Text strong style={{ fontSize: 13 }}>
          {componentLabel(comp.type)}
        </Text>
        <Text type="secondary" style={{ fontSize: 11 }}>
          {comp.type}
        </Text>
      </Space>
    ),
    extra: (
      <Space size={0} onClick={(e) => e.stopPropagation()}>
        <Tooltip title="上移">
          <Button
            type="text"
            size="small"
            icon={<ArrowUpOutlined />}
            disabled={componentIndex === 0}
            onClick={() => moveComponent(componentIndex, componentIndex - 1)}
          />
        </Tooltip>
        <Tooltip title="下移">
          <Button
            type="text"
            size="small"
            icon={<ArrowDownOutlined />}
            disabled={componentIndex === node.components.length - 1}
            onClick={() => moveComponent(componentIndex, componentIndex + 1)}
          />
        </Tooltip>
        <Popconfirm title="删除该组件？" onConfirm={() => removeComponent(componentIndex)}>
          <Button type="text" size="small" danger icon={<DeleteOutlined />} />
        </Popconfirm>
      </Space>
    ),
    children: (
      <ComponentEditor
        component={comp}
        activity={activity}
        src={doc.src}
        onChange={(next) => updateComponent(componentIndex, next)}
      />
    ),
  }))

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
          marginBottom: 12,
        }}
      >
        <Space size={8} wrap>
          <Tag color={kind.color}>{kind.label}</Tag>
          <Text strong>{getNodeSummary(node, 36)}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            节点 {nodeIndex + 1} / {activity.nodes.length} · A{activity.id}
          </Text>
        </Space>
        <Space size={4} wrap>
          <Tooltip title="上一个节点">
            <Button
              size="small"
              icon={<ArrowLeftOutlined />}
              disabled={nodeIndex === 0}
              onClick={() => gotoSibling(-1)}
            />
          </Tooltip>
          <Tooltip title="下一个节点">
            <Button
              size="small"
              icon={<ArrowRightOutlined />}
              disabled={nodeIndex === activity.nodes.length - 1}
              onClick={() => gotoSibling(1)}
            />
          </Tooltip>
          {onPreview ? (
            <Button size="small" type="primary" ghost icon={<PlayCircleOutlined />} onClick={onPreview}>
              预览本节点
            </Button>
          ) : null}
          <Button size="small" icon={<CopyOutlined />} onClick={duplicateNode}>
            复制
          </Button>
          {isSubmergeSequenceActivity(activity) ? (
            <Button size="small" onClick={addEndButton}>
              添加结束按钮
            </Button>
          ) : null}
          <Popconfirm title="删除该节点？" onConfirm={deleteNode}>
            <Button size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      </div>

      {nodeIssues.length ? (
        <Alert
          type={nodeIssues.some((i) => i.severity === 'error') ? 'warning' : 'info'}
          showIcon
          style={{ marginBottom: 12 }}
          message={`本节点有 ${nodeIssues.length} 项校验提示`}
          description={
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {nodeIssues.map((i) => (
                <li key={i.raw} style={{ fontSize: 12 }}>
                  {i.text}
                </li>
              ))}
            </ul>
          }
        />
      ) : null}

      {node.components.length ? (
        <Collapse
          key={`${activityId}:${nodeId}:${activityIndex}:${nodeIndex}`}
          size="small"
          items={collapseItems}
        />
      ) : (
        <Empty description="该节点还没有组件" />
      )}

      <Space style={{ marginTop: 12 }}>
        <Select
          size="small"
          placeholder="添加组件"
          style={{ width: 220 }}
          options={COMPONENT_TYPES.map((t) => ({
            value: t,
            label: `${componentLabel(t)}（${t}）`,
          }))}
          value={null}
          onChange={(type) => addComponent(type as SceneComponentType)}
          showSearch
          optionFilterProp="label"
        />
      </Space>
    </div>
  )
}
