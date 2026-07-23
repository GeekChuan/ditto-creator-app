import { useState } from 'react'
import { AudioOutlined } from '@ant-design/icons'
import { Typography } from 'antd'
import type { GuidedSpeakingComponent } from '../../types/atbReactionV2'
import {
  DEFAULT_GUIDED_SPEAKING_INSTRUCTION_HINT,
  DEFAULT_GUIDED_SPEAKING_INSTRUCTION_PRIMARY,
  DEFAULT_GUIDED_SPEAKING_MAX_ROUNDS,
} from '../../types/atbReactionV2'
import MarkdownHintPreview from './MarkdownHintPreview'

const { Text } = Typography

const BRAND = '#6aba84'
const BRAND_RGB = '106, 186, 132'

/** 学员端引导口语的静态预览：任务 + 语料提示/表达目标双 tab + 录音按钮 */
export default function GuidedSpeakingPreview({ component }: { component: GuidedSpeakingComponent }) {
  const [tab, setTab] = useState<'hints' | 'goals'>('hints')
  const goals = (component.expression_goals ?? []).filter((g) => g.trim())
  const maxRounds = component.max_rounds ?? DEFAULT_GUIDED_SPEAKING_MAX_ROUNDS

  return (
    <div style={{ width: 340, flexShrink: 0 }}>
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
        学员端预览（实时）· 可点 tab 切换
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
          引导口语
        </span>

        <p style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, lineHeight: 1.5, color: '#0f172a' }}>
          {component.task_description?.trim() || '（task_description 为空）'}
        </p>

        {/* 提示板：语料提示 / 表达目标 */}
        <div
          style={{
            borderRadius: 12,
            border: '1px solid rgba(15, 23, 42, 0.08)',
            overflow: 'hidden',
          }}
        >
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(15, 23, 42, 0.06)' }}>
            {(
              [
                { id: 'hints', label: '语料提示' },
                { id: 'goals', label: '表达目标' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 600,
                  background: tab === t.id ? `rgba(${BRAND_RGB}, 0.1)` : '#fafbfc',
                  color: tab === t.id ? BRAND : '#64748b',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div style={{ padding: '10px 12px', minHeight: 72 }}>
            {tab === 'hints' ? (
              component.initial_hint_markdown?.trim() ? (
                <MarkdownHintPreview markdown={component.initial_hint_markdown} />
              ) : (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  （initial_hint_markdown 为空，学员端显示「老师引导后会显示重点词与句型」）
                </Text>
              )
            ) : goals.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {goals.map((goal, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <span
                      style={{
                        flexShrink: 0,
                        width: 16,
                        height: 16,
                        marginTop: 1,
                        borderRadius: 5,
                        border: `1.5px solid rgba(${BRAND_RGB}, 0.6)`,
                        boxSizing: 'border-box',
                      }}
                    />
                    <span style={{ fontSize: 13, lineHeight: 1.45, color: '#1e293b' }}>{goal}</span>
                  </div>
                ))}
              </div>
            ) : (
              <Text type="warning" style={{ fontSize: 12 }}>
                （表达目标为空，至少需要 1 条）
              </Text>
            )}
          </div>
        </div>

        {/* 作答提示 + 录音按钮 */}
        <div style={{ marginTop: 14, textAlign: 'center' }}>
          <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
            {component.instruction_primary?.trim() || DEFAULT_GUIDED_SPEAKING_INSTRUCTION_PRIMARY}
          </p>
          <p style={{ margin: '0 0 10px', fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
            {component.instruction_hint?.trim() || DEFAULT_GUIDED_SPEAKING_INSTRUCTION_HINT}
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
        目标全部达成或到 {maxRounds} 轮上限后结束；勾选状态由 AI 逐轮判定。
      </Text>
    </div>
  )
}
