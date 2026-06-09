import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Button, Card, Space, Typography } from 'antd'
import { MobileOutlined } from '@ant-design/icons'
import type { AtbReactionDocument } from '../../types/atbReactionV2'
import './atb-v2-mobile-preview.css'

const { Text, Paragraph } = Typography

const MESSAGE_UPDATE = 'DITTO_ATB_V2_UPDATE'
const MESSAGE_PLAY = 'DITTO_ATB_V2_PLAY'
const MESSAGE_PAUSE = 'DITTO_ATB_V2_PAUSE'
const MESSAGE_READY = 'DITTO_ATB_V2_READY'
const DEFAULT_MOBILE_PREVIEW_URL = 'http://localhost:5175/dev/atb-submerge-preview'
const SLIDE_MS = 360
const IPHONE_14_PRO_WIDTH = 393
const IPHONE_14_PRO_HEIGHT = 852

interface Props {
  doc: AtbReactionDocument
}

export default function AtbV2MobilePreviewPanel({ doc }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const screenRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [previewScale, setPreviewScale] = useState(1)
  const previewUrl = useMemo(
    () => import.meta.env.VITE_MOBILE_PREVIEW_URL || DEFAULT_MOBILE_PREVIEW_URL,
    [],
  )

  const postToPreview = useCallback((message: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(message, '*')
  }, [])

  const postDocument = useCallback(() => {
    postToPreview({ type: MESSAGE_UPDATE, payload: doc })
  }, [doc, postToPreview])

  const postPlay = useCallback(() => {
    postToPreview({ type: MESSAGE_PLAY })
  }, [postToPreview])

  const postPause = useCallback(() => {
    postToPreview({ type: MESSAGE_PAUSE })
  }, [postToPreview])

  const handleOpen = useCallback(() => {
    setOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    postPause()
    setOpen(false)
  }, [postPause])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === MESSAGE_READY) {
        postDocument()
        if (open) postPlay()
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [open, postDocument, postPlay])

  useEffect(() => {
    if (!open) return
    postDocument()
    const timer = window.setTimeout(postPlay, SLIDE_MS + 80)
    return () => clearTimeout(timer)
  }, [open, postDocument, postPlay])

  useEffect(() => {
    if (!open) return
    postDocument()
  }, [doc, open, postDocument])

  useLayoutEffect(() => {
    if (!open) return
    const screen = screenRef.current
    if (!screen) return

    const updateScale = () => {
      const scale = Math.min(
        screen.clientWidth / IPHONE_14_PRO_WIDTH,
        screen.clientHeight / IPHONE_14_PRO_HEIGHT,
      )
      setPreviewScale(scale > 0 ? scale : 1)
    }

    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(screen)
    return () => observer.disconnect()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, handleClose])

  return (
    <>
      <Card size="small" className="atb-v2-preview-trigger-card">
        <Space direction="vertical" style={{ width: '100%' }} size={8}>
          <Text strong>移动端播放器预览</Text>
          <Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 12 }}>
            iPhone 14 Pro 比例手机壳，从侧边滑入；进入自动播放，收起自动暂停。
          </Paragraph>
          <Button type="primary" icon={<MobileOutlined />} block onClick={handleOpen}>
            打开预览
          </Button>
        </Space>
      </Card>

      <div
        className={`atb-v2-preview-overlay${open ? ' is-open' : ''}`}
        onClick={handleClose}
        aria-hidden={!open}
      />

      <aside
        className={`atb-v2-preview-drawer${open ? ' is-open' : ''}`}
        aria-hidden={!open}
        aria-label="移动端播放器预览"
      >
        <div className="atb-v2-preview-drawer-header">
          <h3 className="atb-v2-preview-drawer-title">移动端预览</h3>
          <Button type="text" onClick={handleClose}>
            收起
          </Button>
        </div>

        <p className="atb-v2-preview-drawer-hint">
          393 × 852 · 编辑内容会自动同步到手机预览
        </p>

        <div className="atb-v2-preview-phone">
          <div className="atb-v2-preview-phone-screen" ref={screenRef}>
            {open ? (
              <div
                className="atb-v2-preview-iframe-scaler"
                style={{
                  width: IPHONE_14_PRO_WIDTH,
                  height: IPHONE_14_PRO_HEIGHT,
                  transform: `translate(-50%, -50%) scale(${previewScale})`,
                }}
              >
                <iframe
                  ref={iframeRef}
                  title="ATB V2 Mobile Preview"
                  src={previewUrl}
                  width={IPHONE_14_PRO_WIDTH}
                  height={IPHONE_14_PRO_HEIGHT}
                  onLoad={() => {
                    postDocument()
                    window.setTimeout(postPlay, 120)
                  }}
                />
              </div>
            ) : null}
            <div className="atb-v2-preview-dynamic-island" aria-hidden>
              <span className="atb-v2-preview-dynamic-island-lens" />
            </div>
            <div className="atb-v2-preview-home-indicator" aria-hidden />
          </div>
        </div>

        <div className="atb-v2-preview-drawer-actions">
          <Button onClick={postDocument} block>
            推送到预览
          </Button>
          <Text type="secondary" style={{ fontSize: 11, textAlign: 'center' }}>
            {previewUrl}
          </Text>
        </div>
      </aside>
    </>
  )
}
