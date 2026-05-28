export type StudioPhase = 'idle' | 'running' | 'done'

export interface StudioOptions {
  style: '专业' | '创意' | '轻松'
  format: '互动课' | '讲解课' | '测验驱动'
  language: '全英文' | '中英混合' | '全中文'
}

export interface PipelineStep {
  id: string
  label: string
  durationMs: number
  logTemplates: string[]
}

export type StepStatus = 'pending' | 'running' | 'done'
