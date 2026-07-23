/** 与学员端 MarkdownHintText 同规则的安全子集 Markdown 渲染（`code`、**加粗**、*斜体*） */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function inlineFormat(text: string): string {
  let out = escapeHtml(text)
  out = out.replace(/`([^`]+)`/g, '<code style="background:rgba(15,23,42,0.06);padding:0 4px;border-radius:4px;font-size:0.92em">$1</code>')
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  return out
}

interface Props {
  markdown: string
  fontSize?: number
}

export default function MarkdownHintPreview({ markdown, fontSize = 13 }: Props) {
  const lines = markdown.split(/\r?\n/).filter((line) => line.length > 0)
  return (
    <div>
      {lines.map((line, index) => (
        <p
          key={index}
          style={{ margin: '2px 0', fontSize, lineHeight: 1.55, color: '#1e293b' }}
          dangerouslySetInnerHTML={{ __html: inlineFormat(line) }}
        />
      ))}
    </div>
  )
}
