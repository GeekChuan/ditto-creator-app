import http from './http'

export interface ImageCreativeSessionOut {
  id: string
  creator_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface ImageCreativeMessageOut {
  id: string
  session_id: string
  role: string
  content: string
  created_at: string
}

export interface ImageCreativeChatResponse {
  user_message: ImageCreativeMessageOut
  assistant_message: ImageCreativeMessageOut
}

export interface ImageCreativeGenerationOut {
  id: string
  creator_id: string
  session_id: string | null
  user_id: string | null
  prompt: string
  model: string
  mode: string
  size: string | null
  status: string
  reference_generation_id: string | null
  reference_cos_key: string | null
  reference_image_access_url: string | null
  image_cos_key: string | null
  image_url: string | null
  image_access_url: string | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export function extractCopyablePrompt(assistantContent: string): string {
  const marker = '【可复制提示词】'
  const idx = assistantContent.indexOf(marker)
  if (idx === -1) return assistantContent.trim()
  return assistantContent.slice(idx + marker.length).trim()
}

export const imageCreativeApi = {
  listSessions: (): Promise<ImageCreativeSessionOut[]> => http.get('/image-creative/sessions'),
  createSession: (title?: string): Promise<ImageCreativeSessionOut> =>
    http.post('/image-creative/sessions', { title: title || '新对话' }),
  listMessages: (sessionId: string): Promise<ImageCreativeMessageOut[]> =>
    http.get(`/image-creative/sessions/${sessionId}/messages`),
  chat: (sessionId: string, content: string): Promise<ImageCreativeChatResponse> =>
    http.post(`/image-creative/sessions/${sessionId}/chat`, { content }, { timeout: 180_000 }),
  listGenerations: (): Promise<ImageCreativeGenerationOut[]> => http.get('/image-creative/generations'),
  createGeneration: (body: {
    prompt: string
    session_id?: string
    size?: string
    mode?: 'generate' | 'edit'
    reference_generation_id?: string
  }): Promise<ImageCreativeGenerationOut> =>
    http.post('/image-creative/generations', body, { timeout: 300_000 }),
}
