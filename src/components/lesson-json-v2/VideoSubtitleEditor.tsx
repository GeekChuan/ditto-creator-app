import { useEffect, useRef, useState } from 'react'
import { Button, Input, InputNumber, Segmented, Space, Table, Tag, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { SubtitleSpokenLanguage, VideoSubtitleSegment } from '../../types/atbReactionV2'
import { formatSpokenLanguageLabel } from '../subtitle-timing/buildDirectorPrepScript'
import {
  formatPrepExpressionsDraft,
  formatPrepPhrasesDraft,
  parsePrepExpressionsDraft,
  parsePrepPhrasesDraft,
} from '../subtitle-timing/prepMetadata'

const { Text } = Typography
const { TextArea } = Input

interface Props {
  segments: VideoSubtitleSegment[]
  onChange: (segments: VideoSubtitleSegment[]) => void
  label?: string
  /** timing：打轴器布局，text 独占一行完整展示 */
  layout?: 'table' | 'timing'
  activeIndex?: number
  onSeekToSegment?: (index: number) => void
  /** timing 布局下列表区域最大高度，超出后独立滚动 */
  listMaxHeight?: string | number
  /** 备课模式：展示每句字幕的备注输入框 */
  prepMode?: boolean
  /** 禁用编辑，常用于 LLM 批处理期间防止字幕索引变化 */
  disabled?: boolean
}

export default function VideoSubtitleEditor({
  segments,
  onChange,
  label,
  layout = 'table',
  activeIndex = -1,
  onSeekToSegment,
  listMaxHeight = 'calc(100vh - 280px)',
  prepMode = false,
  disabled = false,
}: Props) {
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const [highlightDrafts, setHighlightDrafts] = useState<Record<number, string>>({})
  const [prepWordsDrafts, setPrepWordsDrafts] = useState<Record<number, string>>({})
  const [prepPhrasesDrafts, setPrepPhrasesDrafts] = useState<Record<number, string>>({})
  const [prepExpressionsDrafts, setPrepExpressionsDrafts] = useState<Record<number, string>>({})

  useEffect(() => {
    if (layout !== 'timing' || activeIndex < 0) return
    itemRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [activeIndex, layout])

  useEffect(() => {
    setHighlightDrafts({})
    setPrepWordsDrafts({})
    setPrepPhrasesDrafts({})
    setPrepExpressionsDrafts({})
  }, [segments.length])

  const updateRow = (index: number, patch: Partial<VideoSubtitleSegment>) => {
    if (disabled) return
    const next = segments.map((s, i) => (i === index ? { ...s, ...patch } : s))
    onChange(next)
  }

  const getHighlightsInputValue = (index: number, highlights?: string[]) => {
    const draft = highlightDrafts[index]
    if (typeof draft === 'string') return draft
    return (highlights ?? []).join(', ')
  }

  const handleHighlightsInputChange = (index: number, raw: string) => {
    setHighlightDrafts((prev) => ({ ...prev, [index]: raw }))
  }

  const commitHighlights = (index: number, raw: string) => {
    if (disabled) return
    updateRow(index, {
      highlights: raw
        .split(/[，,]/)
        .map((s) => s.trim())
        .filter(Boolean),
    })
    setHighlightDrafts((prev) => {
      const next = { ...prev }
      delete next[index]
      return next
    })
  }

  const getPrepWordsInputValue = (index: number, words?: string[]) => {
    const draft = prepWordsDrafts[index]
    if (typeof draft === 'string') return draft
    return (words ?? []).join(', ')
  }

  const commitPrepWords = (index: number, raw: string) => {
    if (disabled) return
    updateRow(index, {
      prep_words: raw
        .split(/[，,]/)
        .map((s) => s.trim())
        .filter(Boolean),
    })
    setPrepWordsDrafts((prev) => {
      const next = { ...prev }
      delete next[index]
      return next
    })
  }

  const getPrepPhrasesInputValue = (index: number, phrases?: VideoSubtitleSegment['prep_phrases']) => {
    const draft = prepPhrasesDrafts[index]
    if (typeof draft === 'string') return draft
    return formatPrepPhrasesDraft(phrases)
  }

  const commitPrepPhrases = (index: number, raw: string) => {
    if (disabled) return
    const parsed = parsePrepPhrasesDraft(raw)
    updateRow(index, { prep_phrases: parsed.length ? parsed : undefined })
    setPrepPhrasesDrafts((prev) => {
      const next = { ...prev }
      delete next[index]
      return next
    })
  }

  const getPrepExpressionsInputValue = (
    index: number,
    expressions?: VideoSubtitleSegment['prep_expressions'],
  ) => {
    const draft = prepExpressionsDrafts[index]
    if (typeof draft === 'string') return draft
    return formatPrepExpressionsDraft(expressions)
  }

  const commitPrepExpressions = (index: number, raw: string) => {
    if (disabled) return
    const parsed = parsePrepExpressionsDraft(raw)
    updateRow(index, { prep_expressions: parsed.length ? parsed : undefined })
    setPrepExpressionsDrafts((prev) => {
      const next = { ...prev }
      delete next[index]
      return next
    })
  }

  const hasPrepKnowledge = (seg: VideoSubtitleSegment) =>
    Boolean(
      seg.prep_words?.length
      || seg.prep_phrases?.length
      || seg.prep_expressions?.length,
    )

  const columns: ColumnsType<VideoSubtitleSegment> = [
    {
      title: 'start_ms',
      width: 100,
      render: (_, __, index) => (
        <InputNumber
          size="small"
          min={0}
          style={{ width: '100%' }}
          value={segments[index]?.start_ms}
          disabled={disabled}
          onChange={(v) => updateRow(index, { start_ms: v ?? 0 })}
        />
      ),
    },
    {
      title: 'end_ms',
      width: 100,
      render: (_, __, index) => (
        <InputNumber
          size="small"
          min={0}
          style={{ width: '100%' }}
          value={segments[index]?.end_ms}
          disabled={disabled}
          onChange={(v) => updateRow(index, { end_ms: v ?? 0 })}
        />
      ),
    },
    {
      title: 'text',
      render: (_, __, index) => (
        <Input
          size="small"
          value={segments[index]?.text}
          disabled={disabled}
          onChange={(e) => updateRow(index, { text: e.target.value })}
        />
      ),
    },
    {
      title: 'translation_zh',
      render: (_, __, index) => (
        <Input
          size="small"
          value={segments[index]?.translation_zh ?? ''}
          disabled={disabled}
          onChange={(e) => updateRow(index, { translation_zh: e.target.value })}
        />
      ),
    },
    {
      title: 'highlights',
      width: 120,
      render: (_, __, index) => (
        <Input
          size="small"
          placeholder="逗号分隔"
          value={getHighlightsInputValue(index, segments[index]?.highlights)}
          disabled={disabled}
          onChange={(e) => handleHighlightsInputChange(index, e.target.value)}
          onBlur={(e) => commitHighlights(index, e.target.value)}
        />
      ),
    },
    {
      title: '',
      width: 60,
      render: (_, __, index) => (
        <Button
          size="small"
          danger
          type="link"
          disabled={disabled}
          onClick={() => onChange(segments.filter((_, i) => i !== index))}
        >
          删
        </Button>
      ),
    },
  ]

  if (layout === 'timing') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Space style={{ marginBottom: 8, width: '100%', justifyContent: 'space-between', flexShrink: 0 }}>
          <Text strong>{label ?? 'subtitles.segments'}</Text>
          <Button
            size="small"
            disabled={disabled}
            onClick={() =>
              onChange([
                ...segments,
                { start_ms: 0, end_ms: 3000, text: '', highlights: [] },
              ])
            }
          >
            添加字幕段
          </Button>
        </Space>
        <div
          style={{
            maxHeight: listMaxHeight,
            overflowY: 'auto',
            overflowX: 'hidden',
            paddingRight: 4,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {segments.length === 0 ? (
              <Text type="secondary">暂无字幕，可点击「识别英文字幕」或手动添加</Text>
            ) : (
              segments.map((seg, index) => (
                <div
                  key={`${seg.start_ms}-${index}`}
                  ref={(el) => {
                    itemRefs.current[index] = el
                  }}
                  style={{
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: `1px solid ${index === activeIndex ? '#1677ff' : '#f0f0f0'}`,
                  background: index === activeIndex ? '#f0f7ff' : '#fafafa',
                  cursor: onSeekToSegment ? 'pointer' : undefined,
                }}
                onClick={() => onSeekToSegment?.(index)}
              >
                <Space wrap style={{ marginBottom: 8 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>#{index + 1}</Text>
                  {!prepMode && seg.prep_note?.trim() ? (
                    <Tag color="gold" style={{ margin: 0 }}>有备注</Tag>
                  ) : null}
                  <Tag
                    color={seg.spoken_language === 'zh' ? 'orange' : 'cyan'}
                    style={{ margin: 0 }}
                  >
                    {formatSpokenLanguageLabel(seg.spoken_language)}
                  </Tag>
                  {!prepMode && hasPrepKnowledge(seg) ? (
                    <Tag color="blue" style={{ margin: 0 }}>有备课知识</Tag>
                  ) : null}
                  <InputNumber
                    size="small"
                    min={0}
                    addonBefore="start"
                    value={seg.start_ms}
                    disabled={disabled}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(v) => updateRow(index, { start_ms: v ?? 0 })}
                  />
                  <InputNumber
                    size="small"
                    min={0}
                    addonBefore="end"
                    value={seg.end_ms}
                    disabled={disabled}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(v) => updateRow(index, { end_ms: v ?? 0 })}
                  />
                  <Button
                    size="small"
                    danger
                    type="link"
                    disabled={disabled}
                    onClick={(e) => {
                      e.stopPropagation()
                      onChange(segments.filter((_, i) => i !== index))
                    }}
                  >
                    删
                  </Button>
                  <Segmented
                    size="small"
                    value={seg.spoken_language ?? 'en'}
                    disabled={disabled}
                    options={[
                      { label: '英文讲', value: 'en' },
                      { label: '中文讲', value: 'zh' },
                    ]}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(value) => updateRow(index, { spoken_language: value as SubtitleSpokenLanguage })}
                  />
                </Space>
                <TextArea
                  value={seg.text}
                  disabled={disabled}
                  autoSize={{ minRows: 1, maxRows: 8 }}
                  placeholder="text"
                  style={{ marginBottom: 8, resize: 'vertical' }}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => updateRow(index, { text: e.target.value })}
                />
                <Space direction="vertical" style={{ width: '100%' }} size={6}>
                  <Input
                    size="small"
                    placeholder="translation_zh"
                    value={seg.translation_zh ?? ''}
                    disabled={disabled}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => updateRow(index, { translation_zh: e.target.value })}
                  />
                  <Input
                    size="small"
                    placeholder="highlights（逗号分隔）"
                    value={getHighlightsInputValue(index, seg.highlights)}
                    disabled={disabled}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => handleHighlightsInputChange(index, e.target.value)}
                    onBlur={(e) => commitHighlights(index, e.target.value)}
                  />
                  {prepMode ? (
                    <>
                      <TextArea
                        value={seg.prep_note ?? ''}
                        disabled={disabled}
                        autoSize={{ minRows: 2, maxRows: 6 }}
                        placeholder="备课备注（仅 Creator 可见，不会展示给学员）"
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => updateRow(index, { prep_note: e.target.value })}
                      />
                      <Input
                        size="small"
                        placeholder="备课单词（逗号分隔，可同步到元数据词汇）"
                        value={getPrepWordsInputValue(index, seg.prep_words)}
                        disabled={disabled}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setPrepWordsDrafts((prev) => ({ ...prev, [index]: e.target.value }))}
                        onBlur={(e) => commitPrepWords(index, e.target.value)}
                      />
                      <TextArea
                        value={getPrepPhrasesInputValue(index, seg.prep_phrases)}
                        disabled={disabled}
                        autoSize={{ minRows: 2, maxRows: 6 }}
                        placeholder={'备课词组（每行一条，格式：词组 | 中文 | 说明）'}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setPrepPhrasesDrafts((prev) => ({ ...prev, [index]: e.target.value }))}
                        onBlur={(e) => commitPrepPhrases(index, e.target.value)}
                      />
                      <TextArea
                        value={getPrepExpressionsInputValue(index, seg.prep_expressions)}
                        disabled={disabled}
                        autoSize={{ minRows: 2, maxRows: 6 }}
                        placeholder={'备课句型（每行一条，格式：句型 | 中文 | 说明）'}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setPrepExpressionsDrafts((prev) => ({ ...prev, [index]: e.target.value }))}
                        onBlur={(e) => commitPrepExpressions(index, e.target.value)}
                      />
                    </>
                  ) : null}
                </Space>
              </div>
              ))
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <Space style={{ marginBottom: 8, width: '100%', justifyContent: 'space-between' }}>
        <Text strong>{label ?? 'subtitles.segments'}</Text>
        <Button
          size="small"
          disabled={disabled}
          onClick={() =>
            onChange([
              ...segments,
              { start_ms: 0, end_ms: 3000, text: '', highlights: [] },
            ])
          }
        >
          添加字幕段
        </Button>
      </Space>
      <Table
        size="small"
        rowKey={(_, i) => String(i)}
        pagination={false}
        dataSource={segments}
        columns={columns}
        scroll={{ x: 720 }}
        locale={{ emptyText: '暂无字幕，可点击「识别英文字幕」或手动添加' }}
      />
    </div>
  )
}
