import { STYLE_OPTIONS, FORMAT_OPTIONS, LANGUAGE_OPTIONS } from '../constants'
import type { StudioOptions } from '../types'

interface Props {
  options: StudioOptions
  onChange: (patch: Partial<StudioOptions>) => void
}

function ChipGroup<K extends keyof StudioOptions>({
  label,
  items,
  value,
  onSelect,
}: {
  label: string
  items: readonly string[]
  value: string
  onSelect: (v: string) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500, minWidth: 24 }}>{label}</span>
      {items.map((item) => (
        <span
          key={item}
          className={`cas-chip${value === item ? ' active' : ''}`}
          onClick={() => onSelect(item)}
        >
          {item}
        </span>
      ))}
    </div>
  )
}

export default function OptionsBar({ options, onChange }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <ChipGroup
        label="风格"
        items={STYLE_OPTIONS}
        value={options.style}
        onSelect={(v) => onChange({ style: v as StudioOptions['style'] })}
      />
      <ChipGroup
        label="形式"
        items={FORMAT_OPTIONS}
        value={options.format}
        onSelect={(v) => onChange({ format: v as StudioOptions['format'] })}
      />
      <ChipGroup
        label="语言"
        items={LANGUAGE_OPTIONS}
        value={options.language}
        onSelect={(v) => onChange({ language: v as StudioOptions['language'] })}
      />
    </div>
  )
}
