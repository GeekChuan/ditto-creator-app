import { AudioOutlined, SoundOutlined } from '@ant-design/icons'
import { Typography } from 'antd'
import type { FollowReadingComponent } from '../../types/atbReactionV2'
import {
  DEFAULT_FOLLOW_READING_INSTRUCTION_HINT,
  DEFAULT_FOLLOW_READING_INSTRUCTION_PRIMARY,
} from '../../types/atbReactionV2'

const { Text } = Typography

const BRAND = '#6aba84'
const BRAND_RGB = '106, 186, 132'

/**
 * 学员端跟读练习的静态预览。
 * 样式对齐 ditto-mobile-app 的 FollowReadingPanel + atb-v2-lecture.css。
 */
export default function FollowReadingPreview({
  component,
}: {
  component: FollowReadingComponent
}) {
  const instruction =
    component.instruction_primary?.trim() || DEFAULT_FOLLOW_READING_INSTRUCTION_PRIMARY
  const hint = component.instruction_hint?.trim() || DEFAULT_FOLLOW_READING_INSTRUCTION_HINT
  const hasReference = Boolean(component.reference_audio?.trim())
  const feedbackReady = (component.positive_feedback_audios ?? []).filter(
    (f) => f.text_en.trim() && f.audio_url.trim(),
  ).length
  const feedbackTotal = (component.positive_feedback_audios ?? []).length

  return (
    <div style={{ width: 340, flexShrink: 0 }}>
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
        学员端预览（实时）
      </Text>
      <div
        style={{
          padding: 14,
          borderRadius: 14,
          background: 'linear-gradient(180deg, #f2f9f4 0%, #eef4f0 100%)',
          border: '1px solid #eef2f6',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{instruction}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{hint}</div>
        </div>

        <div
          style={{
            padding: '14px 16px',
            borderRadius: 14,
            background: '#fff',
            border: '1px solid rgba(15, 23, 42, 0.06)',
            boxShadow: '0 1px 4px rgba(15, 23, 42, 0.04)',
          }}
        >
          <p
            style={{
              margin: '0 0 6px',
              fontSize: 16,
              fontWeight: 600,
              lineHeight: 1.5,
              color: '#0f172a',
            }}
          >
            {component.text_en.trim() || '（跟读句子 text_en）'}
          </p>
          {component.text_zh?.trim() ? (
            <p style={{ margin: '0 0 12px', fontSize: 13, lineHeight: 1.45, color: '#64748b' }}>
              {component.text_zh}
            </p>
          ) : null}

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 12px',
              border: `1px solid rgba(${BRAND_RGB}, 0.35)`,
              borderRadius: 999,
              background: `rgba(${BRAND_RGB}, 0.08)`,
              color: BRAND,
              fontSize: 13,
              fontWeight: 600,
              opacity: hasReference ? 1 : 0.45,
            }}
          >
            <SoundOutlined />
            {hasReference ? '播放原音' : '播放原音（未配置）'}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            minHeight: 48,
            padding: '12px 16px',
            borderRadius: 14,
            background: BRAND,
            color: '#fff',
            fontSize: 15,
            fontWeight: 600,
            boxShadow: `0 4px 14px rgba(${BRAND_RGB}, 0.35)`,
          }}
        >
          <AudioOutlined />
          开始跟读
        </div>
      </div>

      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
        高分反馈语音 {feedbackReady} / {feedbackTotal} 条就绪，学员读得好时随机播放一条。
      </Text>
    </div>
  )
}
