import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Dropdown,
  Input,
  List,
  Popconfirm,
  Segmented,
  Slider,
  Space,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd'
import {
  AppstoreAddOutlined,
  CaretRightOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FontSizeOutlined,
  HolderOutlined,
  LinkOutlined,
  OrderedListOutlined,
  PauseOutlined,
  PictureOutlined,
  PlusOutlined,
  RedoOutlined,
  ReloadOutlined,
  SendOutlined,
  SoundOutlined,
  UndoOutlined,
  UploadOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons'
import type {
  TeachingBoardAction,
  TeachingBoardBlock,
  TeachingBoardNarrationTrack,
  TeachingBoardProject,
} from '../../types/teachingBoard'
import { downloadTextFile } from '../../utils/noteExport'
import { resolveSignedMediaUrl } from '../../utils/signMediaCache'
import ActionEditorPanel from './ActionEditorPanel'
import BlockInspector from './BlockInspector'
import NarrationTrackPanel from './NarrationTrackPanel'
import SubtitleTimelineTrack from './SubtitleTimelineTrack'
import TeachingBoardCanvas from './TeachingBoardCanvas'
import TeachingBoardMobilePreview, {
  type TeachingBoardMobilePreviewHandle,
} from './TeachingBoardMobilePreview'
import {
  BLOCK_LABELS,
  TEACHING_BOARD_STUDIO_STORAGE_KEY,
  actionLabel,
  collectAnchors,
  createBlock,
  createSampleProject,
  projectDuration,
  runtimeAt,
  uid,
} from './model'
import { resolveActionTimeReference } from './subtitleAxis'
import './teaching-board-studio.css'

const { Title, Text } = Typography
const HISTORY_LIMIT = 80
const MOBILE_URL_STORAGE_KEY = 'ditto-teaching-board-studio-mobile-url'

function loadInitialProject(): TeachingBoardProject {
  try {
    const raw = localStorage.getItem(TEACHING_BOARD_STUDIO_STORAGE_KEY)
    if (!raw) return createSampleProject()
    const parsed = JSON.parse(raw) as TeachingBoardProject
    return parsed.schema === 'ditto.teaching-board-project.v1' ? parsed : createSampleProject()
  } catch {
    return createSampleProject()
  }
}

function validateProject(project: TeachingBoardProject): string[] {
  const issues: string[] = []
  if (!project.document.board_id.trim()) issues.push('board_id 不能为空')
  if (!project.document.blocks.length) issues.push('至少需要一个白板组件')
  const blockIds = project.document.blocks.map((block) => block.id)
  const duplicateBlocks = blockIds.filter((id, index) => blockIds.indexOf(id) !== index)
  if (duplicateBlocks.length) issues.push(`Block ID 重复：${[...new Set(duplicateBlocks)].join(', ')}`)
  const anchors = collectAnchors(project)
  const anchorIds = anchors.map((anchor) => anchor.id)
  const duplicateAnchors = anchorIds.filter((id, index) => anchorIds.indexOf(id) !== index)
  if (duplicateAnchors.length) issues.push(`Anchor ID 重复：${[...new Set(duplicateAnchors)].join(', ')}`)
  const anchorSet = new Set(anchorIds)
  const blockSet = new Set(blockIds)
  for (const action of project.actions) {
    if (action.time_ref && resolveActionTimeReference(project.narration?.subtitle_axis, action.time_ref) === undefined) {
      issues.push(`${action.name} 引用了不存在的字幕字词时间`)
    }
    if (action.command.type === 'apply_effect') {
      const target = action.command.effect.target
      if ('anchor_id' in target && !anchorSet.has(target.anchor_id)) {
        issues.push(`${action.name} 引用了不存在的 Anchor：${target.anchor_id}`)
      }
      if ('anchor_range' in target) {
        if (!anchorSet.has(target.anchor_range.start_anchor_id)) issues.push(`${action.name} 的起点 Anchor 不存在`)
        if (!anchorSet.has(target.anchor_range.end_anchor_id)) issues.push(`${action.name} 的终点 Anchor 不存在`)
      }
    }
    if (action.command.type === 'set_order_list_active_item' && !blockSet.has(action.command.block_id)) {
      issues.push(`${action.name} 引用了不存在的列表：${action.command.block_id}`)
    }
  }
  return issues
}

function moveBlock(blocks: TeachingBoardBlock[], from: number, to: number): TeachingBoardBlock[] {
  if (from === to || from < 0 || to < 0 || from >= blocks.length || to >= blocks.length) return blocks
  const next = [...blocks]
  const [moved] = next.splice(from, 1)
  if (moved) next.splice(to, 0, moved)
  return next
}

export default function TeachingBoardStudioPage() {
  const [project, setProjectState] = useState<TeachingBoardProject>(loadInitialProject)
  const [past, setPast] = useState<TeachingBoardProject[]>([])
  const [future, setFuture] = useState<TeachingBoardProject[]>([])
  const [selectedBlockId, setSelectedBlockId] = useState(project.document.blocks[0]?.id)
  const [selectedAnchorId, setSelectedAnchorId] = useState<string>()
  const [selectedActionId, setSelectedActionId] = useState(project.actions[0]?.id)
  const [rightTab, setRightTab] = useState('properties')
  const [zoom, setZoom] = useState(0.82)
  const [currentMs, setCurrentMs] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [signedAudioUrl, setSignedAudioUrl] = useState<string>()
  const [draggedBlockId, setDraggedBlockId] = useState<string>()
  const [mobileUrl, setMobileUrl] = useState(() => localStorage.getItem(MOBILE_URL_STORAGE_KEY) ?? '')
  const importInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const mobilePreviewRef = useRef<TeachingBoardMobilePreviewHandle>(null)

  const commitProject = useCallback((updater: (current: TeachingBoardProject) => TeachingBoardProject) => {
    setProjectState((current) => {
      const next = updater(current)
      if (next === current) return current
      setPast((history) => [...history, current].slice(-HISTORY_LIMIT))
      setFuture([])
      return next
    })
  }, [])

  const replaceProject = useCallback((next: TeachingBoardProject) => {
    setProjectState((current) => {
      setPast((history) => [...history, current].slice(-HISTORY_LIMIT))
      setFuture([])
      return next
    })
    setSelectedBlockId(next.document.blocks[0]?.id)
    setSelectedActionId(next.actions[0]?.id)
    setSelectedAnchorId(undefined)
    setCurrentMs(0)
    setPlaying(false)
    audioRef.current?.pause()
  }, [])

  const undo = useCallback(() => {
    setPast((history) => {
      const previous = history[history.length - 1]
      if (!previous) return history
      setProjectState((current) => {
        setFuture((items) => [current, ...items].slice(0, HISTORY_LIMIT))
        return previous
      })
      return history.slice(0, -1)
    })
  }, [])

  const redo = useCallback(() => {
    setFuture((items) => {
      const next = items[0]
      if (!next) return items
      setProjectState((current) => {
        setPast((history) => [...history, current].slice(-HISTORY_LIMIT))
        return next
      })
      return items.slice(1)
    })
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      localStorage.setItem(TEACHING_BOARD_STUDIO_STORAGE_KEY, JSON.stringify(project))
    }, 300)
    return () => window.clearTimeout(timer)
  }, [project])

  useEffect(() => {
    localStorage.setItem(MOBILE_URL_STORAGE_KEY, mobileUrl)
  }, [mobileUrl])

  useEffect(() => {
    let cancelled = false
    const audioUrl = project.narration?.audio_url?.trim()
    setPlaying(false)
    audioRef.current?.pause()
    if (!audioUrl) {
      setSignedAudioUrl(undefined)
      return () => { cancelled = true }
    }
    setSignedAudioUrl(undefined)
    void resolveSignedMediaUrl(audioUrl)
      .then((url) => {
        if (!cancelled) setSignedAudioUrl(url)
      })
      .catch(() => {
        if (!cancelled) {
          setSignedAudioUrl(undefined)
          message.error('语音 OSS 链接加签失败')
        }
      })
    return () => { cancelled = true }
  }, [project.narration?.audio_url])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return
      event.preventDefault()
      if (event.shiftKey) redo()
      else undo()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [redo, undo])

  const anchors = useMemo(() => collectAnchors(project), [project])
  const issues = useMemo(() => validateProject(project), [project])
  const durationMs = useMemo(() => projectDuration(project), [project])
  const runtime = useMemo(() => runtimeAt(project, currentMs), [currentMs, project])
  const selectedBlock = project.document.blocks.find((block) => block.id === selectedBlockId)
  const selectedAction = project.actions.find((action) => action.id === selectedActionId)

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      setCurrentMs((previous) => {
        const audio = audioRef.current
        const audioTimeMs = audio && signedAudioUrl ? Math.round(audio.currentTime * 1000) : undefined
        const next = Math.min(durationMs, audioTimeMs ?? previous + 100)
        project.actions
          .filter((action) => action.at_ms > previous && action.at_ms <= next)
          .sort((a, b) => a.at_ms - b.at_ms)
          .forEach((action) => mobilePreviewRef.current?.broadcast(action))
        if (next >= durationMs) setPlaying(false)
        return next
      })
    }, 100)
    return () => window.clearInterval(timer)
  }, [durationMs, playing, project.actions, signedAudioUrl])

  const patchBlock = useCallback((nextBlock: TeachingBoardBlock) => {
    commitProject((current) => ({
      ...current,
      document: {
        ...current.document,
        blocks: current.document.blocks.map((block) => block.id === selectedBlockId ? nextBlock : block),
      },
    }))
    if (nextBlock.id !== selectedBlockId) setSelectedBlockId(nextBlock.id)
  }, [commitProject, selectedBlockId])

  const addBlock = (type: TeachingBoardBlock['type']) => {
    const block = createBlock(type)
    commitProject((current) => ({
      ...current,
      document: { ...current.document, blocks: [...current.document.blocks, block] },
    }))
    setSelectedBlockId(block.id)
    setRightTab('properties')
  }

  const deleteBlock = (blockId: string) => {
    const index = project.document.blocks.findIndex((block) => block.id === blockId)
    commitProject((current) => ({
      ...current,
      document: {
        ...current.document,
        blocks: current.document.blocks.filter((block) => block.id !== blockId),
      },
    }))
    const fallback = project.document.blocks[index + 1] ?? project.document.blocks[index - 1]
    setSelectedBlockId(fallback?.id)
  }

  const duplicateBlock = (block: TeachingBoardBlock) => {
    const copy = structuredClone(block)
    copy.id = uid(block.type)
    const index = project.document.blocks.findIndex((candidate) => candidate.id === block.id)
    commitProject((current) => {
      const blocks = [...current.document.blocks]
      blocks.splice(index + 1, 0, copy)
      return { ...current, document: { ...current.document, blocks } }
    })
    setSelectedBlockId(copy.id)
  }

  const patchAction = (nextAction: TeachingBoardAction) => {
    commitProject((current) => ({
      ...current,
      actions: current.actions.map((action) => action.id === selectedActionId ? nextAction : action),
    }))
    if (nextAction.id !== selectedActionId) setSelectedActionId(nextAction.id)
  }

  const patchNarration = (narration: TeachingBoardNarrationTrack | undefined) => {
    commitProject((current) => ({
      ...current,
      narration,
      actions: current.actions.map((action) => {
        if (!action.time_ref) return action
        if (!narration?.subtitle_axis) return { ...action, time_ref: undefined }
        const atMs = resolveActionTimeReference(narration.subtitle_axis, action.time_ref)
        return atMs === undefined ? action : { ...action, at_ms: atMs }
      }),
    }))
  }

  const addAction = (action: TeachingBoardAction) => {
    commitProject((current) => ({ ...current, actions: [...current.actions, action] }))
    setSelectedActionId(action.id)
    setRightTab('actions')
  }

  const deleteAction = (actionId: string) => {
    const index = project.actions.findIndex((action) => action.id === actionId)
    commitProject((current) => ({ ...current, actions: current.actions.filter((action) => action.id !== actionId) }))
    setSelectedActionId((project.actions[index + 1] ?? project.actions[index - 1])?.id)
  }

  const replayMobileState = (timeMs: number) => {
    mobilePreviewRef.current?.clearEffects()
    project.actions
      .filter((action) => action.at_ms <= timeMs)
      .sort((a, b) => a.at_ms - b.at_ms)
      .forEach((action, index) => window.setTimeout(() => mobilePreviewRef.current?.broadcast(action), 30 * (index + 1)))
  }

  const seekTimeline = (timeMs: number, replayState = false) => {
    const next = Math.max(0, Math.min(durationMs, Math.round(timeMs)))
    setPlaying(false)
    audioRef.current?.pause()
    if (audioRef.current && signedAudioUrl && audioRef.current.readyState >= HTMLMediaElement.HAVE_METADATA) {
      audioRef.current.currentTime = next / 1000
    }
    setCurrentMs(next)
    if (replayState) replayMobileState(next)
  }

  const togglePlayback = async () => {
    if (playing) {
      setPlaying(false)
      audioRef.current?.pause()
      return
    }

    const startAt = currentMs >= durationMs ? 0 : currentMs
    if (startAt === 0 && currentMs !== 0) {
      setCurrentMs(0)
      mobilePreviewRef.current?.clearEffects()
    }

    if (project.narration?.audio_url) {
      if (!signedAudioUrl || !audioRef.current) {
        message.warning('语音链接正在加签，请稍后再试')
        return
      }
      if (audioRef.current.readyState >= HTMLMediaElement.HAVE_METADATA) {
        audioRef.current.currentTime = startAt / 1000
      }
      try {
        await audioRef.current.play()
      } catch {
        message.error('语音播放失败，请检查 OSS 地址或签名权限')
        return
      }
    }
    setPlaying(true)
  }

  const copyJson = async (value: unknown, label: string) => {
    await navigator.clipboard.writeText(`${JSON.stringify(value, null, 2)}\n`)
    message.success(`已复制${label}`)
  }

  const handleImportFile = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text()) as TeachingBoardProject | TeachingBoardProject['document']
      if (parsed.schema === 'ditto.teaching-board.v1') {
        replaceProject({
          schema: 'ditto.teaching-board-project.v1',
          name: file.name.replace(/\.json$/i, ''),
          document: parsed,
          actions: [],
        })
      } else if (parsed.schema === 'ditto.teaching-board-project.v1') {
        replaceProject(parsed)
      } else {
        throw new Error('仅支持 TeachingBoard document 或 project JSON')
      }
      message.success('导入成功')
    } catch (error) {
      message.error(error instanceof Error ? error.message : '导入失败')
    }
  }

  const componentLibrary = [
    { type: 'title', label: '标题', description: 'Normal / Capsule', icon: <FontSizeOutlined /> },
    { type: 'content', label: '正文', description: '说明和引导语', icon: <AppstoreAddOutlined /> },
    { type: 'quote', label: '原文引用', description: '教材原文讲解', icon: <CopyOutlined /> },
    { type: 'order_list', label: '有序列表', description: 'Normal / Simple', icon: <OrderedListOutlined /> },
    { type: 'image', label: '图片', description: 'URL / source_id', icon: <PictureOutlined /> },
    { type: 'video', label: '视频', description: 'URL / source_id', icon: <VideoCameraOutlined /> },
  ] as const

  return (
    <div className="tb-studio-page">
      <header className="tb-studio-header">
        <div className="tb-studio-heading">
          <Title level={4}>TeachingBoard Studio</Title>
          <Text type="secondary">可视化白板设计 · Anchor · 动作编排 · 广播联调</Text>
        </div>
        <Space wrap>
          <Input
            className="tb-studio-project-name"
            value={project.name}
            onChange={(event) => commitProject((current) => ({ ...current, name: event.target.value }))}
          />
          <Tooltip title="撤销 Cmd/Ctrl+Z"><Button icon={<UndoOutlined />} disabled={!past.length} onClick={undo} /></Tooltip>
          <Tooltip title="重做 Shift+Cmd/Ctrl+Z"><Button icon={<RedoOutlined />} disabled={!future.length} onClick={redo} /></Tooltip>
          <Badge count={issues.length} size="small">
            <Tag color={issues.length ? 'error' : 'success'}>{issues.length ? '需要检查' : '结构有效'}</Tag>
          </Badge>
          <Button icon={<UploadOutlined />} onClick={() => importInputRef.current?.click()}>导入</Button>
          <Dropdown
            menu={{
              items: [
                { key: 'copy-document', label: '复制白板 Document' },
                { key: 'copy-component', label: '复制 teaching_board 组件' },
                { key: 'download-project', label: '下载含动作的 Project' },
                { key: 'download-document', label: '下载纯白板 Document' },
              ],
              onClick: ({ key }) => {
                if (key === 'copy-document') void copyJson(project.document, '白板 Document')
                if (key === 'copy-component') void copyJson({ type: 'teaching_board', document: project.document }, '组件 JSON')
                if (key === 'download-project') downloadTextFile('teaching_board_project.json', `${JSON.stringify(project, null, 2)}\n`, 'application/json')
                if (key === 'download-document') downloadTextFile('teaching_board.json', `${JSON.stringify(project.document, null, 2)}\n`, 'application/json')
              },
            }}
          >
            <Button type="primary" icon={<DownloadOutlined />}>导出</Button>
          </Dropdown>
          <Popconfirm title="恢复 Jessie 样例？当前内容可通过撤销找回。" onConfirm={() => replaceProject(createSampleProject())}>
            <Button icon={<ReloadOutlined />}>载入样例</Button>
          </Popconfirm>
          <input
            ref={importInputRef}
            hidden
            type="file"
            accept="application/json,.json"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void handleImportFile(file)
              event.target.value = ''
            }}
          />
        </Space>
      </header>

      {issues.length ? (
        <Alert className="tb-studio-validation" type="warning" showIcon message={issues[0]} description={issues.length > 1 ? `另有 ${issues.length - 1} 项，可在 Anchor 面板查看。` : undefined} />
      ) : null}

      <main className="tb-studio-workspace">
        <aside className="tb-studio-left-panel">
          <div className="tb-panel-heading">
            <Text strong>组件库</Text>
            <Text type="secondary">点击添加</Text>
          </div>
          <div className="tb-component-library">
            {componentLibrary.map((item) => (
              <Card key={item.type} size="small" hoverable onClick={() => addBlock(item.type)}>
                <span className="tb-component-icon">{item.icon}</span>
                <span>
                  <strong>{item.label}</strong>
                  <small>{item.description}</small>
                </span>
                <PlusOutlined />
              </Card>
            ))}
          </div>
          <Divider style={{ margin: '14px 0 10px' }} />
          <div className="tb-panel-heading">
            <Text strong>白板结构</Text>
            <Tag>{project.document.blocks.length}</Tag>
          </div>
          <div className="tb-block-tree">
            {project.document.blocks.map((block, index) => (
              <div
                draggable
                key={block.id}
                className={['tb-block-tree-item', block.id === selectedBlockId ? 'is-selected' : ''].join(' ')}
                onDragStart={() => setDraggedBlockId(block.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  const from = project.document.blocks.findIndex((candidate) => candidate.id === draggedBlockId)
                  commitProject((current) => ({
                    ...current,
                    document: { ...current.document, blocks: moveBlock(current.document.blocks, from, index) },
                  }))
                  setDraggedBlockId(undefined)
                }}
                onClick={() => {
                  setSelectedBlockId(block.id)
                  setRightTab('properties')
                }}
              >
                <HolderOutlined className="tb-block-drag" />
                <span className="tb-block-tree-index">{index + 1}</span>
                <span className="tb-block-tree-copy">
                  <strong>{BLOCK_LABELS[block.type] ?? block.type}</strong>
                  <small>{block.id}</small>
                </span>
                <Dropdown
                  trigger={['click']}
                  menu={{
                    items: [
                      { key: 'duplicate', label: '复制组件', icon: <CopyOutlined /> },
                      { key: 'delete', label: '删除组件', icon: <DeleteOutlined />, danger: true },
                    ],
                    onClick: ({ key, domEvent }) => {
                      domEvent.stopPropagation()
                      if (key === 'duplicate') duplicateBlock(block)
                      if (key === 'delete') deleteBlock(block.id)
                    },
                  }}
                >
                  <Button type="text" size="small">•••</Button>
                </Dropdown>
              </div>
            ))}
          </div>
          <Divider style={{ margin: '14px 0 10px' }} />
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Text strong>白板设置</Text>
            <Input
              size="small"
              prefix={<Text type="secondary" className="tb-board-setting-prefix">board_id</Text>}
              value={project.document.board_id}
              onChange={(event) => commitProject((current) => ({
                ...current,
                document: { ...current.document, board_id: event.target.value },
              }))}
            />
            <Input
              size="small"
              prefix={<Text type="secondary" className="tb-board-setting-prefix">channel</Text>}
              value={project.document.broadcast_channel ?? ''}
              placeholder="默认使用 board_id"
              onChange={(event) => commitProject((current) => ({
                ...current,
                document: { ...current.document, broadcast_channel: event.target.value || undefined },
              }))}
            />
          </Space>
        </aside>

        <section className="tb-studio-center-panel">
          <div className="tb-canvas-toolbar">
            <Space>
              <Text strong>画布</Text>
              <Tag color="green">390 基准宽度</Tag>
              {selectedAnchorId ? <Tag icon={<LinkOutlined />} color="geekblue">{selectedAnchorId}</Tag> : null}
            </Space>
            <Segmented
              size="small"
              value={zoom}
              options={[
                { label: '70%', value: 0.7 },
                { label: '82%', value: 0.82 },
                { label: '100%', value: 1 },
              ]}
              onChange={(value) => setZoom(Number(value))}
            />
          </div>
          <TeachingBoardCanvas
            project={project}
            runtime={runtime}
            selectedBlockId={selectedBlockId}
            selectedAnchorId={selectedAnchorId}
            zoom={zoom}
            onSelectBlock={(blockId) => {
              setSelectedBlockId(blockId)
              setRightTab('properties')
            }}
            onSelectAnchor={(anchorId, blockId) => {
              setSelectedBlockId(blockId)
              setSelectedAnchorId(anchorId)
              setRightTab('anchors')
            }}
          />
        </section>

        <aside className="tb-studio-right-panel">
          <Tabs
            activeKey={rightTab}
            onChange={setRightTab}
            items={[
              {
                key: 'properties',
                label: '属性',
                children: (
                  <BlockInspector
                    block={selectedBlock}
                    selectedAnchorId={selectedAnchorId}
                    onChange={patchBlock}
                    onSelectAnchor={(anchorId) => {
                      setSelectedAnchorId(anchorId)
                      setRightTab('anchors')
                    }}
                  />
                ),
              },
              {
                key: 'anchors',
                label: `Anchor ${anchors.length}`,
                children: (
                  <div className="tb-anchor-index">
                    <Alert type="info" showIcon message="在属性面板中切分文字并设置 Anchor；点击画布中的蓝色断点可反向定位。" />
                    <List
                      size="small"
                      dataSource={anchors}
                      locale={{ emptyText: '还没有 Anchor' }}
                      renderItem={(anchor) => (
                        <List.Item
                          className={anchor.id === selectedAnchorId ? 'is-selected' : ''}
                          onClick={() => {
                            setSelectedAnchorId(anchor.id)
                            const blockId = anchor.location.split(' · ')[0]
                            setSelectedBlockId(blockId)
                          }}
                        >
                          <List.Item.Meta
                            avatar={<LinkOutlined />}
                            title={<Text code>{anchor.id}</Text>}
                            description={`${anchor.text} · ${anchor.location}`}
                          />
                        </List.Item>
                      )}
                    />
                    {issues.map((issue) => <Alert key={issue} type="warning" showIcon message={issue} />)}
                  </div>
                ),
              },
              {
                key: 'actions',
                label: `动作 ${project.actions.length}`,
                children: (
                  <ActionEditorPanel
                    action={selectedAction}
                    anchors={anchors}
                    blocks={project.document.blocks}
                    subtitleAxis={project.narration?.subtitle_axis}
                    currentMs={currentMs}
                    onCreate={addAction}
                    onChange={patchAction}
                    onDelete={deleteAction}
                    onTimeChange={(timeMs) => seekTimeline(timeMs)}
                    onBroadcast={(action) => {
                      seekTimeline(action.at_ms)
                      mobilePreviewRef.current?.broadcast(action)
                      message.success(`已广播：${action.name}`)
                    }}
                  />
                ),
              },
              {
                key: 'narration',
                label: (
                  <span><SoundOutlined /> 语音轴</span>
                ),
                children: (
                  <NarrationTrackPanel
                    narration={project.narration}
                    signedAudioUrl={signedAudioUrl}
                    currentMs={currentMs}
                    onChange={patchNarration}
                    onSeek={(timeMs) => seekTimeline(timeMs, true)}
                  />
                ),
              },
              {
                key: 'mobile',
                label: '广播测试',
                forceRender: true,
                children: (
                  <TeachingBoardMobilePreview
                    ref={mobilePreviewRef}
                    project={project}
                    mobileUrl={mobileUrl}
                    onMobileUrlChange={setMobileUrl}
                  />
                ),
              },
            ]}
          />
        </aside>
      </main>

      <footer className="tb-studio-timeline">
        <audio
          ref={audioRef}
          hidden
          preload="metadata"
          src={signedAudioUrl}
          onEnded={() => setPlaying(false)}
          onLoadedMetadata={(event) => {
            const nextDuration = Math.round(event.currentTarget.duration * 1000)
            const previousDuration = project.narration?.duration_ms ?? 0
            if (!Number.isFinite(nextDuration)) return
            event.currentTarget.currentTime = Math.min(currentMs, nextDuration) / 1000
            if (Math.abs(nextDuration - previousDuration) > 100) {
              commitProject((current) => ({
                ...current,
                narration: { ...current.narration, duration_ms: nextDuration },
              }))
            }
          }}
        />
        <div className="tb-timeline-controls">
          <Button
            type="primary"
            shape="circle"
            icon={playing ? <PauseOutlined /> : <CaretRightOutlined />}
            onClick={() => void togglePlayback()}
          />
          <Button
            icon={<ReloadOutlined />}
            onClick={() => {
              seekTimeline(0)
              mobilePreviewRef.current?.clearEffects()
            }}
          />
          <div className="tb-timeline-time-copy">
            <Text strong>{(currentMs / 1000).toFixed(1)}s</Text>
            <Text type="secondary">/ {(durationMs / 1000).toFixed(1)}s</Text>
            <Text type="secondary" ellipsis={{ tooltip: project.narration?.audio_name }}>
              <SoundOutlined /> {project.narration?.audio_url ? project.narration.audio_name ?? '语音已配置' : '无语音'}
            </Text>
          </div>
        </div>
        <div className="tb-timeline-main">
          <SubtitleTimelineTrack
            axis={project.narration?.subtitle_axis}
            durationMs={durationMs}
            currentMs={currentMs}
            selectedTimeRef={selectedAction?.time_ref}
            onSeek={(timeMs) => seekTimeline(timeMs, true)}
          />
          <Slider
            min={0}
            max={durationMs}
            step={100}
            value={currentMs}
            tooltip={{ formatter: (value) => `${((value ?? 0) / 1000).toFixed(1)}s` }}
            marks={Object.fromEntries(project.actions.map((action) => [action.at_ms, '']))}
            onChange={(value) => {
              seekTimeline(value)
            }}
            onChangeComplete={replayMobileState}
          />
          <div className="tb-timeline-actions">
            {[...project.actions]
              .sort((a, b) => a.at_ms - b.at_ms)
              .map((action) => (
                <Dropdown
                  key={action.id}
                  trigger={['contextMenu']}
                  menu={{
                    items: [
                      {
                        key: 'delete',
                        label: '删除动作',
                        icon: <DeleteOutlined />,
                        danger: true,
                      },
                    ],
                    onClick: ({ key, domEvent }) => {
                      domEvent.stopPropagation()
                      if (key === 'delete') deleteAction(action.id)
                    },
                  }}
                >
                  <button
                    type="button"
                    className={['tb-timeline-action', action.id === selectedActionId ? 'is-selected' : ''].join(' ')}
                    onClick={() => {
                      setSelectedActionId(action.id)
                      seekTimeline(action.at_ms)
                      setRightTab('actions')
                    }}
                  >
                    <span>{(action.at_ms / 1000).toFixed(1)}s</span>
                    <strong>{action.name}</strong>
                    <Tag>{actionLabel(action)}</Tag>
                    <Tooltip title="立即发送广播">
                      <SendOutlined
                        onClick={(event) => {
                          event.stopPropagation()
                          mobilePreviewRef.current?.broadcast(action)
                          seekTimeline(action.at_ms)
                        }}
                      />
                    </Tooltip>
                  </button>
                </Dropdown>
              ))}
            <Button
              type="dashed"
              icon={<PlusOutlined />}
              disabled={!anchors.length}
              onClick={() => addAction({
                id: uid('action'),
                name: '新高亮动作',
                at_ms: Math.round(currentMs / 100) * 100,
                command: {
                  type: 'apply_effect',
                  effect: {
                    effect_id: uid('effect'),
                    type: 'highlight',
                    tone: 'annotation',
                    target: { anchor_id: anchors[0]?.id ?? '' },
                  },
                },
              })}
            >
              当前时间添加动作
            </Button>
          </div>
        </div>
      </footer>
    </div>
  )
}
