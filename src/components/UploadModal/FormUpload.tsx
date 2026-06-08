import { useState } from 'react'
import {
  Form, Input, Button, Upload, Progress,
  Typography, message, Divider,
} from 'antd'
import { InboxOutlined, CheckCircleFilled, LoadingOutlined } from '@ant-design/icons'
import { assetsApi, type VideoAssetCreate } from '../../api/assets'

const { Dragger } = Upload
const { Text } = Typography

interface UploadState {
  file: File | null
  publicUrl: string
  uploading: boolean
  progress: number
  done: boolean
}

interface VideoMetaState {
  duration: number | null
  videoWidth: number | null
  videoHeight: number | null
  coverWidth: number | null
  coverHeight: number | null
}

const initUploadState = (): UploadState => ({
  file: null,
  publicUrl: '',
  uploading: false,
  progress: 0,
  done: false,
})

const initMetaState = (): VideoMetaState => ({
  duration: null,
  videoWidth: null,
  videoHeight: null,
  coverWidth: null,
  coverHeight: null,
})

interface Props {
  onSuccess: () => void
}

async function uploadFileToCos(
  file: Blob,
  filename: string,
  contentType: string,
  setState: React.Dispatch<React.SetStateAction<UploadState>>,
): Promise<string> {
  setState((s) => ({ ...s, uploading: true, progress: 5 }))
  const uploadFile = new File([file], filename, {
    type: assetsApi.inferContentType(filename, contentType),
  })
  setState((s) => ({ ...s, progress: 10 }))
  const uploaded = await assetsApi.uploadFile(uploadFile, (percent) => {
    setState((s) => ({ ...s, progress: Math.max(s.progress, percent) }))
  })
  setState((s) => ({
    ...s,
    progress: 100,
    done: true,
    uploading: false,
    publicUrl: uploaded.public_url,
  }))
  return uploaded.public_url
}

async function extractVideoMetaAndCover(file: File): Promise<{
  duration: number | null
  width: number | null
  height: number | null
  coverBlob: Blob | null
}> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    const objectUrl = URL.createObjectURL(file)
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.src = objectUrl

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl)
      video.remove()
    }

    video.onloadedmetadata = () => {
      const duration = Number.isFinite(video.duration) ? Number(video.duration.toFixed(2)) : null
      const width = video.videoWidth || null
      const height = video.videoHeight || null
      video.currentTime = Math.min(0.2, Math.max(0, (video.duration || 0) / 2))

      video.onseeked = () => {
        if (!width || !height) {
          cleanup()
          resolve({ duration, width, height, coverBlob: null })
          return
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          cleanup()
          resolve({ duration, width, height, coverBlob: null })
          return
        }
        ctx.drawImage(video, 0, 0, width, height)
        canvas.toBlob((blob) => {
          cleanup()
          resolve({ duration, width, height, coverBlob: blob })
        }, 'image/jpeg', 0.86)
      }
    }

    video.onerror = () => {
      cleanup()
      reject(new Error('视频元数据读取失败'))
    }
  })
}

export default function FormUpload({ onSuccess }: Props) {
  const [form] = Form.useForm()
  const [video, setVideo] = useState<UploadState>(initUploadState())
  const [cover, setCover] = useState<UploadState>(initUploadState())
  const [videoMeta, setVideoMeta] = useState<VideoMetaState>(initMetaState())
  const [submitting, setSubmitting] = useState(false)
  const [processingMeta, setProcessingMeta] = useState(false)

  const handleVideoSelect = async (file: File) => {
    setVideo((s) => ({ ...s, file }))
    setProcessingMeta(true)
    try {
      await uploadFileToCos(file, file.name, file.type, setVideo)
      const meta = await extractVideoMetaAndCover(file)
      setVideoMeta({
        duration: meta.duration,
        videoWidth: meta.width,
        videoHeight: meta.height,
        coverWidth: meta.width,
        coverHeight: meta.height,
      })

      // 若用户未手动上传封面，自动抽帧封面并上传
      if (!cover.done && meta.coverBlob) {
        const autoCoverName = file.name.replace(/\.[^.]+$/, '') + '-cover.jpg'
        await uploadFileToCos(meta.coverBlob, autoCoverName, 'image/jpeg', setCover)
      }
    } catch (error: any) {
      const msg = error?.message || ''
      if (msg.includes('Network Error')) {
        message.error('视频上传失败：网络或 COS 跨域策略异常')
      } else {
        message.error('视频上传失败，请重试')
      }
      setVideo(initUploadState())
      setCover(initUploadState())
      setVideoMeta(initMetaState())
    } finally {
      setProcessingMeta(false)
    }
    return false
  }

  const handleCoverSelect = async (file: File) => {
    setCover((s) => ({ ...s, file }))
    try {
      await uploadFileToCos(file, file.name, file.type, setCover)
    } catch (error: any) {
      const msg = error?.message || ''
      if (msg.includes('Network Error')) {
        message.error('封面上传失败：网络或 COS 跨域策略异常')
      } else {
        message.error('封面上传失败，请重试')
      }
      setCover(initUploadState())
    }
    return false
  }

  const handleSubmit = async (values: Record<string, string>) => {
    if (!video.publicUrl) {
      message.warning('请先上传视频文件')
      return
    }
    if (processingMeta || cover.uploading) {
      message.info('正在提取封面，请稍候再保存')
      return
    }
    setSubmitting(true)
    try {
      const body: VideoAssetCreate = {
        video_url: video.publicUrl,
        cover_url: cover.publicUrl || null,
        title: values.title || null,
        author: values.author || null,
        description: values.description || null,
        source_url: values.source_url || null,
        duration: videoMeta.duration,
        video_width: videoMeta.videoWidth,
        video_height: videoMeta.videoHeight,
        cover_width: videoMeta.coverWidth,
        cover_height: videoMeta.coverHeight,
      }
      await assetsApi.create(body)
      message.success('素材入库成功')
      onSuccess()
    } catch {
      message.error('入库失败，请重试')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ padding: '4px 0' }}>
      {/* 视频上传 */}
      <Text strong style={{ fontSize: 13 }}>视频文件</Text>
      <div style={{ marginTop: 8, marginBottom: 16 }}>
        {video.done ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', border: '1px solid #d9f7be', borderRadius: 6, background: '#f6ffed' }}>
            <CheckCircleFilled style={{ color: '#52c41a', fontSize: 16 }} />
            <Text style={{ fontSize: 13 }}>{video.file?.name}</Text>
            <Button type="link" size="small" onClick={() => setVideo(initUploadState())} style={{ marginLeft: 'auto', padding: 0 }}>重新选择</Button>
          </div>
        ) : video.uploading ? (
          <div style={{ padding: '10px 14px', border: '1px dashed #d9d9d9', borderRadius: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <LoadingOutlined style={{ color: '#6366f1' }} />
              <Text style={{ fontSize: 13 }}>正在上传 {video.file?.name}…</Text>
            </div>
            <Progress percent={video.progress} size="small" showInfo={false} strokeColor="#6366f1" />
          </div>
        ) : (
          <Dragger
            accept="video/*"
            multiple={false}
            showUploadList={false}
            beforeUpload={handleVideoSelect}
            style={{ padding: '8px 0' }}
          >
            <p style={{ color: '#6366f1', fontSize: 28, lineHeight: 1 }}><InboxOutlined /></p>
            <p style={{ fontSize: 13, margin: '8px 0 4px' }}>点击或拖拽上传视频</p>
            <p style={{ fontSize: 12, color: '#999' }}>支持 MP4、MOV、AVI 等格式</p>
          </Dragger>
        )}
      </div>

      {/* 封面上传 */}
      <Text strong style={{ fontSize: 13 }}>封面图片 <Text type="secondary" style={{ fontWeight: 400 }}>(可选)</Text></Text>
      <div style={{ marginTop: 8, marginBottom: 20 }}>
        {cover.done ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', border: '1px solid #d9f7be', borderRadius: 6, background: '#f6ffed' }}>
            <CheckCircleFilled style={{ color: '#52c41a', fontSize: 16 }} />
            <Text style={{ fontSize: 13 }}>{cover.file?.name}</Text>
            <Button type="link" size="small" onClick={() => setCover(initUploadState())} style={{ marginLeft: 'auto', padding: 0 }}>重新选择</Button>
          </div>
        ) : cover.uploading ? (
          <div style={{ padding: '10px 14px', border: '1px dashed #d9d9d9', borderRadius: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <LoadingOutlined style={{ color: '#6366f1' }} />
              <Text style={{ fontSize: 13 }}>正在上传 {cover.file?.name}…</Text>
            </div>
            <Progress percent={cover.progress} size="small" showInfo={false} strokeColor="#6366f1" />
          </div>
        ) : (
          <Dragger
            accept="image/*"
            multiple={false}
            showUploadList={false}
            beforeUpload={handleCoverSelect}
            style={{ padding: '4px 0' }}
          >
            <p style={{ color: '#6366f1', fontSize: 24, lineHeight: 1 }}><InboxOutlined /></p>
            <p style={{ fontSize: 13, margin: '6px 0 4px' }}>点击或拖拽上传封面</p>
            <p style={{ fontSize: 12, color: '#999' }}>支持 JPG、PNG、WebP</p>
          </Dragger>
        )}
      </div>

      <Divider style={{ margin: '0 0 20px' }} />

      {/* 元数据表单 */}
      <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
        {processingMeta && (
          <div style={{ marginBottom: 12 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              正在提取视频封面和元数据，请稍候...
            </Text>
          </div>
        )}
        <Form.Item label="标题" name="title">
          <Input placeholder="视频标题（可留空）" />
        </Form.Item>
        <Form.Item label="作者" name="author">
          <Input placeholder="创作者名称" />
        </Form.Item>
        <Form.Item label="来源链接" name="source_url">
          <Input placeholder="https://..." />
        </Form.Item>
        <Form.Item label="描述" name="description">
          <Input.TextArea rows={3} placeholder="视频描述（可留空）" />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button
            type="primary"
            htmlType="submit"
            loading={submitting}
            disabled={!video.done || processingMeta || cover.uploading}
          >
            保存入库
          </Button>
        </Form.Item>
      </Form>
    </div>
  )
}
