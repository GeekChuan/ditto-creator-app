import { useMemo, useState } from 'react'
import { Alert, List, Segmented, Space, Tag, Typography } from 'antd'
import type { ValidationIssue } from '../../types/atbReactionV2Editor'
import {
  activityKeyOf,
  issueLocationLabel,
  nodeKeyOf,
} from '../../types/atbReactionV2Editor'
import { useAtbV2EditorStore } from '../../pages/lesson-json-design-v2/store'

const { Text } = Typography

interface Props {
  issues: ValidationIssue[]
}

export default function ValidationPanel({ issues }: Props) {
  const doc = useAtbV2EditorStore((s) => s.doc)
  const setSelection = useAtbV2EditorStore((s) => s.setSelection)
  const [tab, setTab] = useState<'error' | 'hint'>('error')

  const errors = useMemo(() => issues.filter((i) => i.severity === 'error'), [issues])
  const hints = useMemo(() => issues.filter((i) => i.severity === 'hint'), [issues])

  if (!issues.length) {
    return <Alert type="success" showIcon message="结构校验通过" />
  }

  const active = tab === 'error' ? errors : hints

  const jumpTo = (issue: ValidationIssue) => {
    if (issue.srcIndex != null) {
      setSelection({ kind: 'src' })
      return
    }
    if (issue.activityIndex == null) {
      setSelection({ kind: 'lesson' })
      return
    }
    const activity = doc.activities[issue.activityIndex]
    if (!activity) return
    const activityId = activityKeyOf(activity)
    if (issue.nodeIndex != null) {
      const node = activity.nodes[issue.nodeIndex]
      if (node) {
        setSelection({ kind: 'node', activityId, nodeId: nodeKeyOf(node) })
        return
      }
    }
    setSelection({ kind: 'activity', activityId })
  }

  return (
    <Space direction="vertical" size={8} style={{ width: '100%' }}>
      <Segmented
        size="small"
        value={tab}
        onChange={(v) => setTab(v as 'error' | 'hint')}
        options={[
          { label: `错误 ${errors.length}`, value: 'error' },
          { label: `提示 ${hints.length}`, value: 'hint' },
        ]}
      />
      <List
        size="small"
        dataSource={active}
        locale={{ emptyText: tab === 'error' ? '没有错误' : '没有提示' }}
        style={{ maxHeight: 280, overflow: 'auto' }}
        renderItem={(issue) => (
          <List.Item
            style={{ cursor: 'pointer', padding: '4px 0', border: 'none' }}
            onClick={() => jumpTo(issue)}
          >
            <Space size={6} align="start">
              <Tag
                color={issue.severity === 'error' ? 'red' : 'orange'}
                style={{ marginRight: 0, fontSize: 11, lineHeight: '16px', padding: '0 4px' }}
              >
                {issueLocationLabel(doc, issue)}
              </Tag>
              <Text style={{ fontSize: 12 }}>{issue.text}</Text>
            </Space>
          </List.Item>
        )}
      />
    </Space>
  )
}
