import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Button, Tooltip, Typography } from 'antd'
import { AimOutlined, CaretRightOutlined, StopOutlined } from '@ant-design/icons'
import type { AtbReactionDocument } from '../../types/atbReactionV2'
import './atb-v2-mobile-preview.css'

const { Text } = Typography

const MESSAGE_UPDATE = 'DITTO_ATB_V2_UPDATE'
const MESSAGE_PLAY = 'DITTO_ATB_V2_PLAY'
const MESSAGE_PAUSE = 'DITTO_ATB_V2_PAUSE'
const MESSAGE_READY = 'DITTO_ATB_V2_READY'
const MESSAGE_NODE_CHANGE = 'DITTO_ATB_V2_NODE_CHANGE'
const DEFAULT_MOBILE_PREVIEW_URL = 'http://localhost:5175/dev/atb-submerge-preview'
const IPHONE_14_PRO_WIDTH = 393
const IPHONE_14_PRO_HEIGHT = 852
const PHONE_BEZEL = 3

/** 一次预览请求；epoch 递增以强制 iframe 重挂载并从指定位置开始播放 */
export interface PreviewRequest {
  activityIndex: number
  nodeIndex: number
  epoch: number
  label: string
}

/** iframe 回传的当前播放节点信息 */
export interface PlayingNodeInfo {
  activityIndex: number
  nodeIndex: number
  activityId: string
  nodeId: string
}

function playingNodeLabel(info: PlayingNodeInfo): string {
  return `A${info.activityIndex + 1} · 节点${info.nodeIndex + 1}`
}

interface Props {
  doc: AtbReactionDocument
  request: PreviewRequest | null
  onStartFromBeginning: () => void
  onStop: () => void
  /** iframe 内播放节点变化时回调（停止/黑屏时回传 null） */
  onPlayingNodeChange?: (info: PlayingNodeInfo | null) => void
  /** 点「定位」时把编辑器选中态跳到当前播放的节点 */
  onLocateNode?: (info: PlayingNodeInfo) => void
}

/**
 * 右栏常驻的手机预览坞：默认黑屏不渲染，
 * 点「预览本节点」或「从头播放」后才加载播放器并推送文档。
 */
export default function MobilePreviewDock({
  doc,
  request,
  onStartFromBeginning,
  onStop,
  onPlayingNodeChange,
  onLocateNode,
}: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [phoneWidth, setPhoneWidth] = useState(260)
  const [playing, setPlaying] = useState<PlayingNodeInfo | null>(null)

  const active = request !== null

  const updatePlaying = useCallback(
    (info: PlayingNodeInfo | null) => {
      setPlaying(info)
      onPlayingNodeChange?.(info)
    },
    [onPlayingNodeChange],
  )

  const previewUrl = useMemo(() => {
    if (!request) return ''
    const base: string = import.meta.env.VITE_MOBILE_PREVIEW_URL || DEFAULT_MOBILE_PREVIEW_URL
    const sep = base.includes('?') ? '&' : '?'
    return `${base}${sep}activity=${request.activityIndex}&node=${request.nodeIndex}`
  }, [request])

  const postToPreview = useCallback((message: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(message, '*')
  }, [])

  const postDocument = useCallback(() => {
    postToPreview({ type: MESSAGE_UPDATE, payload: doc })
  }, [doc, postToPreview])

  const postPlay = useCallback(() => {
    postToPreview({ type: MESSAGE_PLAY })
  }, [postToPreview])

  const handleStop = useCallback(() => {
    postToPreview({ type: MESSAGE_PAUSE })
    updatePlaying(null)
    onStop()
  }, [postToPreview, updatePlaying, onStop])

  // 播放器 iframe 就绪后推送文档并开播；同时接收 iframe 回传的当前播放节点
  useEffect(() => {
    if (!active) {
      updatePlaying(null)
      return
    }
    const onMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return
      if (event.data?.type === MESSAGE_READY) {
        postDocument()
        postPlay()
        return
      }
      if (event.data?.type === MESSAGE_NODE_CHANGE) {
        const payload = event.data.payload as PlayingNodeInfo | undefined
        if (payload && typeof payload.activityIndex === 'number' && typeof payload.nodeIndex === 'number') {
          updatePlaying(payload)
        }
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [active, postDocument, postPlay, updatePlaying])

  // 编辑内容实时同步到已激活的预览
  useEffect(() => {
    if (!active) return
    postDocument()
  }, [doc, active, postDocument])

  // 手机壳尺寸自适应右栏可用宽高
  useLayoutEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const update = () => {
      const w = Math.min(
        wrap.clientWidth,
        (wrap.clientHeight * IPHONE_14_PRO_WIDTH) / IPHONE_14_PRO_HEIGHT,
      )
      if (w > 0) setPhoneWidth(w)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(wrap)
    return () => observer.disconnect()
  }, [])

  const previewScale = (phoneWidth - PHONE_BEZEL * 2) / IPHONE_14_PRO_WIDTH

  return (
    <div className="atb-v2-preview-dock">
      <div className="atb-v2-preview-dock-toolbar">
        <Text strong style={{ fontSize: 13 }}>
          预览
        </Text>
        <span style={{ flex: 1 }} />
        <Tooltip title="从第一个 Activity 的第一个节点开始播放">
          <Button size="small" icon={<CaretRightOutlined />} onClick={onStartFromBeginning}>
            从头播放
          </Button>
        </Tooltip>
        <Button size="small" icon={<StopOutlined />} disabled={!active} onClick={handleStop}>
          停止
        </Button>
      </div>

      <div className="atb-v2-preview-dock-phone-wrap" ref={wrapRef}>
        <div className="atb-v2-preview-phone" style={{ width: phoneWidth }}>
          <div className="atb-v2-preview-phone-screen">
            {active ? (
              <div
                className="atb-v2-preview-iframe-scaler"
                style={{
                  width: IPHONE_14_PRO_WIDTH,
                  height: IPHONE_14_PRO_HEIGHT,
                  transform: `translate(-50%, -50%) scale(${previewScale})`,
                }}
              >
                <iframe
                  key={request.epoch}
                  ref={iframeRef}
                  title="移动端预览"
                  src={previewUrl}
                  width={IPHONE_14_PRO_WIDTH}
                  height={IPHONE_14_PRO_HEIGHT}
                  onLoad={() => {
                    postDocument()
                    window.setTimeout(postPlay, 120)
                  }}
                />
              </div>
            ) : (
              <div className="atb-v2-preview-dock-idle">
                选中节点后点「预览本节点」
                <br />
                或点上方「从头播放」
              </div>
            )}
            <div className="atb-v2-preview-dynamic-island" aria-hidden>
              <span className="atb-v2-preview-dynamic-island-lens" />
            </div>
            <div className="atb-v2-preview-home-indicator" aria-hidden />
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          minHeight: 22,
        }}
      >
        <Text type="secondary" style={{ fontSize: 11 }}>
          {active
            ? playing
              ? `正在播放：${playingNodeLabel(playing)} · 编辑实时同步`
              : `正在预览：${request.label} · 编辑实时同步`
            : '未推送 · 393 × 852'}
        </Text>
        {active && playing && onLocateNode ? (
          <Tooltip title="在左侧大纲和中间编辑区定位到正在播放的节点">
            <Button
              size="small"
              type="link"
              icon={<AimOutlined />}
              style={{ fontSize: 11, padding: '0 4px', height: 20 }}
              onClick={() => onLocateNode(playing)}
            >
              定位到 Node
            </Button>
          </Tooltip>
        ) : null}
      </div>
    </div>
  )
}
