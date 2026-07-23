import { AudioOutlined } from '@ant-design/icons'
import { Typography } from 'antd'
import type { VoiceQaSimpleComponent } from '../../types/atbReactionV2'
import {
  DEFAULT_VOICE_QA_INSTRUCTION_HINT,
  DEFAULT_VOICE_QA_INSTRUCTION_PRIMARY,
  DEFAULT_VOICE_QA_MAX_ATTEMPTS,
} from '../../types/atbReactionV2'
import MarkdownHintPreview from './MarkdownHintPreview'

const { Text } = Typography

const BRAND = '#6aba84'
const BRAND_RGB = '106, 186, 132'

/** 学员端语音问答的静态预览：问题 + 白板提示 + 录音按钮 */
export default function VoiceQaSimplePreview({ component }: { component: VoiceQaSimpleComponent }) {
  const maxAttempts = component.max_attempts ?? DEFAULT_VOICE_QA_MAX_ATTEMPTS

  return (
    <div style={{ width: 340, flexShrink: 0 }}>
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
        学员端预览（实时）
      </Text>
      <div
        style={{
          padding: '14px 14px 16px',
          borderRadius: 16,
          background: '#fff',
          border: '1px solid rgba(15, 23, 42, 0.06)',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06), 0 1px 4px rgba(15, 23, 42, 0.04)',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            marginBottom: 10,
            padding: '3px 10px',
            borderRadius: 999,
            background: `rgba(${BRAND_RGB}, 0.12)`,
            color: BRAND,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.04em',
          }}
        >
          语音问答
        </span>

        {/* 问题（老师口播内容，预览用于核对） */}
        <p style={{ margin: '0 0 2px', fontSize: 15, fontWeight: 600, lineHeight: 1.45, color: '#0f172a' }}>
          {component.question_en?.trim() || '（question_en 为空）'}
        </p>
        {component.question_zh?.trim() ? (
          <p style={{ margin: '0 0 10px', fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
            {component.question_zh}
          </p>
        ) : (
          <div style={{ height: 8 }} />
        )}

        {/* 白板提示 */}
        <div
          style={{
            padding: '10px 12px',
            borderRadius: 12,
            background: `rgba(${BRAND_RGB}, 0.07)`,
            border: `1px solid rgba(${BRAND_RGB}, 0.25)`,
          }}
        >
          <p
            style={{
              margin: '0 0 4px',
              fontSize: 11,
              fontWeight: 700,
              color: BRAND,
              letterSpacing: '0.05em',
            }}
          >
            提示
          </p>
          {component.hint_markdown?.trim() ? (
            <MarkdownHintPreview markdown={component.hint_markdown} />
          ) : (
            <Text type="secondary" style={{ fontSize: 12 }}>
              （hint_markdown 为空，学员端白板无内容）
            </Text>
          )}
        </div>

        {/* 作答提示 + 录音按钮 */}
        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
            {component.instruction_primary?.trim() || DEFAULT_VOICE_QA_INSTRUCTION_PRIMARY}
          </p>
          <p style={{ margin: '0 0 10px', fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
            {component.instruction_hint?.trim() || DEFAULT_VOICE_QA_INSTRUCTION_HINT}
          </p>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 26px',
              borderRadius: 999,
              background: BRAND,
              color: '#fff',
              fontSize: 14,
              fontWeight: 600,
              boxShadow: `0 6px 16px rgba(${BRAND_RGB}, 0.35)`,
            }}
          >
            <AudioOutlined />
            开始回答
          </div>
        </div>
      </div>
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
        最多作答 {maxAttempts} 轮；教学目标与判题要点仅供 AI 使用，学员不可见。
      </Text>
    </div>
  )
}
