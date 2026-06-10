import { useState } from 'react'
import { Button, Select, Space, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { AtbActivity, AtbActivityType, AtbReactionDocument } from '../../types/atbReactionV2'
import {
  createActivity,
  moveItem,
  nextActivityId,
} from '../../types/atbReactionV2Editor'
import type { SelectionPath } from '../../types/atbReactionV2Editor'
import ActivityMetaForm from './ActivityMetaForm'
import NodeListEditor from './NodeListEditor'
import ComponentEditor from './ComponentEditor'

const { Text, Title } = Typography

interface Props {
  doc: AtbReactionDocument
  selection: SelectionPath
  onSelect: (path: SelectionPath) => void
  onChangeActivities: (activities: AtbActivity[]) => void
}

export default function ActivitiesPanel({
  doc,
  selection,
  onSelect,
  onChangeActivities,
}: Props) {
  const [addType, setAddType] = useState<AtbActivityType>('submerge_sequence')

  const updateActivity = (index: number, activity: AtbActivity) => {
    onChangeActivities(doc.activities.map((a, i) => (i === index ? activity : a)))
  }

  const selectedActivityIndex =
    selection.kind === 'activity' ||
    selection.kind === 'node' ||
    selection.kind === 'component'
      ? selection.activityIndex
      : -1
  const selectedActivity =
    selectedActivityIndex >= 0 ? doc.activities[selectedActivityIndex] : null

  const selectedComponent =
    selection.kind === 'component' && selectedActivity
      ? selectedActivity.nodes[selection.nodeIndex]?.components[selection.componentIndex]
      : null

  const columns: ColumnsType<AtbActivity> = [
    { title: 'id', width: 60, dataIndex: 'id' },
    { title: 'type', width: 180, dataIndex: 'type' },
    {
      title: 'description',
      ellipsis: true,
      render: (_, row) => row.description || '—',
    },
    {
      title: 'nodes',
      width: 60,
      render: (_, row) => row.nodes.length,
    },
    {
      title: '操作',
      width: 260,
      render: (_, row, index) => (
        <Space wrap size={4}>
          <Button size="small" onClick={() => onSelect({ kind: 'activity', activityIndex: index })}>
            编辑
          </Button>
          <Button
            size="small"
            disabled={index === 0}
            onClick={() => onChangeActivities(moveItem(doc.activities, index, index - 1))}
          >
            上移
          </Button>
          <Button
            size="small"
            disabled={index === doc.activities.length - 1}
            onClick={() => onChangeActivities(moveItem(doc.activities, index, index + 1))}
          >
            下移
          </Button>
          <Button
            size="small"
            onClick={() => {
              const copy = structuredClone(row)
              copy.id = nextActivityId(doc.activities)
              onChangeActivities([...doc.activities, copy])
            }}
          >
            复制
          </Button>
          <Button
            size="small"
            danger
            onClick={() => onChangeActivities(doc.activities.filter((_, i) => i !== index))}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Space style={{ marginBottom: 12 }} wrap>
        <Text strong>Activities</Text>
        <Select
          size="small"
          style={{ width: 200 }}
          value={addType}
          onChange={setAddType}
          options={[
            { value: 'submerge_sequence', label: 'submerge_sequence' },
            { value: 'lecture_with_practice', label: 'lecture_with_practice' },
          ]}
        />
        <Button
          type="primary"
          size="small"
          onClick={() => {
            const id = nextActivityId(doc.activities)
            onChangeActivities([...doc.activities, createActivity(addType, id, doc.src)])
          }}
        >
          添加 Activity
        </Button>
      </Space>
      <Table
        size="small"
        rowKey={(a) => String(a.id)}
        pagination={false}
        dataSource={doc.activities}
        columns={columns}
        locale={{ emptyText: '请添加至少 1 个 Activity' }}
      />

      {selectedActivity && selectedActivityIndex >= 0 ? (
        <div style={{ marginTop: 20 }}>
          <Title level={5}>Activity 元数据</Title>
          <ActivityMetaForm
            activity={selectedActivity}
            src={doc.src}
            onChange={(a) => updateActivity(selectedActivityIndex, a)}
          />
          <NodeListEditor
            activity={selectedActivity}
            activityIndex={selectedActivityIndex}
            src={doc.src}
            selection={selection}
            onSelect={onSelect}
            onChangeActivity={(a) => updateActivity(selectedActivityIndex, a)}
          />
        </div>
      ) : null}

      {selectedComponent && selectedActivity && selection.kind === 'component' ? (
        <div style={{ marginTop: 20 }}>
          <Title level={5}>Component: {selectedComponent.type}</Title>
          <ComponentEditor
            component={selectedComponent}
            activity={selectedActivity}
            src={doc.src}
            onChange={(next) => {
              const { activityIndex, nodeIndex, componentIndex } = selection
              const activity = doc.activities[activityIndex]
              if (!activity) return
              const node = activity.nodes[nodeIndex]
              if (!node) return
              const components = node.components.map((c, i) =>
                i === componentIndex ? next : c,
              )
              const nodes = activity.nodes.map((n, i) =>
                i === nodeIndex ? { ...n, components } : n,
              )
              updateActivity(activityIndex, { ...activity, nodes })
            }}
          />
        </div>
      ) : null}
    </div>
  )
}
