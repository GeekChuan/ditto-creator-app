import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Alert, Button, Input, Space, Tag, Typography } from 'antd'
import { ReloadOutlined, SendOutlined } from '@ant-design/icons'
import type {
  TeachingBoardAction,
  TeachingBoardBroadcastMessage,
  TeachingBoardProject,
} from '../../types/teachingBoard'
import { makeMobilePreviewDocument, uid } from './model'

const MESSAGE_UPDATE = 'DITTO_ATB_V2_UPDATE'
const MESSAGE_READY = 'DITTO_ATB_V2_READY'
const MESSAGE_TEACHING_BOARD = 'DITTO_TEACHING_BOARD_COMMAND'
const DEFAULT_MOBILE_PREVIEW_URL = 'http://localhost:5175/dev/atb-submerge-preview'

export interface TeachingBoardMobilePreviewHandle {
  broadcast: (action: TeachingBoardAction) => void
  clearEffects: () => void
  reload: () => void
}

interface Props {
  project: TeachingBoardProject
  mobileUrl: string
  onMobileUrlChange: (url: string) => void
}

const TeachingBoardMobilePreview = forwardRef<TeachingBoardMobilePreviewHandle, Props>(
  function TeachingBoardMobilePreview({ project, mobileUrl, onMobileUrlChange }, ref) {
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const [ready, setReady] = useState(false)
    const [epoch, setEpoch] = useState(0)

    const resolvedUrl = useMemo(() => {
      const base = mobileUrl.trim() || import.meta.env.VITE_MOBILE_PREVIEW_URL || DEFAULT_MOBILE_PREVIEW_URL
      const sep = base.includes('?') ? '&' : '?'
      return `${base}${sep}activity=0&node=0&studio=${epoch}`
    }, [epoch, mobileUrl])

    const post = useCallback((message: Record<string, unknown>) => {
      iframeRef.current?.contentWindow?.postMessage(message, '*')
    }, [])

    const postDocument = useCallback(() => {
      post({ type: MESSAGE_UPDATE, payload: makeMobilePreviewDocument(project) })
    }, [post, project])

    const broadcastCommand = useCallback(
      (action: TeachingBoardAction) => {
        const message: TeachingBoardBroadcastMessage = {
          message_id: `${action.id}-${Date.now()}`,
          channel: project.document.broadcast_channel ?? project.document.board_id,
          board_id: project.document.board_id,
          command: action.command,
        }
        post({ type: MESSAGE_TEACHING_BOARD, payload: message })
      },
      [post, project.document.board_id, project.document.broadcast_channel],
    )

    const clearEffects = useCallback(() => {
      const message: TeachingBoardBroadcastMessage = {
        message_id: uid('clear'),
        channel: project.document.broadcast_channel ?? project.document.board_id,
        board_id: project.document.board_id,
        command: { type: 'clear_effects' },
      }
      post({ type: MESSAGE_TEACHING_BOARD, payload: message })
    }, [post, project.document.board_id, project.document.broadcast_channel])

    useImperativeHandle(ref, () => ({
      broadcast: broadcastCommand,
      clearEffects,
      reload: () => setEpoch((current) => current + 1),
    }), [broadcastCommand, clearEffects])

    useEffect(() => {
      const onMessage = (event: MessageEvent) => {
        if (event.source !== iframeRef.current?.contentWindow) return
        if (event.data?.type !== MESSAGE_READY) return
        setReady(true)
        postDocument()
      }
      window.addEventListener('message', onMessage)
      return () => window.removeEventListener('message', onMessage)
    }, [postDocument])

    useEffect(() => {
      if (ready) postDocument()
    }, [postDocument, ready])

    return (
      <div className="tb-mobile-preview-panel">
        <Space.Compact style={{ width: '100%' }}>
          <Input
            value={mobileUrl}
            placeholder={DEFAULT_MOBILE_PREVIEW_URL}
            onChange={(event) => onMobileUrlChange(event.target.value)}
          />
          <Button icon={<ReloadOutlined />} onClick={() => setEpoch((current) => current + 1)}>
            重载
          </Button>
        </Space.Compact>
        <div className="tb-mobile-preview-status">
          <Typography.Text type="secondary" style={{ fontSize: 11 }}>
            Mobile iframe
          </Typography.Text>
          <Tag color={ready ? 'success' : 'default'}>{ready ? '已连接' : '等待连接'}</Tag>
        </div>
        <div className="tb-mobile-preview-phone">
          <iframe
            key={epoch}
            ref={iframeRef}
            title="TeachingBoard Mobile Preview"
            src={resolvedUrl}
            onLoad={() => {
              setReady(false)
              window.setTimeout(postDocument, 180)
            }}
          />
        </div>
        <Space style={{ width: '100%', justifyContent: 'center' }}>
          <Button size="small" icon={<SendOutlined />} onClick={postDocument}>同步白板</Button>
          <Button size="small" onClick={clearEffects}>清空效果</Button>
        </Space>
        {!ready ? (
          <Alert
            type="info"
            showIcon
            message="请先启动包含 TeachingBoard 的 mobile dev 服务，并确认上方端口。"
          />
        ) : null}
      </div>
    )
  },
)

export default TeachingBoardMobilePreview
