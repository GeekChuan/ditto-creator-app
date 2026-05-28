import http from './http'

export type AgentStatus = 'available' | 'not_implemented'
export type AgentRunStatus = 'ok' | 'not_implemented' | 'error'

export interface AgentMeta {
  agent_id: string
  name: string
  category: string
  description: string
  tags: string[]
  status: AgentStatus
}

export interface AgentRunRequest {
  payload: Record<string, unknown>
}

export interface AgentRunResponse {
  agent_id: string
  status: AgentRunStatus
  result: Record<string, unknown> | null
  error: string | null
}

export const agentsApi = {
  getAgentList: (): Promise<AgentMeta[]> =>
    http.get('/api/v1/agents'),

  runAgent: (agentId: string, body: AgentRunRequest): Promise<AgentRunResponse> =>
    http.post(`/api/v1/agents/${agentId}/run`, body, { timeout: 180_000 }),
}
