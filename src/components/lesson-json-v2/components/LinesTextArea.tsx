import { Input } from 'antd'

interface Props {
  value: string[]
  onChange: (lines: string[]) => void
  rows?: number
  placeholder?: string
}

/** 「每行一条」编辑器：替代逐条 Input+删除按钮，回车即新增一条，失焦时清掉空行 */
export default function LinesTextArea({ value, onChange, rows = 4, placeholder }: Props) {
  return (
    <Input.TextArea
      rows={rows}
      value={value.join('\n')}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value.split('\n'))}
      onBlur={() => {
        const cleaned = value.map((l) => l.trim()).filter(Boolean)
        if (cleaned.length !== value.length || cleaned.some((l, i) => l !== value[i])) {
          onChange(cleaned)
        }
      }}
    />
  )
}
