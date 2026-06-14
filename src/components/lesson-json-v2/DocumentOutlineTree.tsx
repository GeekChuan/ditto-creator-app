import { Tree } from 'antd'
import type { DataNode } from 'antd/es/tree'
import type { AtbReactionDocument } from '../../types/atbReactionV2'
import type { SelectionPath } from '../../types/atbReactionV2Editor'
import { isPlayVideoNode, isVoiceQaSimpleNode } from '../../types/atbReactionV2Editor'

interface Props {
  doc: AtbReactionDocument
  selection: SelectionPath
  onSelect: (path: SelectionPath) => void
}

function pathKey(path: SelectionPath): string {
  switch (path.kind) {
    case 'lesson':
      return 'lesson'
    case 'src':
      return `src-${path.index}`
    case 'activity':
      return `activity-${path.activityIndex}`
    case 'node':
      return `node-${path.activityIndex}-${path.nodeIndex}`
    case 'component':
      return `comp-${path.activityIndex}-${path.nodeIndex}-${path.componentIndex}`
    default:
      return ''
  }
}

function selectionToKey(selection: SelectionPath): string {
  return pathKey(selection)
}

export default function DocumentOutlineTree({ doc, selection, onSelect }: Props) {
  const treeData: DataNode[] = [
    {
      key: 'lesson',
      title: doc.lesson_title?.trim() || '课节信息',
      isLeaf: true,
    },
    {
      key: 'src-root',
      title: `src (${doc.src.length})`,
      children: doc.src.map((s, index) => ({
        key: `src-${index}`,
        title:
          s.type === 'video'
            ? `[video] ${s.description?.trim() || s.id.slice(0, 8)} (${s.subtitles?.segments.length ?? 0} 字幕)`
            : `[${s.type}] ${s.description?.trim() || s.id.slice(0, 8)}`,
        isLeaf: true,
      })),
    },
    {
      key: 'activities-root',
      title: `activities (${doc.activities.length})`,
      children: doc.activities.map((a, activityIndex) => ({
        key: `activity-${activityIndex}`,
        title: `#${a.id} ${a.type}`,
        children: a.nodes.map((n, nodeIndex) => ({
          key: `node-${activityIndex}-${nodeIndex}`,
          title: isPlayVideoNode(n)
            ? `Node ${n.id} · playVideo`
            : isVoiceQaSimpleNode(n)
              ? `Node ${n.id} · voiceQa`
              : `Node ${n.id}`,
          children: n.components.map((c, componentIndex) => ({
            key: `comp-${activityIndex}-${nodeIndex}-${componentIndex}`,
            title: c.type,
            isLeaf: true,
          })),
        })),
      })),
    },
  ]

  const handleSelect = (keys: React.Key[]) => {
    const key = String(keys[0] ?? '')
    if (key === 'lesson') {
      onSelect({ kind: 'lesson' })
      return
    }
    if (key.startsWith('src-') && !key.includes('root')) {
      const index = parseInt(key.replace('src-', ''), 10)
      if (!Number.isNaN(index)) onSelect({ kind: 'src', index })
      return
    }
    if (key.startsWith('activity-')) {
      const activityIndex = parseInt(key.replace('activity-', ''), 10)
      if (!Number.isNaN(activityIndex)) onSelect({ kind: 'activity', activityIndex })
      return
    }
    if (key.startsWith('node-')) {
      const parts = key.replace('node-', '').split('-')
      const activityIndex = parseInt(parts[0] ?? '', 10)
      const nodeIndex = parseInt(parts[1] ?? '', 10)
      if (!Number.isNaN(activityIndex) && !Number.isNaN(nodeIndex)) {
        onSelect({ kind: 'node', activityIndex, nodeIndex })
      }
      return
    }
    if (key.startsWith('comp-')) {
      const parts = key.replace('comp-', '').split('-')
      const activityIndex = parseInt(parts[0] ?? '', 10)
      const nodeIndex = parseInt(parts[1] ?? '', 10)
      const componentIndex = parseInt(parts[2] ?? '', 10)
      if (
        !Number.isNaN(activityIndex) &&
        !Number.isNaN(nodeIndex) &&
        !Number.isNaN(componentIndex)
      ) {
        onSelect({ kind: 'component', activityIndex, nodeIndex, componentIndex })
      }
    }
  }

  return (
    <Tree
      showLine
      defaultExpandAll
      selectedKeys={[selectionToKey(selection)]}
      onSelect={handleSelect}
      treeData={treeData}
    />
  )
}
