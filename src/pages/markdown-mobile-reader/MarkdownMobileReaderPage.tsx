import { Fragment, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import './markdown-mobile-reader.css'

const STORAGE_KEY = 'ditto-markdown-mobile-reader-v1'

const SAMPLE_MARKDOWN = `# 怎样把一页内容讲清楚？

这是一个用来验证 **手机阅读宽度** 的 Markdown 页面。你可以直接修改左侧内容，右侧会实时更新。

> 好的移动阅读体验，不是把桌面页面缩小，而是重新控制信息密度、行长与滚动方式。

## 一页内容的基本结构

1. 用标题给出主题
2. 用一小段正文建立上下文
3. 用列表拆开步骤
4. 用图片、表格或代码承载证据

### Media 的适配测试

![一张横向课堂图片](https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80)

图片会始终收在正文宽度内，并保留原始比例。

### 表格的适配测试

| 布局 | 最适合的内容 | 手机端策略 | 风险 |
| --- | --- | --- | --- |
| title_content | 标题与解释 | 单列自然流 | 长文本过密 |
| title_media | 标题与图片 | 图片等比缩放 | 图片文字过小 |
| comparison | 两组内容对比 | 保留表格横向滚动 | 横向内容过宽 |

### 代码与长内容

行内代码如 \`viewport-fit=cover\` 不会破坏段落；代码块会独立横向滚动：

\`\`\`css
.reader { width: min(100%, 390px); padding-inline: max(20px, env(safe-area-inset-left)); }
\`\`\`

这是一条用于测试断行的长链接：[Ditto mobile reader layout experiment](https://example.com/course/creator/markdown/mobile-reader/viewport/very-long-path?source=ditto&mode=preview)。

---

最后一条原则：**正文自然换行，特殊内容局部滚动，媒体永远不撑破容器。**`

type ViewportMode = 'browser' | 'webview'
type MobilePane = 'editor' | 'preview'

const WIDTH_PRESETS = [320, 375, 390, 430]

function safeUrl(value: string, kind: 'link' | 'image') {
  const url = value.trim()
  if (/^(https?:\/\/|mailto:|\/|#)/i.test(url)) return url
  if (kind === 'image' && /^data:image\/(png|jpeg|gif|webp);base64,/i.test(url)) return url
  return '#'
}

function inlineMarkdown(source: string, keyPrefix = 'inline'): ReactNode[] {
  const tokenPattern = /(!\[[^\]]*\]\([^\s)]+(?:\s+"[^"]*")?\)|\[[^\]]+\]\([^\s)]+(?:\s+"[^"]*")?\)|`[^`\n]+`|\*\*[^*\n]+\*\*|~~[^~\n]+~~|\*[^*\n]+\*)/g
  const nodes: ReactNode[] = []
  let cursor = 0
  let match: RegExpExecArray | null
  let index = 0

  while ((match = tokenPattern.exec(source)) !== null) {
    if (match.index > cursor) {
      const plain = source.slice(cursor, match.index)
      plain.split('\n').forEach((part, lineIndex, lines) => {
        if (part) nodes.push(part)
        if (lineIndex < lines.length - 1) nodes.push(<br key={`${keyPrefix}-br-${index++}`} />)
      })
    }

    const token = match[0]
    const key = `${keyPrefix}-${index++}`
    if (token.startsWith('![')) {
      const imageMatch = token.match(/^!\[([^\]]*)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)$/)
      if (imageMatch) {
        nodes.push(
          <span className="md-image-frame" key={key}>
            <img src={safeUrl(imageMatch[2], 'image')} alt={imageMatch[1]} title={imageMatch[3]} loading="lazy" />
            {imageMatch[1] && <span className="md-image-caption">{imageMatch[1]}</span>}
          </span>,
        )
      }
    } else if (token.startsWith('[')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^\s)]+)(?:\s+"([^"]*)")?\)$/)
      if (linkMatch) {
        nodes.push(
          <a href={safeUrl(linkMatch[2], 'link')} title={linkMatch[3]} target="_blank" rel="noreferrer" key={key}>
            {inlineMarkdown(linkMatch[1], `${key}-label`)}
          </a>,
        )
      }
    } else if (token.startsWith('`')) {
      nodes.push(<code key={key}>{token.slice(1, -1)}</code>)
    } else if (token.startsWith('**')) {
      nodes.push(<strong key={key}>{inlineMarkdown(token.slice(2, -2), key)}</strong>)
    } else if (token.startsWith('~~')) {
      nodes.push(<del key={key}>{inlineMarkdown(token.slice(2, -2), key)}</del>)
    } else if (token.startsWith('*')) {
      nodes.push(<em key={key}>{inlineMarkdown(token.slice(1, -1), key)}</em>)
    }

    cursor = match.index + token.length
  }

  if (cursor < source.length) {
    const plain = source.slice(cursor)
    plain.split('\n').forEach((part, lineIndex, lines) => {
      if (part) nodes.push(part)
      if (lineIndex < lines.length - 1) nodes.push(<br key={`${keyPrefix}-tail-br-${lineIndex}`} />)
    })
  }

  return nodes
}

function tableCells(line: string) {
  return line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim())
}

function isTableDivider(line: string) {
  const cells = tableCells(line)
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell))
}

function isBlockStart(lines: string[], index: number) {
  const line = lines[index] ?? ''
  return /^\s*(```|#{1,4}\s|>|[-*+]\s|\d+[.)]\s|(?:-{3,}|\*{3,}|_{3,})\s*$)/.test(line)
    || (line.includes('|') && isTableDivider(lines[index + 1] ?? ''))
}

function renderMarkdown(source: string) {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  let blockIndex = 0

  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i += 1
      continue
    }

    if (/^\s*```/.test(line)) {
      const language = line.trim().slice(3).trim()
      const code: string[] = []
      i += 1
      while (i < lines.length && !/^\s*```/.test(lines[i])) {
        code.push(lines[i])
        i += 1
      }
      if (i < lines.length) i += 1
      blocks.push(
        <div className="md-code-shell" key={`block-${blockIndex++}`}>
          {language && <div className="md-code-language">{language}</div>}
          <pre><code>{code.join('\n')}</code></pre>
        </div>,
      )
      continue
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/)
    if (heading) {
      const level = heading[1].length
      const content = inlineMarkdown(heading[2], `heading-${blockIndex}`)
      const key = `block-${blockIndex++}`
      if (level === 1) blocks.push(<h1 key={key}>{content}</h1>)
      if (level === 2) blocks.push(<h2 key={key}>{content}</h2>)
      if (level === 3) blocks.push(<h3 key={key}>{content}</h3>)
      if (level === 4) blocks.push(<h4 key={key}>{content}</h4>)
      i += 1
      continue
    }

    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push(<hr key={`block-${blockIndex++}`} />)
      i += 1
      continue
    }

    if (/^\s*>/.test(line)) {
      const quote: string[] = []
      while (i < lines.length && /^\s*>/.test(lines[i])) {
        quote.push(lines[i].replace(/^\s*>\s?/, ''))
        i += 1
      }
      blocks.push(<blockquote key={`block-${blockIndex++}`}>{inlineMarkdown(quote.join('\n'), `quote-${blockIndex}`)}</blockquote>)
      continue
    }

    const listMatch = line.match(/^\s*([-*+]|\d+[.)])\s+(.+)$/)
    if (listMatch) {
      const ordered = /^\d/.test(listMatch[1])
      const items: string[] = []
      while (i < lines.length) {
        const itemMatch = lines[i].match(/^\s*([-*+]|\d+[.)])\s+(.+)$/)
        if (!itemMatch || /^\d/.test(itemMatch[1]) !== ordered) break
        items.push(itemMatch[2])
        i += 1
      }
      const ListTag = ordered ? 'ol' : 'ul'
      blocks.push(
        <ListTag key={`block-${blockIndex++}`}>
          {items.map((item, itemIndex) => <li key={itemIndex}>{inlineMarkdown(item, `list-${blockIndex}-${itemIndex}`)}</li>)}
        </ListTag>,
      )
      continue
    }

    if (line.includes('|') && isTableDivider(lines[i + 1] ?? '')) {
      const headers = tableCells(line)
      const rows: string[][] = []
      i += 2
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(tableCells(lines[i]))
        i += 1
      }
      blocks.push(
        <div className="md-table-scroll" key={`block-${blockIndex++}`}>
          <table>
            <thead><tr>{headers.map((cell, cellIndex) => <th key={cellIndex}>{inlineMarkdown(cell, `th-${blockIndex}-${cellIndex}`)}</th>)}</tr></thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex}>{headers.map((_, cellIndex) => <td key={cellIndex}>{inlineMarkdown(row[cellIndex] ?? '', `td-${blockIndex}-${rowIndex}-${cellIndex}`)}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      continue
    }

    const paragraph: string[] = [line]
    i += 1
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines, i)) {
      paragraph.push(lines[i])
      i += 1
    }
    blocks.push(<p key={`block-${blockIndex++}`}>{inlineMarkdown(paragraph.join('\n'), `paragraph-${blockIndex}`)}</p>)
  }

  return blocks
}

type ToolbarItem = {
  label: string
  before: string
  after?: string
  placeholder: string
  title: string
}

const TOOLBAR_ITEMS: ToolbarItem[] = [
  { label: 'H2', before: '## ', placeholder: '小标题', title: '二级标题' },
  { label: 'B', before: '**', after: '**', placeholder: '重点文字', title: '粗体' },
  { label: 'Link', before: '[', after: '](https://example.com)', placeholder: '链接文字', title: '链接' },
  { label: 'Image', before: '![', after: '](https://images.unsplash.com/photo-1522202176988-66273c2fd55f)', placeholder: '图片说明', title: '图片' },
  { label: 'Code', before: '\n```\n', after: '\n```\n', placeholder: 'code', title: '代码块' },
  { label: 'Table', before: '\n| A | B |\n| --- | --- |\n| ', after: ' | 内容 |\n', placeholder: '内容', title: '表格' },
]

export default function MarkdownMobileReaderPage() {
  const [markdown, setMarkdown] = useState(() => localStorage.getItem(STORAGE_KEY) ?? SAMPLE_MARKDOWN)
  const [viewportWidth, setViewportWidth] = useState(390)
  const [viewportMode, setViewportMode] = useState<ViewportMode>('browser')
  const [mobilePane, setMobilePane] = useState<MobilePane>('editor')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const rendered = useMemo(() => renderMarkdown(markdown), [markdown])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, markdown)
  }, [markdown])

  useEffect(() => {
    const previousTitle = document.title
    document.title = 'Markdown Mobile Reader · Ditto'
    return () => { document.title = previousTitle }
  }, [])

  const insertMarkdown = ({ before, after = '', placeholder }: ToolbarItem) => {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = markdown.slice(start, end) || placeholder
    const nextValue = `${markdown.slice(0, start)}${before}${selected}${after}${markdown.slice(end)}`
    const nextSelectionStart = start + before.length
    const nextSelectionEnd = nextSelectionStart + selected.length
    setMarkdown(nextValue)
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(nextSelectionStart, nextSelectionEnd)
    })
  }

  const contentHeight = viewportMode === 'browser' ? 594 : 708

  return (
    <main className="mobile-reader-page">
      <header className="mobile-reader-topbar">
        <div>
          <div className="mobile-reader-kicker">DITTO · LAYOUT LAB</div>
          <h1>Markdown Mobile Reader</h1>
        </div>
        <div className="live-status"><span />实时预览</div>
      </header>

      <nav className="mobile-pane-switch" aria-label="移动端面板切换">
        <button className={mobilePane === 'editor' ? 'active' : ''} onClick={() => setMobilePane('editor')}>编辑</button>
        <button className={mobilePane === 'preview' ? 'active' : ''} onClick={() => setMobilePane('preview')}>预览</button>
      </nav>

      <section className="mobile-reader-workspace" data-mobile-pane={mobilePane}>
        <section className="editor-panel">
          <div className="panel-heading">
            <div>
              <span className="panel-eyebrow">SOURCE</span>
              <h2>Markdown</h2>
            </div>
            <button className="text-action" onClick={() => setMarkdown(SAMPLE_MARKDOWN)}>恢复示例</button>
          </div>

          <div className="editor-toolbar" role="toolbar" aria-label="Markdown 快捷工具">
            {TOOLBAR_ITEMS.map((item) => (
              <button key={item.label} onClick={() => insertMarkdown(item)} title={item.title}>{item.label}</button>
            ))}
          </div>

          <textarea
            ref={textareaRef}
            value={markdown}
            onChange={(event) => setMarkdown(event.target.value)}
            spellCheck={false}
            aria-label="Markdown 编辑器"
          />

          <footer className="editor-meta">
            <span>{markdown.length.toLocaleString()} 字符</span>
            <span>{markdown.split('\n').length} 行</span>
            <span>自动保存于本机</span>
          </footer>
        </section>

        <section className="preview-panel">
          <div className="panel-heading preview-heading">
            <div>
              <span className="panel-eyebrow">VIEWPORT</span>
              <h2>手机阅读器</h2>
            </div>
            <div className="viewport-dimension">{viewportWidth} × {contentHeight}</div>
          </div>

          <div className="preview-controls">
            <div className="segmented-control" aria-label="视口宽度">
              {WIDTH_PRESETS.map((width) => (
                <button key={width} className={viewportWidth === width ? 'active' : ''} onClick={() => setViewportWidth(width)}>{width}</button>
              ))}
            </div>
            <div className="segmented-control mode-control" aria-label="视口模式">
              <button className={viewportMode === 'browser' ? 'active' : ''} onClick={() => setViewportMode('browser')}>浏览器</button>
              <button className={viewportMode === 'webview' ? 'active' : ''} onClick={() => setViewportMode('webview')}>App 全屏</button>
            </div>
          </div>

          <div className="phone-stage">
            <div className={`phone-frame ${viewportMode}`} style={{ width: viewportWidth }}>
              {viewportMode === 'browser' && (
                <Fragment>
                  <div className="browser-chrome browser-chrome-top">
                    <span>9:41</span><div className="browser-address">ditto.cn</div><span>•••</span>
                  </div>
                </Fragment>
              )}
              <div className="reader-chrome">
                <div className="reader-brand">Ditto Reader</div>
                <div className="reader-progress"><span /></div>
              </div>
              <article className="markdown-reader" style={{ height: contentHeight }}>
                {rendered}
              </article>
              {viewportMode === 'browser' && (
                <div className="browser-chrome browser-chrome-bottom">
                  <span>‹</span><span>○</span><span>↗</span><span>□</span>
                </div>
              )}
            </div>
          </div>

          <div className="preview-note">
            <span className="preview-note-dot" />
            {viewportMode === 'browser'
              ? '模拟顶部、底部 Bar 占位；正文只使用剩余高度。'
              : '模拟 App WebView 全屏；正文获得完整可用高度。'}
          </div>
        </section>
      </section>
    </main>
  )
}
