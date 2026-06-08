import { Slider, Space, Typography } from 'antd'
import ImageOssUploadField from './ImageOssUploadField'
import { PAGE_TEXTURE_PRESETS, type CourseBranding } from '../constants/courseBranding'

type Props = {
  value?: CourseBranding | null
  onChange?: (value: CourseBranding | null) => void
}

export default function CourseBrandingField({ value, onChange }: Props) {
  const branding = value ?? {}
  const pageTexture = branding.page_texture
  const selectedPreset = pageTexture?.preset ?? null
  const customTextureUrl = pageTexture?.url?.trim() || null
  const metaIconUrl = branding.meta_icon?.url ?? undefined
  const hasTexture = Boolean(selectedPreset || customTextureUrl)
  const textureOpacity = pageTexture?.opacity ?? 0.06

  const patch = (next: CourseBranding) => {
    const hasTexture = next.page_texture?.preset || next.page_texture?.url?.trim()
    const hasIcon = next.meta_icon?.url?.trim()
    if (!hasTexture && !hasIcon) {
      onChange?.(null)
      return
    }
    onChange?.(next)
  }

  const selectPreset = (presetId: (typeof PAGE_TEXTURE_PRESETS)[number]['id'] | null) => {
    if (!presetId) {
      patch({ ...branding, page_texture: null })
      return
    }
    patch({
      ...branding,
      page_texture: {
        preset: presetId,
        opacity: pageTexture?.opacity ?? 0.06,
        tile_size: pageTexture?.tile_size ?? 160,
      },
    })
  }

  const setCustomTexture = (url: string) => {
    const trimmed = url.trim()
    if (!trimmed) {
      patch({ ...branding, page_texture: selectedPreset ? pageTexture : null })
      return
    }
    patch({
      ...branding,
      page_texture: {
        url: trimmed,
        opacity: pageTexture?.opacity ?? 0.06,
        tile_size: pageTexture?.tile_size ?? 160,
      },
    })
  }

  const setTextureOpacity = (opacity: number) => {
    if (!pageTexture) return
    patch({
      ...branding,
      page_texture: { ...pageTexture, opacity },
    })
  }

  const setMetaIcon = (url: string) => {
    const trimmed = url.trim()
    if (!trimmed) {
      patch({ ...branding, meta_icon: null })
      return
    }
    patch({ ...branding, meta_icon: { url: trimmed } })
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div>
        <Typography.Text strong>页面背景纹理</Typography.Text>
        <Typography.Paragraph type="secondary" style={{ margin: '4px 0 10px', fontSize: 12 }}>
          平铺暗纹（宣纸、叶片等）。可上传无缝小图（SVG/PNG，建议 ≤128px 边长）。
        </Typography.Paragraph>
        <Space wrap size={10}>
          <button
            type="button"
            onClick={() => selectPreset(null)}
            style={{
              padding: '8px 12px',
              borderRadius: 8,
              border: !selectedPreset && !customTextureUrl ? '2px solid #1677ff' : '1px solid #d9d9d9',
              background: '#fafafa',
              cursor: 'pointer',
            }}
          >
            无纹理
          </button>
          {PAGE_TEXTURE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              title={preset.description}
              onClick={() => selectPreset(preset.id)}
              style={{
                padding: '8px 12px',
                borderRadius: 8,
                border: selectedPreset === preset.id && !customTextureUrl ? '2px solid #1677ff' : '1px solid #d9d9d9',
                background: '#fff',
                cursor: 'pointer',
              }}
            >
              {preset.label}
            </button>
          ))}
        </Space>
        <div style={{ marginTop: 12 }}>
          <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
            或上传自定义纹理
          </Typography.Text>
          <ImageOssUploadField
            value={customTextureUrl ?? undefined}
            onChange={setCustomTexture}
            placeholder="上传无缝平铺纹理"
          />
        </div>
        {hasTexture ? (
          <div style={{ marginTop: 12, maxWidth: 320 }}>
            <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              纹理透明度：{Math.round(textureOpacity * 100)}%（建议 4%～10%，过高会影响阅读）
            </Typography.Text>
            <Slider
              min={2}
              max={15}
              step={1}
              value={Math.round(textureOpacity * 100)}
              onChange={(pct) => setTextureOpacity(pct / 100)}
              tooltip={{ formatter: (v) => `${v}%` }}
            />
          </div>
        ) : null}
      </div>

      <div>
        <Typography.Text strong>课程个性图标</Typography.Text>
        <Typography.Paragraph type="secondary" style={{ margin: '4px 0 10px', fontSize: 12 }}>
          替换 Hero「课节数」前图标，并显示在底部「继续学习」按钮。推荐从 iconfont 下载 SVG 后上传。
        </Typography.Paragraph>
        <ImageOssUploadField
          value={metaIconUrl}
          onChange={setMetaIcon}
          placeholder="上传 SVG/PNG 图标"
        />
      </div>
    </Space>
  )
}
