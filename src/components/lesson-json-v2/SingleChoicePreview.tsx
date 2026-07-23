import { CheckCircleFilled } from '@ant-design/icons'
import { Typography } from 'antd'
import type { SingleChoiceComponent } from '../../types/atbReactionV2'
import { DEFAULT_SINGLE_CHOICE_TITLE } from '../../types/atbReactionV2'

const { Text } = Typography

const BRAND = '#6aba84'
const BRAND_RGB = '106, 186, 132'

/**
 * 学员端单选题卡片的静态预览。
 * 样式对齐 ditto-mobile-app 的 SingleChoicePanel + atb-v2-lecture.css，
 * 正确选项按「答对」态高亮，方便一眼核对 correct_option_index。
 */
export default function SingleChoicePreview({ component }: { component: SingleChoiceComponent }) {
  const options = component.options ?? []
  const correctIndex = component.correct_option_index

  return (
    <div style={{ width: 340, flexShrink: 0 }}>
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
        学员端预览（实时）· 绿色为正确答案
      </Text>
      <div
        style={{
          padding: '14px 14px 12px',
          borderRadius: 16,
          background: '#fff',
          border: '1px solid rgba(15, 23, 42, 0.06)',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06), 0 1px 4px rgba(15, 23, 42, 0.04)',
        }}
      >
        <div style={{ marginBottom: 14 }}>
          <span
            style={{
              display: 'inline-block',
              marginBottom: 8,
              padding: '3px 10px',
              borderRadius: 999,
              background: `rgba(${BRAND_RGB}, 0.12)`,
              color: BRAND,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.04em',
            }}
          >
            小练习
          </span>
          <p
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              lineHeight: 1.45,
              color: '#0f172a',
            }}
          >
            {component.title?.trim() || DEFAULT_SINGLE_CHOICE_TITLE}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {options.length === 0 ? (
            <Text type="secondary" style={{ fontSize: 12 }}>
              （暂无选项，请在左侧添加）
            </Text>
          ) : (
            options.map((option, index) => {
              const isCorrect = index === correctIndex
              return (
                <div
                  key={`${index}-${option}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    minHeight: 52,
                    padding: '12px 14px',
                    borderRadius: 14,
                    border: isCorrect
                      ? `1.5px solid rgba(${BRAND_RGB}, 0.55)`
                      : '1.5px solid rgba(15, 23, 42, 0.08)',
                    background: isCorrect ? `rgba(${BRAND_RGB}, 0.1)` : '#fafbfc',
                    boxShadow: isCorrect
                      ? `0 4px 14px rgba(${BRAND_RGB}, 0.16)`
                      : undefined,
                    boxSizing: 'border-box',
                  }}
                >
                  <span
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      width: 28,
                      height: 28,
                      borderRadius: 999,
                      background: isCorrect ? BRAND : '#fff',
                      border: isCorrect
                        ? '1.5px solid transparent'
                        : `1.5px solid rgba(${BRAND_RGB}, 0.35)`,
                      color: isCorrect ? '#fff' : BRAND,
                      fontSize: 13,
                      fontWeight: 700,
                      boxSizing: 'border-box',
                    }}
                  >
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: 15,
                      fontWeight: 500,
                      lineHeight: 1.45,
                      color: '#1e293b',
                    }}
                  >
                    {option.trim() || `（选项 ${String.fromCharCode(65 + index)} 为空）`}
                  </span>
                  {isCorrect ? (
                    <CheckCircleFilled style={{ flexShrink: 0, fontSize: 22, color: BRAND }} />
                  ) : null}
                </div>
              )
            })
          )}
        </div>
      </div>

      {component.review_video ? (
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 6 }}>
          已启用回看视频：学员端会在题目旁显示「回看视频」半胶囊。
        </Text>
      ) : null}
    </div>
  )
}
