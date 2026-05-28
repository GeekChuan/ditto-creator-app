import { Button, Progress, Typography } from 'antd'
import { CloseOutlined, RocketOutlined } from '@ant-design/icons'
import AgentStepTimeline from './AgentStepTimeline'
import AgentLogFeed from './AgentLogFeed'
import { PIPELINE_STEPS } from '../constants'
import type { StepStatus } from '../types'

const { Text } = Typography

interface Props {
  statuses: StepStatus[]
  currentStep: number
  logLines: string[]
  totalProgress: number
  onCancel: () => void
}

export default function AgentWorkbench({ statuses, currentStep, logLines, totalProgress, onCancel }: Props) {
  return (
    <div className="cas-workbench" style={{ padding: '20px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="cas-status-dot" />
          <RocketOutlined style={{ fontSize: 16, color: '#6366f1' }} />
          <Text strong style={{ fontSize: 15, color: '#1e293b' }}>
            Course Render Agent
          </Text>
          <span
            style={{
              background: 'rgba(99,102,241,0.1)',
              color: '#4f46e5',
              fontSize: 11,
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: 100,
            }}
          >
            工作中
          </span>
        </div>
        <Button
          size="small"
          type="text"
          icon={<CloseOutlined />}
          onClick={onCancel}
          style={{ color: '#9ca3af' }}
        >
          取消
        </Button>
      </div>

      {/* Progress */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            总进度 {currentStep + 1}/{PIPELINE_STEPS.length}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {totalProgress}%
          </Text>
        </div>
        <Progress
          percent={totalProgress}
          showInfo={false}
          strokeColor={{ '0%': '#6366f1', '100%': '#a78bfa' }}
          size={['100%', 4]}
          style={{ marginBottom: 0 }}
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20 }}>
        {/* Left: Step Timeline */}
        <div>
          <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            Pipeline Steps
          </Text>
          <AgentStepTimeline steps={PIPELINE_STEPS} statuses={statuses} />
        </div>

        {/* Right: Log Feed */}
        <div>
          <Text type="secondary" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            Agent Log
          </Text>
          <AgentLogFeed lines={logLines} />
        </div>
      </div>
    </div>
  )
}
