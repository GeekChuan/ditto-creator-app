import { Select } from 'antd'
import type { AtbSrcAsset } from '../../types/atbReactionV2'

interface Props {
  src: AtbSrcAsset[]
  value?: string
  onChange?: (id: string) => void
  filterType?: AtbSrcAsset['type'] | AtbSrcAsset['type'][]
  placeholder?: string
}

export default function SrcIdSelect({
  src,
  value,
  onChange,
  filterType,
  placeholder = '选择 src 资源',
}: Props) {
  const types = filterType ? (Array.isArray(filterType) ? filterType : [filterType]) : null
  const options = src
    .filter((s) => !types || types.includes(s.type))
    .map((s) => ({
      value: s.id,
      label: `[${s.type}] ${s.description?.trim() || s.id.slice(0, 8)}`,
    }))

  return (
    <Select
      showSearch
      allowClear
      style={{ width: '100%' }}
      placeholder={placeholder}
      value={value || undefined}
      onChange={(v) => onChange?.(v ?? '')}
      options={options}
      optionFilterProp="label"
    />
  )
}
