import { useEffect, useMemo, useRef, useState } from 'react'
import { Badge, Button, Dropdown, Input, Space, Switch, Tag, Tree, Typography, message } from 'antd'
import type { MenuProps } from 'antd'
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  CopyOutlined,
  DeleteOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import type { DataNode, TreeProps } from 'antd/es/tree'
import type { AtbActivity, AtbActivityType, AtbReactionDocument, SceneNode } from '../../types/atbReactionV2'
import type { EditorSelection, ValidationIssue } from '../../types/atbReactionV2Editor'
import {
  activityKeyOf,
  createActivity,
  findActivityIndexById,
  findNodeLocation,
  moveItem,
  newNodeId,
  nextActivityId,
  nodeKeyOf,
  suggestEndSignal,
} from '../../types/atbReactionV2Editor'
import { useAtbV2EditorStore } from '../../pages/lesson-json-design-v2/store'
import { ACTIVITY_TYPE_LABELS, getNodeKind, getNodeSummary } from './lib/nodeSummary'
import { getNodeTemplates } from './lib/nodeTemplates'

const { Text } = Typography

const KEY_LESSON = 'lesson'
const KEY_SRC = 'src'
const KEY_ACTIVITIES = 'activities'

function actKey(activity: AtbActivity): string {
  return `act:${activityKeyOf(activity)}`
}

function nodeTreeKey(activity: AtbActivity, node: SceneNode): string {
  return `node:${activityKeyOf(activity)}:${nodeKeyOf(node)}`
}

interface ParsedKey {
  kind: 'lesson' | 'src' | 'activities' | 'activity' | 'node'
  activityId?: string
  nodeId?: string
}

function parseKey(key: string): ParsedKey {
  if (key === KEY_LESSON) return { kind: 'lesson' }
  if (key === KEY_SRC) return { kind: 'src' }
  if (key === KEY_ACTIVITIES) return { kind: 'activities' }
  if (key.startsWith('act:')) return { kind: 'activity', activityId: key.slice(4) }
  if (key.startsWith('node:')) {
    const rest = key.slice(5)
    const sep = rest.indexOf(':')
    return { kind: 'node', activityId: rest.slice(0, sep), nodeId: rest.slice(sep + 1) }
  }
  return { kind: 'lesson' }
}

function selectionToKey(selection: EditorSelection): string {
  switch (selection.kind) {
    case 'lesson':
      return KEY_LESSON
    case 'src':
      return KEY_SRC
    case 'activity':
      return `act:${selection.activityId}`
    case 'node':
      return `node:${selection.activityId}:${selection.nodeId}`
  }
}

interface IssueCount {
  errors: number
  hints: number
}

function buildIssueMaps(doc: AtbReactionDocument, issues: ValidationIssue[]) {
  const byNode = new Map<string, IssueCount>()
  const byActivity = new Map<string, IssueCount>()
  for (const issue of issues) {
    if (issue.activityIndex == null) continue
    const activity = doc.activities[issue.activityIndex]
    if (!activity) continue
    const aKey = activityKeyOf(activity)
    const bump = (map: Map<string, IssueCount>, key: string) => {
      const c = map.get(key) ?? { errors: 0, hints: 0 }
      if (issue.severity === 'error') c.errors += 1
      else c.hints += 1
      map.set(key, c)
    }
    bump(byActivity, aKey)
    if (issue.nodeIndex != null) {
      const node = activity.nodes[issue.nodeIndex]
      if (node) bump(byNode, `${aKey}:${nodeKeyOf(node)}`)
    }
  }
  return { byNode, byActivity }
}

function IssueBadge({ count }: { count?: IssueCount }) {
  if (!count) return null
  if (count.errors > 0) {
    return <Badge count={count.errors} size="small" style={{ marginLeft: 4 }} />
  }
  if (count.hints > 0) {
    return <Badge color="orange" dot style={{ marginLeft: 4 }} />
  }
  return null
}

interface Props {
  issues: ValidationIssue[]
}

/** Activity 类型子菜单（新增/插入共用），key 为 `${prefix}:${type}` */
function activityTypeChildren(prefix: string) {
  return (Object.entries(ACTIVITY_TYPE_LABELS) as [AtbActivityType, string][]).map(
    ([type, label]) => ({ key: `${prefix}:${type}`, label }),
  )
}

export default function OutlinePanel({ issues }: Props) {
  const doc = useAtbV2EditorStore((s) => s.doc)
  const selection = useAtbV2EditorStore((s) => s.selection)
  const setSelection = useAtbV2EditorStore((s) => s.setSelection)
  const updateDoc = useAtbV2EditorStore((s) => s.updateDoc)

  const [query, setQuery] = useState('')
  const [onlyIssues, setOnlyIssues] = useState(false)
  const [multiKeys, setMultiKeys] = useState<string[]>([])
  const [expandedKeys, setExpandedKeys] = useState<string[]>(() => [
    KEY_ACTIVITIES,
    ...doc.activities.map(actKey),
  ])
  const [treeHeight, setTreeHeight] = useState(480)
  const treeWrapRef = useRef<HTMLDivElement>(null)
  // 右键菜单：节点行（插入/复制/删除节点）或 Activity 行（插入/复制/删除 Activity）
  const [ctxMenu, setCtxMenu] = useState<
    | { x: number; y: number; kind: 'node'; activityId: string; nodeId: string }
    | { x: number; y: number; kind: 'activity'; activityId: string }
    | null
  >(null)

  // 受控 Dropdown 没有触发器，外部点击 / Esc 需要手动关闭
  useEffect(() => {
    if (!ctxMenu) return
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      // 点在菜单内部时交给菜单自己的 onClick 处理
      if (target?.closest('.ant-dropdown')) return
      setCtxMenu(null)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setCtxMenu(null)
    }
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [ctxMenu])

  useEffect(() => {
    const el = treeWrapRef.current
    if (!el) return
    const observer = new ResizeObserver(() => {
      setTreeHeight(Math.max(el.clientHeight, 200))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const { byNode, byActivity } = useMemo(() => buildIssueMaps(doc, issues), [doc, issues])

  const filtering = query.trim().length > 0 || onlyIssues

  const treeData: DataNode[] = useMemo(() => {
    const q = query.trim().toLowerCase()

    const matchNode = (activity: AtbActivity, node: SceneNode): boolean => {
      if (onlyIssues) {
        const count = byNode.get(`${activityKeyOf(activity)}:${nodeKeyOf(node)}`)
        if (!count || (count.errors === 0 && count.hints === 0)) return false
      }
      if (!q) return true
      const kind = getNodeKind(node)
      const haystack = `${getNodeSummary(node, 200)} ${kind.label} ${String(node.id)}`.toLowerCase()
      return haystack.includes(q)
    }

    const activityChildren = doc.activities
      .map((activity, activityIndex) => {
        const aKey = activityKeyOf(activity)
        const visibleNodes = activity.nodes
          .map((node, nodeIndex) => ({ node, nodeIndex }))
          .filter(({ node }) => !filtering || matchNode(activity, node))

        if (filtering && visibleNodes.length === 0) return null

        const children: DataNode[] = visibleNodes.map(({ node, nodeIndex }) => {
          const kind = getNodeKind(node)
          return {
            key: nodeTreeKey(activity, node),
            isLeaf: true,
            title: (
              <span style={{ whiteSpace: 'nowrap' }}>
                <Text type="secondary" style={{ fontSize: 11, marginRight: 4 }}>
                  {nodeIndex + 1}
                </Text>
                <Tag color={kind.color} style={{ marginRight: 4, fontSize: 11, lineHeight: '16px', padding: '0 4px' }}>
                  {kind.label}
                </Tag>
                <Text style={{ fontSize: 12 }}>{getNodeSummary(node, 22)}</Text>
                <IssueBadge count={byNode.get(`${aKey}:${nodeKeyOf(node)}`)} />
              </span>
            ),
          }
        })

        return {
          key: actKey(activity),
          title: (
            <span style={{ whiteSpace: 'nowrap' }}>
              <Text strong style={{ fontSize: 12 }}>
                A{activity.id} {ACTIVITY_TYPE_LABELS[activity.type] ?? activity.type}
              </Text>
              <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
                {activity.nodes.length} 节点
              </Text>
              <IssueBadge count={byActivity.get(aKey)} />
            </span>
          ),
          children,
          activityIndex,
        } as DataNode
      })
      .filter((n): n is DataNode => n !== null)

    return [
      {
        key: KEY_LESSON,
        isLeaf: true,
        title: <Text style={{ fontSize: 12 }}>{doc.lesson_title?.trim() || '课节信息'}</Text>,
      },
      {
        key: KEY_SRC,
        isLeaf: true,
        title: <Text style={{ fontSize: 12 }}>资源池 src（{doc.src.length}）</Text>,
      },
      {
        key: KEY_ACTIVITIES,
        title: <Text style={{ fontSize: 12 }}>Activities（{doc.activities.length}）</Text>,
        children: activityChildren,
      },
    ]
  }, [doc, query, onlyIssues, filtering, byNode, byActivity])

  const effectiveExpandedKeys = useMemo(() => {
    if (!filtering) return expandedKeys
    return [KEY_ACTIVITIES, ...doc.activities.map(actKey)]
  }, [filtering, expandedKeys, doc.activities])

  const selectedKeys = multiKeys.length > 1 ? multiKeys : [selectionToKey(selection)]

  const handleSelect: TreeProps['onSelect'] = (keys, info) => {
    // antd Tree 在 multiple 模式下普通单击也会累加选中，
    // 因此只有按住修饰键的点击才进入多选批量模式，普通单击一律直接导航。
    const native = info.nativeEvent as MouseEvent | undefined
    const withModifier = Boolean(native && (native.metaKey || native.ctrlKey || native.shiftKey))
    const nodeKeys = keys.map(String).filter((k) => k.startsWith('node:'))
    if (withModifier && nodeKeys.length > 1) {
      setMultiKeys(nodeKeys)
      return
    }
    setMultiKeys([])
    const parsed = parseKey(String(info.node.key))
    if (parsed.kind === 'lesson') setSelection({ kind: 'lesson' })
    else if (parsed.kind === 'src') setSelection({ kind: 'src' })
    else if (parsed.kind === 'activity' && parsed.activityId) {
      setSelection({ kind: 'activity', activityId: parsed.activityId })
    } else if (parsed.kind === 'node' && parsed.activityId && parsed.nodeId) {
      setSelection({ kind: 'node', activityId: parsed.activityId, nodeId: parsed.nodeId })
    }
  }

  const batchTargets = useMemo(() => multiKeys.map(parseKey).filter((p) => p.kind === 'node'), [multiKeys])

  const batchDelete = () => {
    const targets = batchTargets
    updateDoc((prev) => ({
      ...prev,
      activities: prev.activities.map((activity) => {
        const aKey = activityKeyOf(activity)
        const removed = new Set(
          targets.filter((t) => t.activityId === aKey).map((t) => t.nodeId!),
        )
        if (!removed.size) return activity
        return { ...activity, nodes: activity.nodes.filter((n) => !removed.has(nodeKeyOf(n))) }
      }),
    }))
    setMultiKeys([])
    message.success(`已删除 ${targets.length} 个节点`)
  }

  const batchDuplicate = () => {
    const targets = batchTargets
    updateDoc((prev) => ({
      ...prev,
      activities: prev.activities.map((activity) => {
        const aKey = activityKeyOf(activity)
        const picked = new Set(
          targets.filter((t) => t.activityId === aKey).map((t) => t.nodeId!),
        )
        if (!picked.size) return activity
        const nodes: SceneNode[] = []
        for (const node of activity.nodes) {
          nodes.push(node)
          if (picked.has(nodeKeyOf(node))) {
            const copy = structuredClone(node)
            copy.id = newNodeId()
            nodes.push(copy)
          }
        }
        return { ...activity, nodes }
      }),
    }))
    setMultiKeys([])
    message.success(`已复制 ${targets.length} 个节点`)
  }

  const handleRightClick: TreeProps['onRightClick'] = ({ event, node }) => {
    const parsed = parseKey(String(node.key))
    if (parsed.kind === 'node' && parsed.activityId && parsed.nodeId) {
      event.preventDefault()
      setCtxMenu({
        x: event.clientX,
        y: event.clientY,
        kind: 'node',
        activityId: parsed.activityId,
        nodeId: parsed.nodeId,
      })
      return
    }
    if (parsed.kind === 'activity' && parsed.activityId) {
      event.preventDefault()
      setCtxMenu({ x: event.clientX, y: event.clientY, kind: 'activity', activityId: parsed.activityId })
      return
    }
    setCtxMenu(null)
  }

  const ctxTemplates = useMemo(() => {
    if (!ctxMenu || ctxMenu.kind !== 'node') return []
    const ai = findActivityIndexById(doc, ctxMenu.activityId)
    const activity = doc.activities[ai]
    if (!activity) return []
    return getNodeTemplates(activity, doc.src)
  }, [ctxMenu, doc])

  const ctxMenuItems: MenuProps['items'] = useMemo(() => {
    if (!ctxMenu) return []
    if (ctxMenu.kind === 'activity') {
      return [
        {
          key: 'act-above',
          label: '向上添加 1 个 Activity',
          icon: <ArrowUpOutlined />,
          children: activityTypeChildren('act-above'),
        },
        {
          key: 'act-below',
          label: '向下添加 1 个 Activity',
          icon: <ArrowDownOutlined />,
          children: activityTypeChildren('act-below'),
        },
        { type: 'divider' },
        { key: 'act-dup', label: '复制该 Activity（含全部节点）', icon: <CopyOutlined /> },
        { type: 'divider' },
        { key: 'act-del', label: '删除该 Activity', icon: <DeleteOutlined />, danger: true },
      ]
    }
    const typeChildren = (dir: 'above' | 'below') =>
      ctxTemplates.map((t, i) => ({ key: `${dir}:${i}`, label: t.label }))
    return [
      {
        key: 'above',
        label: '向上添加 1 个节点',
        icon: <ArrowUpOutlined />,
        children: typeChildren('above'),
      },
      {
        key: 'below',
        label: '向下添加 1 个节点',
        icon: <ArrowDownOutlined />,
        children: typeChildren('below'),
      },
      { type: 'divider' },
      {
        key: 'dup',
        label: '复制该节点',
        icon: <CopyOutlined />,
        children: [
          { key: 'dup:next', label: '到下一个位置' },
          { key: 'dup:end', label: '到 Activity 末尾' },
        ],
      },
      { type: 'divider' },
      { key: 'delete', label: '删除该节点', icon: <DeleteOutlined />, danger: true },
    ]
  }, [ctxMenu, ctxTemplates])

  /** 在指定位置插入新 Activity（带默认节点）并选中它 */
  const addActivityAt = (type: AtbActivityType, insertIndex: number) => {
    const activity = createActivity(type, nextActivityId(doc.activities), doc.src)
    updateDoc((prev) => ({
      ...prev,
      activities: [
        ...prev.activities.slice(0, insertIndex),
        activity,
        ...prev.activities.slice(insertIndex),
      ],
    }))
    const aKey = activityKeyOf(activity)
    setExpandedKeys((keys) => Array.from(new Set([...keys, KEY_ACTIVITIES, `act:${aKey}`])))
    setSelection({ kind: 'activity', activityId: aKey })
    message.success(`已添加 A${activity.id} ${ACTIVITY_TYPE_LABELS[type]}`)
  }

  const duplicateActivity = (activityId: string) => {
    const index = findActivityIndexById(doc, activityId)
    const source = doc.activities[index]
    if (!source) return
    const copy = structuredClone(source)
    copy.id = nextActivityId(doc.activities)
    copy.end_signal = suggestEndSignal(copy.id)
    copy.nodes = copy.nodes.map((n) => ({ ...n, id: newNodeId() }))
    updateDoc((prev) => ({
      ...prev,
      activities: [...prev.activities.slice(0, index + 1), copy, ...prev.activities.slice(index + 1)],
    }))
    const aKey = activityKeyOf(copy)
    setExpandedKeys((keys) => Array.from(new Set([...keys, `act:${aKey}`])))
    setSelection({ kind: 'activity', activityId: aKey })
    message.success(`已复制为 A${copy.id}（含 ${copy.nodes.length} 个节点）`)
  }

  const deleteActivity = (activityId: string) => {
    updateDoc((prev) => ({
      ...prev,
      activities: prev.activities.filter((a) => activityKeyOf(a) !== activityId),
    }))
    message.success('已删除 Activity（可 Cmd/Ctrl+Z 撤销）')
  }

  /** 在指定位置插入节点并选中它 */
  const insertNodeAt = (
    activityId: string,
    node: SceneNode,
    resolveIndex: (activity: AtbActivity, nodeIndex: number) => number,
    nodeId: string,
  ) => {
    updateDoc((prev) => {
      const location = findNodeLocation(prev, activityId, nodeId)
      if (!location) return prev
      const activity = prev.activities[location.activityIndex]!
      const insertAt = resolveIndex(activity, location.nodeIndex)
      return {
        ...prev,
        activities: prev.activities.map((a, i) =>
          i === location.activityIndex
            ? { ...a, nodes: [...a.nodes.slice(0, insertAt), node, ...a.nodes.slice(insertAt)] }
            : a,
        ),
      }
    })
    setSelection({ kind: 'node', activityId, nodeId: nodeKeyOf(node) })
  }

  const handleCtxMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (!ctxMenu) return

    if (ctxMenu.kind === 'activity') {
      const index = findActivityIndexById(doc, ctxMenu.activityId)
      if (key === 'act-dup') {
        duplicateActivity(ctxMenu.activityId)
      } else if (key === 'act-del') {
        deleteActivity(ctxMenu.activityId)
      } else if (key.startsWith('act-above:') || key.startsWith('act-below:')) {
        const [dir, type] = key.split(':') as ['act-above' | 'act-below', AtbActivityType]
        if (index >= 0) addActivityAt(type, dir === 'act-above' ? index : index + 1)
      }
      setCtxMenu(null)
      return
    }

    const { activityId, nodeId } = ctxMenu

    if (key === 'delete') {
      updateDoc((prev) => {
        const location = findNodeLocation(prev, activityId, nodeId)
        if (!location) return prev
        return {
          ...prev,
          activities: prev.activities.map((a, i) =>
            i === location.activityIndex
              ? { ...a, nodes: a.nodes.filter((n) => nodeKeyOf(n) !== nodeId) }
              : a,
          ),
        }
      })
      setCtxMenu(null)
      message.success('已删除节点（可 Cmd/Ctrl+Z 撤销）')
      return
    }

    if (key === 'dup:next' || key === 'dup:end') {
      const location = findNodeLocation(doc, activityId, nodeId)
      const source = location
        ? doc.activities[location.activityIndex]!.nodes[location.nodeIndex]
        : undefined
      if (!source) return
      const copy = structuredClone(source)
      copy.id = newNodeId()
      insertNodeAt(
        activityId,
        copy,
        (activity, nodeIndex) => (key === 'dup:next' ? nodeIndex + 1 : activity.nodes.length),
        nodeId,
      )
      setCtxMenu(null)
      message.success(key === 'dup:next' ? '已复制到下一个位置' : '已复制到 Activity 末尾')
      return
    }

    const [dir, indexRaw] = key.split(':')
    const template = ctxTemplates[Number(indexRaw)]
    if (!template || (dir !== 'above' && dir !== 'below')) return
    const node = template.create()
    insertNodeAt(
      activityId,
      node,
      (_activity, nodeIndex) => (dir === 'above' ? nodeIndex : nodeIndex + 1),
      nodeId,
    )
    setCtxMenu(null)
    message.success(`已${dir === 'above' ? '向上' : '向下'}添加${template.label}`)
  }

  const allowDrop: TreeProps['allowDrop'] = ({ dragNode, dropNode, dropPosition }) => {
    const dragKey = String(dragNode.key)
    const dropKey = String(dropNode.key)
    if (dragKey.startsWith('node:')) {
      if (dropKey.startsWith('node:')) return dropPosition !== 0
      if (dropKey.startsWith('act:')) return dropPosition === 0
      return false
    }
    if (dragKey.startsWith('act:')) {
      return dropKey.startsWith('act:') && dropPosition !== 0
    }
    return false
  }

  const handleDrop: TreeProps['onDrop'] = (info) => {
    const dragKey = String(info.dragNode.key)
    const dropKey = String(info.node.key)
    const dropPos = info.node.pos.split('-')
    // -1: 目标之前, 0: 目标内部, 1: 目标之后
    const gap = info.dropPosition - Number(dropPos[dropPos.length - 1])

    const drag = parseKey(dragKey)
    const drop = parseKey(dropKey)

    if (drag.kind === 'activity' && drop.kind === 'activity') {
      updateDoc((prev) => {
        const from = findActivityIndexById(prev, drag.activityId!)
        const targetIndex = findActivityIndexById(prev, drop.activityId!)
        if (from < 0 || targetIndex < 0) return prev
        let to = gap < 0 ? targetIndex : targetIndex + 1
        if (from < to) to -= 1
        return { ...prev, activities: moveItem(prev.activities, from, to) }
      })
      return
    }

    if (drag.kind !== 'node') return

    updateDoc((prev) => {
      const source = findNodeLocation(prev, drag.activityId!, drag.nodeId!)
      if (!source) return prev
      const dragged = prev.activities[source.activityIndex]!.nodes[source.nodeIndex]!

      let targetActivityIndex: number
      let targetNodeIndex: number
      if (drop.kind === 'activity' && gap === 0) {
        targetActivityIndex = findActivityIndexById(prev, drop.activityId!)
        if (targetActivityIndex < 0) return prev
        targetNodeIndex = 0
      } else if (drop.kind === 'node') {
        const target = findNodeLocation(prev, drop.activityId!, drop.nodeId!)
        if (!target) return prev
        targetActivityIndex = target.activityIndex
        targetNodeIndex = gap < 0 ? target.nodeIndex : target.nodeIndex + 1
      } else {
        return prev
      }

      const activities = prev.activities.map((a) => ({ ...a, nodes: [...a.nodes] }))
      activities[source.activityIndex]!.nodes.splice(source.nodeIndex, 1)
      if (
        targetActivityIndex === source.activityIndex &&
        targetNodeIndex > source.nodeIndex
      ) {
        targetNodeIndex -= 1
      }
      activities[targetActivityIndex]!.nodes.splice(targetNodeIndex, 0, dragged)
      return { ...prev, activities: activities as AtbReactionDocument['activities'] }
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <Space direction="vertical" size={6} style={{ width: '100%', marginBottom: 8 }}>
        <Input.Search
          allowClear
          size="small"
          placeholder="搜索节点内容 / 类型"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Space size={8} wrap>
          <Space size={4}>
            <Switch size="small" checked={onlyIssues} onChange={setOnlyIssues} />
            <Text type="secondary" style={{ fontSize: 12 }}>
              仅看有问题的节点
            </Text>
          </Space>
          <Button
            size="small"
            type="text"
            style={{ fontSize: 12 }}
            onClick={() => setExpandedKeys([KEY_ACTIVITIES, ...doc.activities.map(actKey)])}
          >
            展开
          </Button>
          <Button
            size="small"
            type="text"
            style={{ fontSize: 12 }}
            onClick={() => setExpandedKeys([KEY_ACTIVITIES])}
          >
            收起
          </Button>
        </Space>
        <Text type="secondary" style={{ fontSize: 11 }}>
          拖拽排序；右键节点/Activity 可插入；Cmd/Ctrl+点击多选批量操作
        </Text>
      </Space>

      {multiKeys.length > 1 ? (
        <Space size={4} style={{ marginBottom: 8 }} wrap>
          <Text style={{ fontSize: 12 }}>已选 {multiKeys.length} 个节点</Text>
          <Button size="small" onClick={batchDuplicate}>
            复制
          </Button>
          <Button size="small" danger onClick={batchDelete}>
            删除
          </Button>
          <Button size="small" type="text" onClick={() => setMultiKeys([])}>
            取消
          </Button>
        </Space>
      ) : null}

      <div ref={treeWrapRef} style={{ flex: 1, minHeight: 0 }}>
        <Tree
          multiple
          blockNode
          showLine
          height={treeHeight}
          draggable={filtering ? false : { icon: false }}
          allowDrop={allowDrop}
          onDrop={handleDrop}
          selectedKeys={selectedKeys}
          expandedKeys={effectiveExpandedKeys}
          onExpand={(keys) => setExpandedKeys(keys.map(String))}
          onSelect={handleSelect}
          onRightClick={handleRightClick}
          treeData={treeData}
        />
      </div>

      <Dropdown
        trigger={['click']}
        menu={{
          items: activityTypeChildren('add'),
          onClick: ({ key }) => {
            const type = key.split(':')[1] as AtbActivityType
            addActivityAt(type, doc.activities.length)
          },
        }}
      >
        <Button
          size="small"
          block
          type={doc.activities.length === 0 ? 'primary' : 'dashed'}
          icon={<PlusOutlined />}
          style={{ marginTop: 8, flexShrink: 0 }}
        >
          添加 Activity
        </Button>
      </Dropdown>

      {ctxMenu ? (
        <Dropdown
          open
          trigger={[]}
          onOpenChange={(open) => {
            if (!open) setCtxMenu(null)
          }}
          menu={{ items: ctxMenuItems, onClick: handleCtxMenuClick }}
        >
          <div style={{ position: 'fixed', left: ctxMenu.x, top: ctxMenu.y, width: 1, height: 1 }} />
        </Dropdown>
      ) : null}
    </div>
  )
}
