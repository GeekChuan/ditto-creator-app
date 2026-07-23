import type { NodeNote } from '../pages/lesson-json-design-v2/store'

function formatTime(ts: number): string {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function notesToMarkdown(notes: NodeNote[], title: string): string {
  const lines: string[] = [`# ${title}`, '', `共 ${notes.length} 条，待处理 ${notes.filter((n) => !n.done).length} 条`, '']
  lines.push('| 状态 | 位置 | 标签 | 内容 | 记录时间 |')
  lines.push('| --- | --- | --- | --- | --- |')
  for (const n of notes) {
    const text = n.text.replace(/\|/g, '\\|').replace(/\n/g, ' ')
    lines.push(
      `| ${n.done ? '✅ 已解决' : '⬜ 待处理'} | ${n.locationLabel} | ${n.tag ?? '-'} | ${text} | ${formatTime(n.createdAt)} |`,
    )
  }
  lines.push('')
  return lines.join('\n')
}

export function notesToCsv(notes: NodeNote[]): string {
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`
  const rows = [['状态', '位置', '标签', '内容', '记录时间'].map(escape).join(',')]
  for (const n of notes) {
    rows.push(
      [n.done ? '已解决' : '待处理', n.locationLabel, n.tag ?? '', n.text, formatTime(n.createdAt)]
        .map(escape)
        .join(','),
    )
  }
  // BOM 让 Excel 正确识别 UTF-8 中文
  return `\ufeff${rows.join('\n')}`
}

export function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
