import { Typography } from 'antd'
import type { AtbSrcAsset, TeacherAvatarComponent } from '../../types/atbReactionV2'
import { useSignedMediaUrl } from '../../hooks/useSignedMediaUrl'

const { Text } = Typography

const BRAND = '#6aba84'
/** 学员端讲解页的声浪条高度节奏（静态定格） */
const WAVE_HEIGHTS = [8, 14, 10, 13, 8]

/**
 * 学员端老师头像的静态预览。
 * 对齐 ditto-mobile-app 的 TeacherPresence：72px 圆形头像 + 白描边 + 品牌色声浪。
 * 私有 OSS 图片走签名 URL。
 */
export default function TeacherAvatarPreview({
  component,
  src,
}: {
  component: TeacherAvatarComponent
  src: AtbSrcAsset[]
}) {
  const asset = src.find((s) => s.id === component.source_id) ?? null
  const signedUrl = useSignedMediaUrl(asset?.url)

  let status: string | null = null
  if (!component.source_id) status = '未选择头像资源'
  else if (!asset) status = 'source_id 在 src 中不存在'
  else if (!signedUrl) status = '加载中…'

  return (
    <div style={{ width: 220, flexShrink: 0 }}>
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
        学员端预览（实时）
      </Text>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          padding: '18px 14px',
          borderRadius: 14,
          background: 'linear-gradient(180deg, #f2f9f4 0%, #e8f3ec 100%)',
          border: '1px solid #eef2f6',
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            overflow: 'hidden',
            border: '2px solid rgba(255, 255, 255, 0.85)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxSizing: 'border-box',
          }}
        >
          {signedUrl ? (
            <img
              src={signedUrl}
              alt="老师头像"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span style={{ fontSize: 24 }} aria-hidden>
              🧑‍🏫
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, minHeight: 16 }} aria-hidden>
          {WAVE_HEIGHTS.map((h, i) => (
            <span
              key={i}
              style={{
                width: 4,
                height: h,
                borderRadius: 999,
                background: BRAND,
              }}
            />
          ))}
        </div>

        <Text type="secondary" style={{ fontSize: 11, textAlign: 'center' }}>
          {status ?? asset?.description?.trim() ?? '播报时头像下方会出现声浪动画'}
        </Text>
      </div>
    </div>
  )
}
