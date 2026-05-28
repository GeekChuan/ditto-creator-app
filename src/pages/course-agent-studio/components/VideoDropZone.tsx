import { useRef, useState, useCallback, useEffect } from 'react'
import { Typography } from 'antd'
import { VideoCameraOutlined, CloseCircleFilled } from '@ant-design/icons'

const { Text } = Typography

interface Props {
  file: File | null
  objectUrl: string | null
  onChange: (file: File, url: string) => void
  onClear: () => void
}

export default function VideoDropZone({ file, objectUrl, onChange, onClear }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return
      const f = files[0]
      if (!f.type.startsWith('video/')) return
      const url = URL.createObjectURL(f)
      onChange(f, url)
    },
    [onChange],
  )

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }
  const onDragLeave = () => setDragging(false)
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [objectUrl])

  if (file && objectUrl) {
    return (
      <div
        className="cas-dropzone has-video"
        style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12 }}
      >
        <video
          src={objectUrl}
          style={{ width: 80, height: 52, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
          muted
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Text
            strong
            style={{ display: 'block', fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
          >
            {file.name}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {(file.size / 1024 / 1024).toFixed(1)} MB
          </Text>
        </div>
        <CloseCircleFilled
          onClick={(e) => { e.stopPropagation(); onClear() }}
          style={{ fontSize: 18, color: '#9ca3af', cursor: 'pointer', flexShrink: 0 }}
        />
      </div>
    )
  }

  return (
    <div
      className={`cas-dropzone${dragging ? ' dragging' : ''}`}
      style={{ padding: '20px 16px', textAlign: 'center' }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <VideoCameraOutlined style={{ fontSize: 22, color: '#6366f1', marginBottom: 6 }} />
      <div>
        <Text style={{ fontSize: 13, color: '#6b7280' }}>
          拖放视频至此，或 <span style={{ color: '#6366f1', fontWeight: 500 }}>点击选择</span>
        </Text>
      </div>
      <Text type="secondary" style={{ fontSize: 11 }}>
        支持 MP4、MOV、WebM
      </Text>
    </div>
  )
}
