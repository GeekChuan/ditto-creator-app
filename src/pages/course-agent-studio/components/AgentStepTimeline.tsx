import { CheckOutlined } from '@ant-design/icons'
import type { PipelineStep, StepStatus } from '../types'

interface Props {
  steps: PipelineStep[]
  statuses: StepStatus[]
}

export default function AgentStepTimeline({ steps, statuses }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {steps.map((step, i) => {
        const status = statuses[i] ?? 'pending'
        return (
          <div key={step.id} className="cas-step-row" style={{ color: status === 'done' ? '#22c55e' : status === 'running' ? '#6366f1' : '#9ca3af' }}>
            <div className={`cas-step-dot ${status}`}>
              {status === 'done' && <CheckOutlined style={{ fontSize: 9, color: '#fff' }} />}
              {status === 'pending' && null}
            </div>
            {/* connector line */}
            <div
              style={{
                fontSize: 13,
                fontWeight: status === 'running' ? 600 : 400,
                transition: 'color 0.3s',
              }}
            >
              {step.label}
            </div>
            {status === 'running' && (
              <span style={{ marginLeft: 'auto', fontSize: 11, color: '#a78bfa', fontStyle: 'italic' }}>
                进行中…
              </span>
            )}
            {status === 'done' && (
              <span style={{ marginLeft: 'auto', fontSize: 11, color: '#86efac' }}>完成</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
