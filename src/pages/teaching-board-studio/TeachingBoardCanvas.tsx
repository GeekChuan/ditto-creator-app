import { Empty } from 'antd'
import type { ReactNode } from 'react'
import type {
  TeachingBoardBlock,
  TeachingBoardEffect,
  TeachingBoardProject,
  TeachingBoardText,
} from '../../types/teachingBoard'
import { BLOCK_LABELS, type TeachingBoardRuntimeState } from './model'

interface Props {
  project: TeachingBoardProject
  runtime: TeachingBoardRuntimeState
  selectedBlockId?: string
  selectedAnchorId?: string
  zoom: number
  onSelectBlock: (blockId: string) => void
  onSelectAnchor: (anchorId: string, blockId: string) => void
}

function AnchoredTextView({
  value,
  effects,
  blockId,
  selectedAnchorId,
  onSelectAnchor,
}: {
  value: TeachingBoardText
  effects: TeachingBoardEffect[]
  blockId: string
  selectedAnchorId?: string
  onSelectAnchor: (anchorId: string, blockId: string) => void
}) {
  const rangeEffects = effects.filter((effect) => 'anchor_range' in effect.target)
  const singleEffects = effects.filter((effect) => 'anchor_id' in effect.target)

  const rangeEffectsAt = (index: number): TeachingBoardEffect[] => rangeEffects.filter((effect) => {
    if (!('anchor_range' in effect.target)) return false
    const { start_anchor_id: startAnchorId, end_anchor_id: endAnchorId } = effect.target.anchor_range
    const startIndex = value.findIndex((item) => item.anchor_id === startAnchorId)
    const endIndex = value.findIndex((item) => item.anchor_id === endAnchorId)
    if (startIndex < 0 || endIndex < 0) return false
    return index >= Math.min(startIndex, endIndex) && index <= Math.max(startIndex, endIndex)
  })

  const runs = value.reduce<Array<{ effects: TeachingBoardEffect[]; indexes: number[] }>>(
    (result, _segment, index) => {
    const segmentRangeEffects = rangeEffectsAt(index)
    const signature = segmentRangeEffects.map((item) => item.effect_id).sort().join('|')
    const previous = result[result.length - 1]
    const previousSignature = previous?.effects.map((item) => item.effect_id).sort().join('|')
    if (previous && signature === previousSignature) previous.indexes.push(index)
    else result.push({ effects: segmentRangeEffects, indexes: [index] })
    return result
  }, [])

  const effectSpan = (content: ReactNode, activeEffects: TeachingBoardEffect[], key: string) => {
    if (!activeEffects.length) return <span key={key}>{content}</span>
    const labels = activeEffects.filter((item) => item.type === 'label' && item.text)
    return (
      <span
        key={key}
        className={[
          'tb-studio-effect',
          ...activeEffects.flatMap((effect) => [
            `effect-${effect.type}`,
            `effect-tone-${effect.tone ?? 'annotation'}`,
          ]),
        ].join(' ')}
      >
        {content}
        {labels.map((label) => (
          <span className="tb-studio-effect-label" key={label.effect_id}>
            {label.text}
          </span>
        ))}
      </span>
    )
  }

  const renderSegment = (segmentIndex: number) => {
    const segment = value[segmentIndex]
    if (!segment) return null
    const anchor = (
      <span
        key={`${segment.anchor_id ?? 'text'}-${segmentIndex}`}
        className={[
          'tb-studio-anchor',
          segment.anchor_id ? 'has-anchor' : '',
          segment.anchor_id === selectedAnchorId ? 'is-selected' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        data-anchor-id={segment.anchor_id}
        onClick={(event) => {
          if (!segment.anchor_id) return
          event.stopPropagation()
          onSelectAnchor(segment.anchor_id, blockId)
        }}
      >
        {segment.text}
      </span>
    )
    const activeSingleEffects = singleEffects.filter(
      (effect) => 'anchor_id' in effect.target && effect.target.anchor_id === segment.anchor_id,
    )
    return effectSpan(anchor, activeSingleEffects, `single-${segmentIndex}`)
  }

  return (
    <>
      {runs.map((run, index) => {
        const content = run.indexes.map(renderSegment)
        return effectSpan(content, run.effects, `range-${index}`)
      })}
    </>
  )
}

function renderBlock(
  block: TeachingBoardBlock,
  runtime: TeachingBoardRuntimeState,
  selectedAnchorId: string | undefined,
  onSelectAnchor: (anchorId: string, blockId: string) => void,
) {
  const text = (value: TeachingBoardText) => (
    <AnchoredTextView
      value={value}
      effects={runtime.effects}
      blockId={block.id}
      selectedAnchorId={selectedAnchorId}
      onSelectAnchor={onSelectAnchor}
    />
  )

  if (block.type === 'title') {
    return <h2 className={`tb-canvas-title variant-${block.variant ?? 'normal'}`}>{text(block.text)}</h2>
  }
  if (block.type === 'content') return <p className="tb-canvas-content">{text(block.text)}</p>
  if (block.type === 'quote') {
    return (
      <blockquote className="tb-canvas-quote">
        {block.paragraphs.map((paragraph, index) => <p key={index}>{text(paragraph)}</p>)}
      </blockquote>
    )
  }
  if (block.type === 'order_list') {
    const activeItemId = runtime.activeOrderListItems[block.id] ?? block.initial_active_item_id
    return (
      <ol className={`tb-canvas-list variant-${block.variant ?? 'normal'}`}>
        {block.items.map((item, index) => (
          <li className={item.id === activeItemId ? 'is-active' : ''} key={item.id}>
            <span className="tb-canvas-list-index">{index + 1}</span>
            <span className="tb-canvas-list-copy">
              <strong>{text(item.title)}</strong>
              {item.description ? <span>{text(item.description)}</span> : null}
            </span>
          </li>
        ))}
      </ol>
    )
  }
  if (block.type === 'image') {
    return (
      <figure className="tb-canvas-media">
        {block.url ? <img src={block.url} alt={block.alt ?? ''} /> : <div className="tb-canvas-media-empty">选择图片或填写 URL</div>}
        {block.caption?.length ? <figcaption>{text(block.caption)}</figcaption> : null}
      </figure>
    )
  }
  if (block.type === 'video') {
    return (
      <figure className="tb-canvas-media">
        {block.url ? (
          <video src={block.url} poster={block.poster_url} controls={block.controls !== false} muted />
        ) : (
          <div className="tb-canvas-media-empty">选择视频或填写 URL</div>
        )}
        {block.caption?.length ? <figcaption>{text(block.caption)}</figcaption> : null}
      </figure>
    )
  }
  return <div className="tb-canvas-extension">扩展组件：{block.type}</div>
}

export default function TeachingBoardCanvas({
  project,
  runtime,
  selectedBlockId,
  selectedAnchorId,
  zoom,
  onSelectBlock,
  onSelectAnchor,
}: Props) {
  return (
    <div className="tb-studio-canvas-shell">
      <div className="tb-studio-phone" style={{ transform: `scale(${zoom})` }}>
        <div className="tb-studio-phone-speaker" />
        <div className="tb-studio-phone-screen">
          <div className="tb-studio-board">
            {project.document.blocks.length ? (
              project.document.blocks.map((block) => (
                <section
                  key={block.id}
                  className={[
                    'tb-canvas-block',
                    `block-${block.type}`,
                    selectedBlockId === block.id ? 'is-selected' : '',
                  ].join(' ')}
                  onClick={() => onSelectBlock(block.id)}
                >
                  <span className="tb-canvas-block-badge">{BLOCK_LABELS[block.type] ?? block.type}</span>
                  {renderBlock(block, runtime, selectedAnchorId, onSelectAnchor)}
                </section>
              ))
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="从左侧添加第一个组件" />
            )}
          </div>
          <div className="tb-studio-narration-placeholder">
            <span className="tb-studio-avatar-placeholder">T</span>
            <span className="tb-studio-speech-placeholder">Speech 将固定显示在这里</span>
          </div>
          <div className="tb-studio-action-placeholder">
            <span>暂停</span><span>跟读</span><span>Mark一下</span><span>举手</span>
          </div>
        </div>
      </div>
    </div>
  )
}
