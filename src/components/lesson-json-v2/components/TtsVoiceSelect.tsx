import type { CSSProperties } from 'react'
import { AutoComplete } from 'antd'
import { TTS_VOICE_PRESETS } from '../lib/ttsVoiceStore'

interface Props {
  value?: string
  onChange?: (voiceId: string) => void
  placeholder?: string
  size?: 'small' | 'middle' | 'large'
  style?: CSSProperties
  allowClear?: boolean
  disabled?: boolean
}

/**
 * TTS 音色选择器：下拉选预设音色，也支持直接输入自定义 voice_id。
 * 避免每次手输导致大小写/拼写错误。
 */
export default function TtsVoiceSelect({
  value,
  onChange,
  placeholder = '选择或输入 voice_id',
  size = 'small',
  style,
  allowClear = false,
  disabled = false,
}: Props) {
  return (
    <AutoComplete
      value={value}
      onChange={(v) => onChange?.(v ?? '')}
      disabled={disabled}
      options={TTS_VOICE_PRESETS.map((id) => ({ value: id, label: id }))}
      placeholder={placeholder}
      size={size}
      style={{ width: 180, ...style }}
      allowClear={allowClear}
      filterOption={(input, option) =>
        (option?.value ?? '').toLowerCase().includes(input.toLowerCase())
      }
    />
  )
}
