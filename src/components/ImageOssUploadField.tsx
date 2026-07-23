import { useEffect, useRef, useState } from 'react'
import { Button, Checkbox, Image, Input, InputNumber, Progress, Space, Tooltip, Typography, Upload, message } from 'antd'
import { LoadingOutlined, UploadOutlined } from '@ant-design/icons'
import { assetsApi } from '../api/assets'
import { useSignedMediaUrl } from '../hooks/useSignedMediaUrl'

const { Text } = Typography

const DEFAULT_MAX_WIDTH = 860
const COMPRESS_PREFS_KEY = 'ditto-image-upload-compress-prefs-v1'

interface CompressPrefs {
  widthEnabled: boolean
  maxWidth: number
  tinifyEnabled: boolean
}

function loadCompressPrefs(): CompressPrefs {
  try {
    const raw = localStorage.getItem(COMPRESS_PREFS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<CompressPrefs>
      return {
        widthEnabled: parsed.widthEnabled ?? true,
        maxWidth: typeof parsed.maxWidth === 'number' && parsed.maxWidth > 0 ? parsed.maxWidth : DEFAULT_MAX_WIDTH,
        tinifyEnabled: parsed.tinifyEnabled ?? true,
      }
    }
  } catch {
    // ignore
  }
  return { widthEnabled: true, maxWidth: DEFAULT_MAX_WIDTH, tinifyEnabled: true }
}

function saveCompressPrefs(prefs: CompressPrefs) {
  try {
    localStorage.setItem(COMPRESS_PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // ignore
  }
}

function readImageDimensions(objectUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new window.Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => resolve({ w: 0, h: 0 })
    img.src = objectUrl
  })
}

/** 用 canvas 把图片等比缩到 maxWidth（仅在原宽超限时调用） */
async function downscaleImage(file: File, maxWidth: number): Promise<File> {
  const bitmap = await createImageBitmap(file)
  try {
    if (bitmap.width <= maxWidth) return file
    const scale = maxWidth / bitmap.width
    const targetW = maxWidth
    const targetH = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = targetW
    canvas.height = targetH
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, targetW, targetH)
    const type = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png'
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, type, type === 'image/jpeg' ? 0.92 : undefined),
    )
    if (!blob) return file
    return new File([blob], file.name, { type })
  } finally {
    bitmap.close()
  }
}

function formatBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)}MB`
  return `${Math.round(n / 1024)}KB`
}

/** 优先取后端 HTTPException 的 detail，其次 axios/Error message */
function extractErrorMessage(e: unknown): string | null {
  if (e && typeof e === 'object') {
    const detail = (e as { response?: { data?: { detail?: unknown } } }).response?.data?.detail
    if (typeof detail === 'string' && detail.trim()) return detail
  }
  if (e instanceof Error && e.message) return e.message
  return null
}

interface Props {
  value?: string
  onChange?: (url: string) => void
  onUploaded?: (payload: { url: string; width: number; height: number }) => void
  placeholder?: string
  /** 展示「宽度压缩 / TinyPNG 压缩」选项（submerge 背景图等场景） */
  enableCompression?: boolean
}

export default function ImageOssUploadField({
  value,
  onChange,
  onUploaded,
  placeholder = 'https://... 或上传图片自动填入',
  enableCompression = false,
}: Props) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [compressPrefs, setCompressPrefs] = useState<CompressPrefs>(loadCompressPrefs)
  const [lastResult, setLastResult] = useState<string | null>(null)
  const objectUrlRef = useRef<string | null>(null)

  const updatePrefs = (patch: Partial<CompressPrefs>) => {
    setCompressPrefs((prev) => {
      const next = { ...prev, ...patch }
      saveCompressPrefs(next)
      return next
    })
  }

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
    setLastResult(null)

    const widthEnabled = enableCompression && compressPrefs.widthEnabled
    const tinifyEnabled = enableCompression && compressPrefs.tinifyEnabled
    const maxWidth = compressPrefs.maxWidth || DEFAULT_MAX_WIDTH

    setUploading(true)
    setProgress(5)
    try {
      const { w, h } = await readImageDimensions(objectUrl)
      setProgress(10)
      const needResize = widthEnabled && w > maxWidth
      const outW = needResize ? maxWidth : w
      const outH = needResize && w > 0 ? Math.round((h * maxWidth) / w) : h

      let url: string
      if (tinifyEnabled) {
        // 缩宽交给 tinify（resize scale，质量更好），压缩+转存由后端完成
        const res = await assetsApi.compressUploadImage(file, needResize ? maxWidth : undefined, (pct) => {
          setProgress((p) => Math.max(p, pct))
        })
        url = res.public_url
        setLastResult(
          `TinyPNG：${formatBytes(res.original_bytes)} → ${formatBytes(res.output_bytes)}${needResize ? ` · 宽度已压到 ${maxWidth}px` : ''}`,
        )
      } else {
        const toUpload = needResize ? await downscaleImage(file, maxWidth) : file
        setProgress(20)
        const uploaded = await assetsApi.uploadFile(toUpload, (pct) => {
          setProgress((p) => Math.max(p, pct))
        })
        url = uploaded.public_url
        if (needResize) setLastResult(`宽度已压到 ${maxWidth}px`)
      }

      setProgress(100)
      onChange?.(url)
      onUploaded?.({ url, width: outW, height: outH })
      message.success('图片已上传至 OSS')
    } catch (e) {
      const detail = extractErrorMessage(e)
      message.error(detail ? `图片上传失败：${detail}` : '图片上传失败，请重试')
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

  const signedValueUrl = useSignedMediaUrl(previewUrl ? null : value)
  const displayPreview = previewUrl || signedValueUrl

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={8}>
      <Input
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={uploading}
      />
      {enableCompression && (
        <Space wrap size={12} align="center">
          <Checkbox
            checked={compressPrefs.widthEnabled}
            disabled={uploading}
            onChange={(e) => updatePrefs({ widthEnabled: e.target.checked })}
          >
            宽度压缩
          </Checkbox>
          <Tooltip title="超过该宽度的图片将等比缩小">
            <InputNumber
              size="small"
              min={100}
              max={8192}
              step={10}
              value={compressPrefs.maxWidth}
              disabled={uploading || !compressPrefs.widthEnabled}
              onChange={(v) => updatePrefs({ maxWidth: v ?? DEFAULT_MAX_WIDTH })}
              addonAfter="px"
              style={{ width: 130 }}
            />
          </Tooltip>
          <Checkbox
            checked={compressPrefs.tinifyEnabled}
            disabled={uploading}
            onChange={(e) => updatePrefs({ tinifyEnabled: e.target.checked })}
          >
            图片压缩（TinyPNG）
          </Checkbox>
        </Space>
      )}
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
        {!uploading && lastResult && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            {lastResult}
          </Text>
        )}
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
