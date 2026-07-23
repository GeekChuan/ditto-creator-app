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
const FEEDBACK_STORAGE_KEY = 'atb_v2_preferred_feedback_tts_voice'

function loadStoredVoiceId(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key)?.trim() || fallback
  } catch {
    return fallback
  }
}

interface TtsVoiceState {
  /** 全局 TTS 音色偏好：所有表单共用，选一次全局生效并持久化 */
  voiceId: string
  setVoiceId: (voiceId: string) => void
  /** 跟读肯定/鼓励语音的独立音色偏好（可与讲课主音色不同），默认跟随主音色 */
  feedbackVoiceId: string
  setFeedbackVoiceId: (voiceId: string) => void
}

export const useTtsVoiceStore = create<TtsVoiceState>((set) => ({
  voiceId: loadStoredVoiceId(STORAGE_KEY, DEFAULT_TTS_VOICE_ID),
  setVoiceId: (voiceId) => {
    try {
      localStorage.setItem(STORAGE_KEY, voiceId)
    } catch {
      // 忽略配额错误
    }
    set({ voiceId })
  },
  feedbackVoiceId: loadStoredVoiceId(
    FEEDBACK_STORAGE_KEY,
    loadStoredVoiceId(STORAGE_KEY, DEFAULT_TTS_VOICE_ID),
  ),
  setFeedbackVoiceId: (voiceId) => {
    try {
      localStorage.setItem(FEEDBACK_STORAGE_KEY, voiceId)
    } catch {
      // 忽略配额错误
    }
    set({ feedbackVoiceId: voiceId })
  },
}))
