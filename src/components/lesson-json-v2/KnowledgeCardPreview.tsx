import { Typography } from 'antd'
import type { KnowledgeCardComponent } from '../../types/atbReactionV2'

const { Text } = Typography

const BRAND = '#6aba84'
const HIGHLIGHT = '#2f8f57'

/**
 * 学员端知识卡片的所见即所得预览。
 * 样式对齐 ditto-mobile-app 的 KnowledgeCardView + atb-v2-lecture.css，
 * 高亮规则一致：title 含「=」时高亮等号左侧部分。
 */
export default function KnowledgeCardPreview({ card }: { card: KnowledgeCardComponent }) {
  const title = card.title?.trim() || '（标题）'
  const eqIndex = title.indexOf('=')
  const highlighted = eqIndex > 0 ? title.slice(0, eqIndex).trim() : title
  const rest = eqIndex > 0 ? title.slice(highlighted.length) : ''

  const collocations = (card.collocations ?? []).filter((c) => c.trim())

  return (
    <div style={{ width: 340, flexShrink: 0 }}>
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
        学员端预览（实时）
      </Text>
      <div
        style={{
          padding: 14,
          background: '#fafbfc',
          border: '1px solid #eef2f6',
          borderRadius: 14,
        }}
      >
        {card.tag?.trim() ? (
          <span
            style={{
              display: 'inline-block',
              marginBottom: 8,
              padding: '2px 10px',
              fontSize: 11,
              fontWeight: 600,
              color: BRAND,
              background: 'rgba(106, 186, 132, 0.15)',
              borderRadius: 999,
            }}
          >
            {card.tag}
          </span>
        ) : null}

        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3
              style={{
                margin: '0 0 6px',
                fontSize: 18,
                fontWeight: 700,
                color: BRAND,
                fontFamily: "'Comic Sans MS', 'Chalkboard SE', cursive, sans-serif",
              }}
            >
              {'⭐ '}
              <span
                style={{
                  color: HIGHLIGHT,
                  fontWeight: 700,
                  textDecoration: 'underline',
                  textDecorationColor: 'rgba(47, 143, 87, 0.72)',
                  textDecorationThickness: 2,
                  textUnderlineOffset: 3,
                }}
              >
                {highlighted}
              </span>
              {rest}
            </h3>
            {card.content?.trim() ? (
              <p style={{ margin: '0 0 8px', fontSize: 13, color: '#64748b' }}>{card.content}</p>
            ) : null}
            {collocations.length ? (
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6, color: '#334155' }}>
                {collocations.map((item, i) => (
                  <li key={`${item}-${i}`}>{item}</li>
                ))}
              </ul>
            ) : null}
          </div>

          {card.illustration_url?.trim() ? (
            <img
              src={card.illustration_url}
              alt=""
              style={{ width: 72, height: 72, objectFit: 'contain', flexShrink: 0 }}
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
