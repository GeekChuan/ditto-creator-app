import { useMemo } from 'react'
import { Badge, Button, Divider, Empty, List, Popconfirm, Space, Tag, Typography, message } from 'antd'
import { CopyOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import type { AtbActivity, SceneNode } from '../../types/atbReactionV2'
import type { ValidationIssue } from '../../types/atbReactionV2Editor'
import {
  activityKeyOf,
  findActivityIndexById,
  nextActivityId,
  nodeKeyOf,
} from '../../types/atbReactionV2Editor'
import { useAtbV2EditorStore } from '../../pages/lesson-json-design-v2/store'
import ActivityMetaForm from './ActivityMetaForm'
import { getNodeKind, getNodeSummary } from './lib/nodeSummary'
import { getNodeTemplates } from './lib/nodeTemplates'

const { Text } = Typography

interface Props {
  activityId: string
  issues: ValidationIssue[]
}

export default function ActivityEditorPanel({ activityId, issues }: Props) {
  const doc = useAtbV2EditorStore((s) => s.doc)
  const setSelection = useAtbV2EditorStore((s) => s.setSelection)
  const updateDoc = useAtbV2EditorStore((s) => s.updateDoc)

  const activityIndex = findActivityIndexById(doc, activityId)
  const activity = activityIndex >= 0 ? doc.activities[activityIndex] : undefined

  const nodeIssueCounts = useMemo(() => {
    const map = new Map<number, number>()
    for (const issue of issues) {
      if (issue.activityIndex !== activityIndex || issue.nodeIndex == null) continue
      map.set(issue.nodeIndex, (map.get(issue.nodeIndex) ?? 0) + 1)
    }
    return map
  }, [issues, activityIndex])

  if (!activity || activityIndex < 0) {
    return <Empty description="Activity 不存在，请在左侧大纲重新选择" />
  }

  const updateActivity = (next: AtbActivity, historyGroup?: string) => {
    updateDoc(
      (prev) => {
        const ai = findActivityIndexById(prev, activityId)
        if (ai < 0) return prev
        return {
          ...prev,
          activities: prev.activities.map((a, i) => (i === ai ? next : a)),
        }
      },
      historyGroup ? { historyGroup } : undefined,
    )
  }

  const appendNode = (node: SceneNode) => {
    updateDoc((prev) => {
      const ai = findActivityIndexById(prev, activityId)
      if (ai < 0) return prev
      return {
        ...prev,
        activities: prev.activities.map((a, i) =>
          i === ai ? { ...a, nodes: [...a.nodes, node] } : a,
        ),
      }
    })
    setSelection({ kind: 'node', activityId, nodeId: nodeKeyOf(node) })
  }

  const duplicateActivity = () => {
    const copy = structuredClone(activity)
    copy.id = nextActivityId(doc.activities)
    updateDoc((prev) => ({ ...prev, activities: [...prev.activities, copy] }))
    setSelection({ kind: 'activity', activityId: activityKeyOf(copy) })
    message.success(`已复制为 Activity ${copy.id}`)
  }

  const deleteActivity = () => {
    updateDoc((prev) => ({
      ...prev,
      activities: prev.activities.filter((a) => activityKeyOf(a) !== activityId),
    }))
    setSelection({ kind: 'lesson' })
    message.success('已删除 Activity')
  }

  const quickAddButtons = getNodeTemplates(activity, doc.src)

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
        <Text strong>Activity {activity.id} · {activity.type}</Text>
        <Space size={4}>
          <Button size="small" icon={<CopyOutlined />} onClick={duplicateActivity}>
            复制
          </Button>
          <Popconfirm title="删除该 Activity 及其全部节点？" onConfirm={deleteActivity}>
            <Button size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      </div>

      <ActivityMetaForm
        activity={activity}
        src={doc.src}
        onChange={(a) => updateActivity(a, `activity-meta:${activityId}`)}
      />

      <Divider style={{ margin: '12px 0' }} />

      <Space size={4} wrap style={{ marginBottom: 8 }}>
        <Text strong>节点（{activity.nodes.length}）</Text>
        {quickAddButtons.map(({ label, create }) => (
          <Button key={label} size="small" icon={<PlusOutlined />} onClick={() => appendNode(create())}>
            {label}
          </Button>
        ))}
      </Space>

      <List
        size="small"
        bordered
        dataSource={activity.nodes.map((node, nodeIndex) => ({ node, nodeIndex }))}
        locale={{ emptyText: '还没有节点，用上面的按钮添加' }}
        renderItem={({ node, nodeIndex }) => {
          const kind = getNodeKind(node)
          const issueCount = nodeIssueCounts.get(nodeIndex) ?? 0
          return (
            <List.Item
              style={{ cursor: 'pointer', padding: '6px 12px' }}
              onClick={() =>
                setSelection({ kind: 'node', activityId, nodeId: nodeKeyOf(node) })
              }
            >
              <Space size={8} style={{ width: '100%' }}>
                <Text type="secondary" style={{ fontSize: 12, width: 24, textAlign: 'right' }}>
                  {nodeIndex + 1}
                </Text>
                <Tag color={kind.color} style={{ marginRight: 0 }}>
                  {kind.label}
                </Tag>
                <Text style={{ fontSize: 13 }}>{getNodeSummary(node, 46)}</Text>
                {issueCount > 0 ? <Badge count={issueCount} size="small" /> : null}
              </Space>
            </List.Item>
          )
        }}
      />
    </div>
  )
}
