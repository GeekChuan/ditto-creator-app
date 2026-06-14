import { Button, Select, Space, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { AtbActivity, AtbSrcAsset, ButtonComponent, SceneNode } from '../../types/atbReactionV2'
import {
  COMPONENT_TYPES,
  createDefaultComponent,
  createDefaultNode,
  createFollowReadingNode,
  createPlayVideoNode,
  createSingleChoiceNode,
  createVoiceQaSimpleNode,
  isFollowReadingNode,
  isPlayVideoNode,
  isSingleChoiceNode,
  isVoiceQaSimpleNode,
  moveItem,
} from '../../types/atbReactionV2Editor'
import { isLectureWithPracticeActivity, isSubmergeSequenceActivity } from '../../types/atbReactionV2'
import type { SelectionPath } from '../../types/atbReactionV2Editor'

const { Text } = Typography

interface Props {
  activity: AtbActivity
  activityIndex: number
  src: AtbSrcAsset[]
  selection: SelectionPath
  onSelect: (path: SelectionPath) => void
  onChangeActivity: (next: AtbActivity) => void
}

export default function NodeListEditor({
  activity,
  activityIndex,
  src,
  selection,
  onSelect,
  onChangeActivity,
}: Props) {
  const updateNodes = (nodes: SceneNode[]) => {
    onChangeActivity({ ...activity, nodes })
  }

  const updateNode = (nodeIndex: number, node: SceneNode) => {
    updateNodes(activity.nodes.map((n, i) => (i === nodeIndex ? node : n)))
  }

  const addNode = () => {
    const id = activity.nodes.length
      ? Math.max(
          ...activity.nodes.map((n) =>
            typeof n.id === 'number' ? n.id : parseInt(String(n.id), 10) || 0,
          ),
        ) + 1
      : 1
    updateNodes([...activity.nodes, createDefaultNode(activity.type, src, id)])
  }

  const addEndButton = (nodeIndex: number) => {
    if (!isSubmergeSequenceActivity(activity)) return
    const node = activity.nodes[nodeIndex]
    if (!node) return
    const btn = createDefaultComponent('button', src) as ButtonComponent
    btn.text = '开始学习'
    btn.click_signal = activity.end_signal
    updateNode(nodeIndex, {
      ...node,
      components: [...node.components, btn],
    })
  }

  const addPlayVideoNode = () => {
    const id = activity.nodes.length
      ? Math.max(
          ...activity.nodes.map((n) =>
            typeof n.id === 'number' ? n.id : parseInt(String(n.id), 10) || 0,
          ),
        ) + 1
      : 1
    updateNodes([...activity.nodes, createPlayVideoNode(src, id)])
  }

  const addFollowReadingNode = () => {
    const id = activity.nodes.length
      ? Math.max(
          ...activity.nodes.map((n) =>
            typeof n.id === 'number' ? n.id : parseInt(String(n.id), 10) || 0,
          ),
        ) + 1
      : 1
    updateNodes([...activity.nodes, createFollowReadingNode(src, id)])
  }

  const addSingleChoiceNode = () => {
    const id = activity.nodes.length
      ? Math.max(
          ...activity.nodes.map((n) =>
            typeof n.id === 'number' ? n.id : parseInt(String(n.id), 10) || 0,
          ),
        ) + 1
      : 1
    updateNodes([...activity.nodes, createSingleChoiceNode(src, id)])
  }

  const addVoiceQaSimpleNode = () => {
    const id = activity.nodes.length
      ? Math.max(
          ...activity.nodes.map((n) =>
            typeof n.id === 'number' ? n.id : parseInt(String(n.id), 10) || 0,
          ),
        ) + 1
      : 1
    updateNodes([...activity.nodes, createVoiceQaSimpleNode(src, id)])
  }

  const nodeColumns: ColumnsType<SceneNode> = [
    {
      title: 'id',
      width: 60,
      dataIndex: 'id',
    },
    {
      title: 'components',
      render: (_, node) => {
        const types = node.components.map((c) => c.type).join(', ')
        if (isPlayVideoNode(node)) return `playVideo · ${types}`
        if (isFollowReadingNode(node)) return `followReading · ${types}`
        if (isSingleChoiceNode(node)) return `singleChoice · ${types}`
        if (isVoiceQaSimpleNode(node)) return `voiceQa · ${types}`
        return types
      },
    },
    {
      title: '操作',
      width: 280,
      render: (_, node, nodeIndex) => (
        <Space wrap size={4}>
          <Button size="small" onClick={() => onSelect({ kind: 'node', activityIndex, nodeIndex })}>
            编辑
          </Button>
          <Button
            size="small"
            disabled={nodeIndex === 0}
            onClick={() => updateNodes(moveItem(activity.nodes, nodeIndex, nodeIndex - 1))}
          >
            上移
          </Button>
          <Button
            size="small"
            disabled={nodeIndex === activity.nodes.length - 1}
            onClick={() => updateNodes(moveItem(activity.nodes, nodeIndex, nodeIndex + 1))}
          >
            下移
          </Button>
          <Button
            size="small"
            onClick={() => {
              const copy = structuredClone(node)
              copy.id = (typeof copy.id === 'number' ? copy.id : 0) + 1000
              updateNodes([...activity.nodes, copy])
            }}
          >
            复制
          </Button>
          {isSubmergeSequenceActivity(activity) ? (
            <Button size="small" onClick={() => addEndButton(nodeIndex)}>
              添加结束按钮
            </Button>
          ) : null}
          <Button
            size="small"
            danger
            onClick={() => updateNodes(activity.nodes.filter((_, i) => i !== nodeIndex))}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ]

  const selectedNodeIndex =
    selection.kind === 'node' || selection.kind === 'component'
      ? selection.nodeIndex
      : -1
  const selectedNode =
    selectedNodeIndex >= 0 ? activity.nodes[selectedNodeIndex] : null

  return (
    <div>
      <Space style={{ marginBottom: 8 }}>
        <Text strong>Nodes</Text>
        <Button type="primary" size="small" onClick={addNode}>
          添加 Node
        </Button>
        {isLectureWithPracticeActivity(activity) ? (
          <>
            <Button size="small" onClick={addPlayVideoNode}>
              添加 playVideo 节点
            </Button>
            <Button size="small" onClick={addFollowReadingNode}>
              添加跟读节点
            </Button>
            <Button size="small" onClick={addSingleChoiceNode}>
              添加选择题节点
            </Button>
            <Button size="small" onClick={addVoiceQaSimpleNode}>
              添加语音问答题节点
            </Button>
          </>
        ) : null}
      </Space>
      <Table
        size="small"
        rowKey={(n) => String(n.id)}
        pagination={false}
        dataSource={activity.nodes}
        columns={nodeColumns}
      />
      {selectedNode ? (
        <div style={{ marginTop: 16 }}>
          <Text strong>Node {selectedNode.id} · Components</Text>
          <Table
            size="small"
            style={{ marginTop: 8 }}
            rowKey={(_, i) => String(i)}
            pagination={false}
            dataSource={selectedNode.components}
            columns={[
              {
                title: 'type',
                dataIndex: 'type',
                width: 140,
              },
              {
                title: '操作',
                render: (_, comp, componentIndex) => (
                  <Space size={4}>
                    <Button
                      size="small"
                      onClick={() =>
                        onSelect({
                          kind: 'component',
                          activityIndex,
                          nodeIndex: selectedNodeIndex,
                          componentIndex,
                        })
                      }
                    >
                      编辑
                    </Button>
                    <Button
                      size="small"
                      disabled={componentIndex === 0}
                      onClick={() => {
                        const comps = moveItem(
                          selectedNode.components,
                          componentIndex,
                          componentIndex - 1,
                        )
                        updateNode(selectedNodeIndex, { ...selectedNode, components: comps })
                      }}
                    >
                      上移
                    </Button>
                    <Button
                      size="small"
                      disabled={componentIndex === selectedNode.components.length - 1}
                      onClick={() => {
                        const comps = moveItem(
                          selectedNode.components,
                          componentIndex,
                          componentIndex + 1,
                        )
                        updateNode(selectedNodeIndex, { ...selectedNode, components: comps })
                      }}
                    >
                      下移
                    </Button>
                    <Button
                      size="small"
                      danger
                      onClick={() => {
                        const comps = selectedNode.components.filter((_, i) => i !== componentIndex)
                        updateNode(selectedNodeIndex, { ...selectedNode, components: comps })
                      }}
                    >
                      删除
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
          <Space style={{ marginTop: 8 }}>
            <Select
              size="small"
              placeholder="添加组件"
              style={{ width: 180 }}
              options={COMPONENT_TYPES.map((t) => ({ value: t, label: t }))}
              onChange={(type) => {
                const comp = createDefaultComponent(type, src)
                updateNode(selectedNodeIndex, {
                  ...selectedNode,
                  components: [...selectedNode.components, comp],
                })
              }}
              value={null}
            />
          </Space>
        </div>
      ) : null}
    </div>
  )
}
