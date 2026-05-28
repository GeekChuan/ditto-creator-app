import { useEffect, useRef, useState } from 'react'
import { Modal, Form, Input, message, Progress, Image } from 'antd'
import { CameraOutlined, LoadingOutlined, EyeOutlined } from '@ant-design/icons'
import { assetsApi, type VideoAsset } from '../api/assets'

const { TextArea } = Input

interface CoverState {
  /** 本地预览 URL（objectURL），仅用于展示 */
  previewUrl: string | null
  /** 上传完成后的 COS public_url */
  publicUrl: string | null
  width: number | null
  height: number | null
  uploading: boolean
  progress: number
}

const initCover = (): CoverState => ({
  previewUrl: null,
  publicUrl: null,
  width: null,
  height: null,
  uploading: false,
  progress: 0,
})

interface Props {
  open: boolean
  asset: VideoAsset | null
  onClose: () => void
  onSuccess: (updated: VideoAsset) => void
}

/** 读取图片文件的自然宽高 */
function readImageDimensions(objectUrl: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve) => {
    const img = new window.Image()
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight })
    img.onerror = () => resolve({ w: 0, h: 0 })
    img.src = objectUrl
  })
}

export default function EditAssetModal({ open, asset, onClose, onSuccess }: Props) {
  const [form] = Form.useForm()
  const [cover, setCover] = useState<CoverState>(initCover())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)

  // 每次打开弹窗时重置表单和封面状态
  useEffect(() => {
    if (open && asset) {
      form.setFieldsValue({
        title: asset.title ?? '',
        author: asset.author ?? '',
        description: asset.description ?? '',
        source_url: asset.source_url ?? '',
      })
      setCover(initCover())
    }
  }, [open, asset, form])

  // 清理 objectURL 避免内存泄漏
  useEffect(() => {
    return () => {
      if (cover.previewUrl) URL.revokeObjectURL(cover.previewUrl)
    }
  }, [cover.previewUrl])

  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!e.target) return
    // 清空 input 以允许重复选同一文件
    ;(e.target as HTMLInputElement).value = ''
    if (!file) return

    const objectUrl = URL.createObjectURL(file)
    const { w, h } = await readImageDimensions(objectUrl)

    setCover({ previewUrl: objectUrl, publicUrl: null, width: w || null, height: h || null, uploading: true, progress: 5 })

    try {
      const ct = assetsApi.inferContentType(file.name, file.type)
      const presign = await assetsApi.presign({ filename: file.name, content_type: ct })
      setCover((s) => ({ ...s, progress: 10 }))
      await assetsApi.uploadToCos(presign.upload_url, file, ct, (pct) => {
        setCover((s) => ({ ...s, progress: Math.max(s.progress, pct) }))
      })
      setCover((s) => ({ ...s, publicUrl: presign.public_url, uploading: false, progress: 100 }))
    } catch {
      message.error('封面上传失败，请重试')
      URL.revokeObjectURL(objectUrl)
      setCover(initCover())
    }
  }

  const handleOk = async () => {
    if (cover.uploading) {
      message.info('封面正在上传，请稍候')
      return
    }
    try {
      const values = await form.validateFields()
      if (!asset) return
      setSaving(true)

      const payload: Parameters<typeof assetsApi.update>[1] = {
        title: values.title || null,
        author: values.author || null,
        description: values.description || null,
        source_url: values.source_url || null,
      }
      // 仅当用户上传了新封面时才覆盖
      if (cover.publicUrl) {
        payload.cover_url = cover.publicUrl
        payload.cover_width = cover.width
        payload.cover_height = cover.height
      }

      const updated = await assetsApi.update(asset.id, payload)
      message.success('保存成功')
      onSuccess(updated)
      onClose()
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'errorFields' in err) return
      message.error('保存失败，请重试')
    } finally {
      setSaving(false)
    }
  }

  // 当前封面展示地址：优先本地预览，其次 access_url，再次 cover_url
  const displayCover = cover.previewUrl ?? asset?.cover_access_url ?? asset?.cover_url ?? null

  return (
    <Modal
      open={open}
      title="编辑素材"
      onCancel={onClose}
      onOk={handleOk}
      okText="保存"
      cancelText="取消"
      confirmLoading={saving}
      destroyOnHidden
      width={560}
    >
      {/* 封面区域 */}
      <div style={{ marginBottom: 20, marginTop: 8 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: 'rgba(0,0,0,0.88)' }}>
          封面
        </div>
        <CoverZone
          displayCover={displayCover}
          uploading={cover.uploading}
          progress={cover.progress}
          uploadDone={cover.publicUrl !== null}
          onClickReplace={() => fileInputRef.current?.click()}
        />
        {/* 上传进度条 */}
        {cover.uploading && (
          <Progress
            percent={cover.progress}
            size="small"
            showInfo={false}
            strokeColor="#6366f1"
            style={{ marginTop: 6 }}
          />
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleCoverFileChange}
        />
      </div>

      <Form form={form} layout="vertical">
        <Form.Item
          name="title"
          label="标题"
          rules={[{ max: 200, message: '标题最多 200 字' }]}
        >
          <Input placeholder="请输入素材标题" />
        </Form.Item>
        <Form.Item
          name="author"
          label="作者"
          rules={[{ max: 100, message: '作者最多 100 字' }]}
        >
          <Input placeholder="请输入作者名称" />
        </Form.Item>
        <Form.Item name="description" label="描述">
          <TextArea rows={3} placeholder="请输入素材描述" showCount maxLength={500} />
        </Form.Item>
        <Form.Item
          name="source_url"
          label="来源链接"
          rules={[{ type: 'url', message: '请输入有效的 URL', warningOnly: true }]}
          style={{ marginBottom: 0 }}
        >
          <Input placeholder="https://" />
        </Form.Item>
      </Form>
    </Modal>
  )
}

// ── 封面操作区 ────────────────────────────────────────────────────────────────
function CoverZone({
  displayCover,
  uploading,
  progress: _progress,
  uploadDone,
  onClickReplace,
}: {
  displayCover: string | null
  uploading: boolean
  progress: number
  uploadDone: boolean
  onClickReplace: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '16 / 9',
        background: '#111',
        borderRadius: 8,
        overflow: 'hidden',
        cursor: 'pointer',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 封面图 */}
      {displayCover ? (
        <Image
          src={displayCover}
          alt="封面"
          preview={{ mask: false }}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          wrapperStyle={{ width: '100%', height: '100%' }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: 32 }}>
          🎬
        </div>
      )}

      {/* Hover 浮层：预览 + 替换 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 24,
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.18s ease',
          pointerEvents: hovered ? 'auto' : 'none',
        }}
      >
        {/* 预览：使用 Ant Design Image 的 preview 功能 */}
        {displayCover && (
          <Image
            src={displayCover}
            style={{ display: 'none' }}
            preview={{
              visible: false,
              mask: (
                <button
                  style={overlayBtnStyle}
                  title="预览封面"
                  onClick={(e) => e.stopPropagation()}
                >
                  <EyeOutlined style={{ fontSize: 18, color: '#fff' }} />
                  <span style={{ fontSize: 12, color: '#fff', marginTop: 4 }}>预览</span>
                </button>
              ),
            }}
          />
        )}

        {/* 替换封面 */}
        <button
          style={overlayBtnStyle}
          title="替换封面"
          onClick={(e) => { e.stopPropagation(); onClickReplace() }}
        >
          {uploading ? (
            <LoadingOutlined style={{ fontSize: 18, color: '#fff' }} />
          ) : (
            <CameraOutlined style={{ fontSize: 18, color: '#fff' }} />
          )}
          <span style={{ fontSize: 12, color: '#fff', marginTop: 4 }}>
            {uploading ? '上传中' : uploadDone ? '重新替换' : '替换封面'}
          </span>
        </button>
      </div>
    </div>
  )
}

const overlayBtnStyle: React.CSSProperties = {
  all: 'unset',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  width: 64,
  height: 64,
  borderRadius: 8,
  background: 'rgba(255,255,255,0.15)',
  gap: 4,
}
