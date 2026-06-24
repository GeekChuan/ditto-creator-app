import { getToken } from './authStorage'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export interface VoiceCloneResult {
  voice_id: string
  demo_audio_url: string | null
  demo_audio_duration: number | null
  input_sensitive_type: number | null
}

export interface VoiceCloneForm {
  voice_id: string
  preview_text?: string
  model?: string
  prompt_text?: string
  need_noise_reduction?: boolean
  need_volume_normalization?: boolean
  clone_audio: File
  prompt_audio?: File | null
}

function apiV1Path(path: string): string {
  try {
    const host = new URL(API_BASE_URL).hostname
    if (host === 'localhost' || host === '127.0.0.1') {
      return `/api/v1${path}`
    }
  } catch {
    if (API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1')) {
      return `/api/v1${path}`
    }
  }
  return path
}

export async function createVoiceClone(form: VoiceCloneForm): Promise<VoiceCloneResult> {
  const body = new FormData()
  body.append('clone_audio', form.clone_audio)
  body.append('voice_id', form.voice_id.trim())
  if (form.preview_text?.trim()) body.append('preview_text', form.preview_text.trim())
  if (form.model) body.append('model', form.model)
  if (form.prompt_audio) body.append('prompt_audio', form.prompt_audio)
  if (form.prompt_text?.trim()) body.append('prompt_text', form.prompt_text.trim())
  body.append('need_noise_reduction', String(Boolean(form.need_noise_reduction)))
  body.append('need_volume_normalization', String(Boolean(form.need_volume_normalization)))

  const token = getToken()
  const response = await fetch(`${API_BASE_URL}${apiV1Path('/voice-clone')}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body,
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const detail = typeof data?.detail === 'string'
      ? data.detail
      : Array.isArray(data?.detail)
        ? data.detail.map((item: { msg?: string }) => item.msg).filter(Boolean).join('；')
        : '语音克隆失败'
    throw new Error(detail || '语音克隆失败')
  }
  return data as VoiceCloneResult
}
