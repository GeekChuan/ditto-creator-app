import { useCallback, useEffect, useRef } from 'react'
import { Typography } from 'antd'
import type { CourseDetailPreview } from '../utils/buildCoursePreviewDetail'

const PREVIEW_MESSAGE = 'ditto:course-detail-preview'
const PREVIEW_READY = 'ditto:course-detail-preview-ready'

const MOBILE_PREVIEW_BASE =
  import.meta.env.VITE_LEARNER_MOBILE_PREVIEW_BASE_URL || 'http://localhost:5175'

type Props = {
  courseId: string
  previewDetail: CourseDetailPreview | null
}

export default function CourseHomePreviewFrame({ courseId, previewDetail }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const previewRef = useRef(previewDetail)
  previewRef.current = previewDetail

  const postPreview = useCallback(() => {
    const detail = previewRef.current
    const win = iframeRef.current?.contentWindow
    if (!detail || !win) return
    win.postMessage({ type: PREVIEW_MESSAGE, detail }, '*')
  }, [])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === PREVIEW_READY) {
        postPreview()
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [postPreview])

  useEffect(() => {
    postPreview()
  }, [previewDetail, postPreview])

  const src = `${MOBILE_PREVIEW_BASE.replace(/\/$/, '')}/preview/courses/${courseId}/lessons`

  return (
    <div>
      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
        Learner 课程主页实时预览（修改装修项后自动刷新）
      </Typography.Text>
      <div
        style={{
          width: '100%',
          maxWidth: 390,
          margin: '0 auto',
          borderRadius: 24,
          overflow: 'hidden',
          border: '1px solid rgba(15, 23, 42, 0.12)',
          boxShadow: '0 12px 40px rgba(15, 23, 42, 0.12)',
          background: '#f5f6f8',
        }}
      >
        <iframe
          ref={iframeRef}
          title="课程主页预览"
          src={src}
          style={{
            display: 'block',
            width: '100%',
            height: 720,
            border: 'none',
            background: '#f5f6f8',
          }}
        />
      </div>
    </div>
  )
}
