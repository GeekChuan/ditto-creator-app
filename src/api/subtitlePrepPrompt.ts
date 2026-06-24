import http from './http'

const API_V1 = '/api/v1'

export interface SubtitlePrepPromptOut {
  id: string
  creator_id: string
  prompt_key: string
  prompt_version: string
  phrases_system_prompt: string
  expressions_system_prompt: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type SubtitlePrepPromptCreate = Omit<
  SubtitlePrepPromptOut,
  'id' | 'creator_id' | 'created_at' | 'updated_at'
>

export type SubtitlePrepPromptUpdate = Partial<SubtitlePrepPromptCreate>

export interface SubtitlePrepDefaultPrompt {
  phrases_system_prompt: string
  expressions_system_prompt: string
}

export const subtitlePrepPromptApi = {
  getDefaultSystemPrompt: (): Promise<SubtitlePrepDefaultPrompt> =>
    http.get(`${API_V1}/subtitle-prep-prompts/default-system-prompt`),
  list: (): Promise<SubtitlePrepPromptOut[]> =>
    http.get(`${API_V1}/subtitle-prep-prompts`),
  create: (body: SubtitlePrepPromptCreate): Promise<SubtitlePrepPromptOut> =>
    http.post(`${API_V1}/subtitle-prep-prompts`, body),
  update: (promptId: string, body: SubtitlePrepPromptUpdate): Promise<SubtitlePrepPromptOut> =>
    http.put(`${API_V1}/subtitle-prep-prompts/${promptId}`, body),
  activate: (promptId: string): Promise<SubtitlePrepPromptOut> =>
    http.post(`${API_V1}/subtitle-prep-prompts/${promptId}/activate`),
}
