import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Button, Collapse, Space, Tooltip, Typography, message, theme } from 'antd'
import { RedoOutlined, ThunderboltOutlined, UndoOutlined } from '@ant-design/icons'
import type { AtbReactionDocument } from '../../types/atbReactionV2'
import { collectValidationIssues, findNodeLocation } from '../../types/atbReactionV2Editor'
import ActivityEditorPanel from '../../components/lesson-json-v2/ActivityEditorPanel'
import BatchVoiceCompletionModal from '../../components/lesson-json-v2/BatchVoiceCompletionModal'
import DraftLockerControls from '../../components/lesson-json-v2/DraftLockerControls'
import JsonIoToolbar from '../../components/lesson-json-v2/JsonIoToolbar'
import LessonMetaForm from '../../components/lesson-json-v2/LessonMetaForm'
import MobilePreviewDock from '../../components/lesson-json-v2/MobilePreviewDock'
import type { PlayingNodeInfo, PreviewRequest } from '../../components/lesson-json-v2/MobilePreviewDock'
import NodeEditorPanel from '../../components/lesson-json-v2/NodeEditorPanel'
import NodeNotesPanel from '../../components/lesson-json-v2/NodeNotesPanel'
import OutlinePanel from '../../components/lesson-json-v2/OutlinePanel'
import SrcAssetsTable from '../../components/lesson-json-v2/SrcAssetsTable'
import ValidationPanel from '../../components/lesson-json-v2/ValidationPanel'
import { useAtbV2EditorStore } from './store'

const { Title, Text } = Typography

export default function LessonJsonDesignV2Page() {
  const { token } = theme.useToken()
  const doc = useAtbV2EditorStore((s) => s.doc)
  const selection = useAtbV2EditorStore((s) => s.selection)
  const updateDoc = useAtbV2EditorStore((s) => s.updateDoc)
  const replaceDoc = useAtbV2EditorStore((s) => s.replaceDoc)
  const resetDraft = useAtbV2EditorStore((s) => s.resetDraft)
  const importDocument = useAtbV2EditorStore((s) => s.importDocument)
  const undo = useAtbV2EditorStore((s) => s.undo)
  const redo = useAtbV2EditorStore((s) => s.redo)
  const canUndo = useAtbV2EditorStore((s) => s.past.length > 0)
  const canRedo = useAtbV2EditorStore((s) => s.future.length > 0)

  const [batchVoiceOpen, setBatchVoiceOpen] = useState(false)
  // 右栏常驻预览坞：null 表示黑屏未推流
  const [previewRequest, setPreviewRequest] = useState<PreviewRequest | null>(null)
  // iframe 回传的当前播放节点（用于备注定位与「定位到 Node」）
  const [playingNode, setPlayingNode] = useState<PlayingNodeInfo | null>(null)

  // 校验与 JSON 预览用延迟值，避免大文档下打字卡顿
  const deferredDoc = useDeferredValue(doc)
  const issues = useMemo(() => collectValidationIssues(deferredDoc), [deferredDoc])
  const errorCount = useMemo(() => issues.filter((i) => i.severity === 'error').length, [issues])
  const hintCount = issues.length - errorCount

  const previewCurrentNode = useCallback(() => {
    if (selection.kind !== 'node') return
    const location = findNodeLocation(doc, selection.activityId, selection.nodeId)
    if (!location) return
    setPreviewRequest((prev) => ({
      activityIndex: location.activityIndex,
      nodeIndex: location.nodeIndex,
      epoch: (prev?.epoch ?? 0) + 1,
      label: `A${location.activityIndex + 1} · 节点${location.nodeIndex + 1}`,
    }))
  }, [doc, selection])

  const previewFromBeginning = useCallback(() => {
    setPreviewRequest((prev) => ({
      activityIndex: 0,
      nodeIndex: 0,
      epoch: (prev?.epoch ?? 0) + 1,
      label: '从头播放',
    }))
  }, [])

  const setSelection = useAtbV2EditorStore((s) => s.setSelection)

  /** 把编辑器选中态跳到 iframe 正在播放的节点：优先按 id 匹配，id 失效时按索引兜底 */
  const locatePlayingNode = useCallback(
    (info: PlayingNodeInfo) => {
      if (findNodeLocation(doc, info.activityId, info.nodeId)) {
        setSelection({ kind: 'node', activityId: info.activityId, nodeId: info.nodeId })
        return
      }
      const activity = doc.activities[info.activityIndex]
      const node = activity?.nodes[info.nodeIndex]
      if (activity && node) {
        setSelection({ kind: 'node', activityId: String(activity.id), nodeId: String(node.id) })
        return
      }
      message.warning('未找到正在播放的节点（文档可能已变更）')
    },
    [doc, setSelection],
  )

  /** 备注目标：预览播放中时记到播放节点 */
  const notesPlayingTarget = useMemo(() => {
    if (!playingNode) return null
    return {
      activityId: playingNode.activityId,
      nodeId: playingNode.nodeId,
      label: `A${playingNode.activityIndex + 1} · 节点${playingNode.nodeIndex + 1}`,
    }
  }, [playingNode])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return
      e.preventDefault()
      // 长按连发只算一次，避免一次按键回退多步
      if (e.repeat) return
      if (e.shiftKey) redo()
      else undo()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [undo, redo])

  const patchDoc = useCallback(
    (patch: Partial<AtbReactionDocument>) => {
      updateDoc((prev) => ({ ...prev, ...patch }), { historyGroup: 'lesson-meta' })
    },
    [updateDoc],
  )

  const loadPurpleSample = useCallback(async () => {
    const res = await fetch('/fixtures/atb_reaction.json')
    if (!res.ok) throw new Error('样例加载失败')
    importDocument(await res.text())
  }, [importDocument])

  const centerTitle = useMemo(() => {
    switch (selection.kind) {
      case 'lesson':
        return doc.lesson_title?.trim() || '课节信息'
      case 'src':
        return '资源池 src'
      case 'activity':
        return `Activity ${selection.activityId}`
      case 'node':
        return '节点编辑'
    }
  }, [selection, doc.lesson_title])

  const renderCenter = () => {
    switch (selection.kind) {
      case 'lesson':
        return <LessonMetaForm doc={doc} onChange={patchDoc} />
      case 'src':
        return (
          <SrcAssetsTable
            doc={doc}
            onChangeSrc={(src) => updateDoc((prev) => ({ ...prev, src }), { historyGroup: 'src' })}
          />
        )
      case 'activity':
        return <ActivityEditorPanel activityId={selection.activityId} issues={issues} />
      case 'node':
        return (
          <NodeEditorPanel
            activityId={selection.activityId}
            nodeId={selection.nodeId}
            issues={issues}
            onPreview={previewCurrentNode}
          />
        )
    }
  }

  const paneStyle: React.CSSProperties = {
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: token.borderRadiusLG,
    background: token.colorBgContainer,
    padding: 12,
    overflow: 'auto',
    minHeight: 0,
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: 'calc(100vh - 64px - 48px - 48px)',
        minHeight: 480,
        gap: 12,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 8,
        }}
      >
        <Space size={12} align="center">
          <Title level={4} style={{ margin: 0 }}>
            课程 JSON 设计 V2
          </Title>
          <Text type="secondary" style={{ fontSize: 12 }}>
            ATB V2 格式 · 左侧大纲导航，中间聚焦编辑，右侧校验与导出
          </Text>
        </Space>
        <Space size={8}>
          <Tooltip title="撤销（Cmd/Ctrl+Z）">
            <Button icon={<UndoOutlined />} disabled={!canUndo} onClick={undo} />
          </Tooltip>
          <Tooltip title="重做（Shift+Cmd/Ctrl+Z）">
            <Button icon={<RedoOutlined />} disabled={!canRedo} onClick={redo} />
          </Tooltip>
          <DraftLockerControls />
          <JsonIoToolbar
            doc={deferredDoc}
            onImport={importDocument}
            onReset={resetDraft}
            onLoadSample={() => {
              void loadPurpleSample().then(
                () => message.success('已加载 Purple 样例'),
                (e: unknown) => message.error(e instanceof Error ? e.message : '样例加载失败'),
              )
            }}
          />
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            onClick={() => setBatchVoiceOpen(true)}
          >
            一键补全所有语音并打轴
          </Button>
        </Space>
      </div>

      <div style={{ display: 'flex', gap: 12, flex: 1, minHeight: 0 }}>
        <div style={{ ...paneStyle, width: 320, flexShrink: 0, overflow: 'hidden', display: 'flex' }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <OutlinePanel issues={issues} />
          </div>
        </div>

        <div style={{ ...paneStyle, flex: 1, minWidth: 0 }}>
          <Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
            {centerTitle}
          </Title>
          {renderCenter()}
        </div>

        <div
          style={{
            width: 360,
            flexShrink: 0,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <Collapse
            size="small"
            defaultActiveKey={errorCount > 0 ? ['validation'] : []}
            style={{ background: token.colorBgContainer, flexShrink: 0 }}
            items={[
              {
                key: 'validation',
                label: `校验 · 错误 ${errorCount} / 提示 ${hintCount}`,
                children: <ValidationPanel issues={issues} />,
              },
            ]}
          />
          <div
            style={{
              ...paneStyle,
              flex: 1,
              overflow: 'hidden',
              minHeight: 280,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <MobilePreviewDock
                doc={deferredDoc}
                request={previewRequest}
                onStartFromBeginning={previewFromBeginning}
                onStop={() => setPreviewRequest(null)}
                onPlayingNodeChange={setPlayingNode}
                onLocateNode={locatePlayingNode}
              />
            </div>
            <div
              style={{
                flexShrink: 0,
                borderTop: `1px solid ${token.colorBorderSecondary}`,
                paddingTop: 8,
              }}
            >
              <NodeNotesPanel playingTarget={notesPlayingTarget} />
            </div>
          </div>
        </div>
      </div>

      <BatchVoiceCompletionModal
        open={batchVoiceOpen}
        doc={doc}
        onClose={() => setBatchVoiceOpen(false)}
        onApply={(next) => replaceDoc(next)}
      />
    </div>
  )
}
