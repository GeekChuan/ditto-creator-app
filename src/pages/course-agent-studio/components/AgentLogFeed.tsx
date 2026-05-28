import { useEffect, useRef } from 'react'

interface Props {
  lines: string[]
}

export default function AgentLogFeed({ lines }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines.length])

  return (
    <div className="cas-log-terminal">
      {lines.map((line, i) => {
        const isSuccess = line.includes('✓') || line.includes('completed successfully')
        const isHighlight = line.startsWith('> [llm]') || line.startsWith('> [agent]') || line.startsWith('> [export]')
        return (
          <span
            key={i}
            className={`log-line${isSuccess ? ' success' : isHighlight ? ' highlight' : ''}`}
          >
            {line}
            {'\n'}
          </span>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}
