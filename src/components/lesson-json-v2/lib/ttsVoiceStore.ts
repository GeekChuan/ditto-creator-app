import { create } from 'zustand'

/** Minimax 音色 ID 区分大小写 */
export const TTS_VOICE_PRESETS = [
  'DittoEva01',
  'DittoEva03',
  'DittoJackson02',
  'ZxueliLLS',
] as const

export const DEFAULT_TTS_VOICE_ID = 'ZxueliLLS'

const STORAGE_KEY = 'atb_v2_preferred_tts_voice'

function loadPreferredVoiceId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY)?.trim() || DEFAULT_TTS_VOICE_ID
  } catch {
    return DEFAULT_TTS_VOICE_ID
  }
}

interface TtsVoiceState {
  /** 全局 TTS 音色偏好：所有表单共用，选一次全局生效并持久化 */
  voiceId: string
  setVoiceId: (voiceId: string) => void
}

export const useTtsVoiceStore = create<TtsVoiceState>((set) => ({
  voiceId: loadPreferredVoiceId(),
  setVoiceId: (voiceId) => {
    try {
      localStorage.setItem(STORAGE_KEY, voiceId)
    } catch {
      // 忽略配额错误
    }
    set({ voiceId })
  },
}))
