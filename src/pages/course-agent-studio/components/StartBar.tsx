import { ThunderboltFilled } from '@ant-design/icons'
import { Tooltip } from 'antd'

interface Props {
  canStart: boolean
  onStart: () => void
}

export default function StartBar({ canStart, onStart }: Props) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 2 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 13,
            color: '#6b7280',
            border: '1.5px solid rgba(0,0,0,0.1)',
            borderRadius: 100,
            padding: '4px 12px',
            cursor: 'default',
          }}
        >
          <span style={{ fontSize: 14 }}>+</span>
          <span style={{ fontWeight: 500 }}>Standard</span>
          <span style={{ fontSize: 10 }}>▾</span>
        </span>
        <Tooltip title="语音输入（演示模式）">
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: 50,
              border: '1.5px solid rgba(0,0,0,0.1)',
              cursor: 'default',
              color: '#9ca3af',
              fontSize: 14,
            }}
          >
            🎤
          </span>
        </Tooltip>
      </div>

      <button className="cas-cta-btn" disabled={!canStart} onClick={onStart}>
        <ThunderboltFilled style={{ fontSize: 14 }} />
        开始生产
      </button>
    </div>
  )
}
