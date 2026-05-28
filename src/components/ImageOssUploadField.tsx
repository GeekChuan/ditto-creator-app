import { useEffect, useRef, useState } from 'react'
import { Button, Image, Input, Progress, Space, Upload, message } from 'antd'
import { LoadingOutlined, UploadOutlined } from '@ant-design/icons'
import { assetsApi } from '../api/assets'

function readImageDimensions(objectUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new window.Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => resolve({ w: 0, h: 0 })
    img.src = objectUrl
  })
}

interface Props {
  value?: string
  onChange?: (url: string) => void
  onUploaded?: (payload: { url: string; width: number; height: number }) => void
  placeholder?: string
}

export default function ImageOssUploadField({
  value,
  onChange,
  onUploaded,
  placeholder = 'https://... 或上传图片自动填入',
}: Props) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    }
  }, [])

  const handleUpload = async (file: File) => {
    const objectUrl = URL.createObjectURL(file)
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = objectUrl
    setPreviewUrl(objectUrl)

    setUploading(true)
    setProgress(5)
    try {
      const { w, h } = await readImageDimensions(objectUrl)
      const ct = assetsApi.inferContentType(file.name, file.type)
      const presign = await assetsApi.presign({ filename: file.name, content_type: ct })
      setProgress(10)
      await assetsApi.uploadToCos(presign.upload_url, file, ct, (pct) => {
        setProgress((p) => Math.max(p, pct))
      })
      setProgress(100)
      onChange?.(presign.public_url)
      onUploaded?.({ url: presign.public_url, width: w, height: h })
      message.success('图片已上传至 OSS')
    } catch {
      message.error('图片上传失败，请重试')
      setPreviewUrl(null)
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }
    } finally {
      setUploading(false)
    }
    return false
  }

  const displayPreview = previewUrl || (value?.trim() ? value : null)

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={8}>
      <Input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={uploading}
      />
      <Space wrap align="center">
        <Upload
          accept="image/*"
          showUploadList={false}
          beforeUpload={(file) => {
            void handleUpload(file)
            return false
          }}
          disabled={uploading}
        >
          <Button icon={uploading ? <LoadingOutlined /> : <UploadOutlined />} disabled={uploading}>
            {uploading ? '上传中…' : '上传图片到 OSS'}
          </Button>
        </Upload>
        {uploading && <Progress percent={progress} size="small" style={{ width: 160, marginBottom: 0 }} />}
      </Space>
      {displayPreview && (
        <Image
          src={displayPreview}
          alt="预览"
          style={{ maxWidth: 240, maxHeight: 160, objectFit: 'contain' }}
        />
      )}
    </Space>
  )
}
