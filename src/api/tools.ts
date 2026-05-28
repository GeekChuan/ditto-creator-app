import http from './http'

export type StrategyLevel = 'rule_based' | 'llm_workflow' | 'agentic'
export type ToolStatus = 'available' | 'not_implemented'
export type RunStatus = 'ok' | 'not_implemented' | 'error'

export interface ToolMeta {
  tool_id: string
  name: string
  category: string
  description: string
  tags: string[]
  available_strategies: StrategyLevel[]
  status: ToolStatus
}

export interface ToolSchemaResponse {
  tool_id: string
  input_schema: Record<string, unknown>
  output_schema: Record<string, unknown>
}

export interface ToolRunRequest {
  payload: Record<string, unknown>
  strategy?: StrategyLevel | null
}

export interface ToolRunResponse {
  tool_id: string
  strategy_used: StrategyLevel | null
  status: RunStatus
  result: Record<string, unknown> | null
  error: string | null
}

export type LexiconDataset = 'cefr' | 'cet' | 'coca' | 'awl'

export interface WordLookupPayload {
  word: string
  pos_unified?: string
  datasets?: LexiconDataset[]
}

export interface WordLookupEntry {
  headword?: string
  pos?: string
  pos_unified?: string
  level_label?: string
  rank_total?: number
  rank_spoken?: number
  rank_fiction?: number
  rank_magazine?: number
  rank_newspaper?: number
  rank_academic?: number
  [key: string]: unknown
}

export interface WordLookupResult {
  word: string
  normalized_word: string
  hits_by_dataset: Array<{ dataset: LexiconDataset; entries: WordLookupEntry[] }>
  dataset_summary: Record<string, number>
  not_found: boolean
}

export const toolsApi = {
  getToolList: (): Promise<ToolMeta[]> =>
    http.get('/tools'),

  getToolSchema: (toolId: string): Promise<ToolSchemaResponse> =>
    http.get(`/tools/${toolId}/schema`),

  runTool: (toolId: string, body: ToolRunRequest): Promise<ToolRunResponse> =>
    http.post(`/tools/${toolId}/run`, body, { timeout: 180_000 }),
}
