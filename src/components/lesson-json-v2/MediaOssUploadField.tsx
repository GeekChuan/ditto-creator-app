import { useState } from 'react'
import { Button, Input, Progress, Space, Upload, message } from 'antd'
import { LoadingOutlined, UploadOutlined } from '@ant-design/icons'
import { assetsApi } from '../../api/assets'

interface Props {
  value?: string
  onChange?: (url: string) => void
  accept?: string
  mediaLabel?: string
  placeholder?: string
}

export default function MediaOssUploadField({
  value,
  onChange,
  accept = 'video/*,audio/*',
  mediaLabel = '媒体',
  placeholder = 'https://... 或上传文件',
}: Props) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleUpload = async (file: File) => {
    setUploading(true)
    setProgress(5)
    try {
      const uploaded = await assetsApi.uploadFile(file, (pct) => {
        setProgress((p) => Math.max(p, pct))
      })
      setProgress(100)
      onChange?.(uploaded.public_url)
      message.success(`${mediaLabel}已上传至 OSS`)
    } catch {
      message.error(`${mediaLabel}上传失败，请重试`)
    } finally {
      setUploading(false)
    }
    return false
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={8}>
      <Input value={value} onChange={(e) => onChange?.(e.target.value)} placeholder={placeholder} />
      <Upload accept={accept} showUploadList={false} beforeUpload={handleUpload}>
        <Button icon={uploading ? <LoadingOutlined /> : <UploadOutlined />} disabled={uploading}>
          上传{mediaLabel}
        </Button>
      </Upload>
      {uploading ? <Progress percent={progress} size="small" /> : null}
    </Space>
  )
}
