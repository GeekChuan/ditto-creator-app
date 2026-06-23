import { type ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Modal,
  Progress,
  Row,
  Space,
  Spin,
  Switch,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  BookOutlined,
  DownloadOutlined,
  FieldTimeOutlined,
  ImportOutlined,
  NodeIndexOutlined,
  PlusOutlined,
  SaveOutlined,
  VideoCameraOutlined,
} from '@ant-design/icons'
import { DittoVideoPlayer, type DittoVideoPlayerHandle } from '@laix/ditto-ui-components'
import {
  assetsApi,
  type SubtitlePrepExtractStreamEvent,
  type VideoAsset,
  type VideoMetadataBundle,
} from '../api/assets'
import AssetPickerModal from '../components/subtitle-timing/AssetPickerModal'
import PrepPromptManager from '../components/subtitle-timing/PrepPromptManager'
import VideoSubtitleEditor from '../components/lesson-json-v2/VideoSubtitleEditor'
import {
  buildPrepMetadataSyncPayload,
  mergePrepKnowledgeFromMetadata,
  serializePrepExpressionsForApi,
  serializePrepPhrasesForApi,
} from '../components/subtitle-timing/prepMetadata'
import {
  findActiveSegmentIndex,
  formatMs,
  normalizeStoredSubtitleSegments,
} from '../components/subtitle-timing/normalizeSegments'
import { buildSelfStudyV2Export } from '../components/subtitle-timing/buildSelfStudyExport'
import type { VideoSubtitleSegment } from '../types/atbReactionV2'

const { Title, Text, Paragraph } = Typography

type PrepExtractStatus = 'idle' | 'running' | 'done' | 'cancelled' | 'error'

interface SubtitleAxisExport {
  schema: 'ditto.subtitle-axis.v1'
  exported_at: string
  asset?: {
    id: string
    title?: string | null
  }
  segments: VideoSubtitleSegment[]
}

function safeDownloadFilename(title: string | null | undefined): string {
  const base = (title || 'video').replace(/[^\w\u4e00-\u9fff.-]+/g, '_').replace(/_+/g, '_').slice(0, 80)
  return base || 'video'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function buildTranscriptLines(
  segments: VideoSubtitleSegment[],
  field: 'text' | 'translation_zh',
): string[] {
  return [...segments]
    .sort((a, b) => a.start_ms - b.start_ms)
    .map((seg) => (field === 'text' ? seg.text : seg.translation_zh)?.trim())
    .filter((line): line is string => Boolean(line))
}

function buildDirectorPrepScript(segments: VideoSubtitleSegment[]): string {
  return [...segments]
    .sort((a, b) => a.start_ms - b.start_ms)
    .map((seg) => ({
      text: seg.text.trim(),
      timeRange: `${formatMs(seg.start_ms)} - ${formatMs(seg.end_ms)}`,
      prepNote: seg.prep_note?.trim() || '',
    }))
    .filter((item) => item.text)
    .map((item, index) => [
      `序号：${index + 1}`,
      `原稿：${item.text}`,
      `时间戳：${item.timeRange}`,
      `备课备注：${item.prepNote}`,
    ].join('\n'))
    .join('\n\n')
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: filename.endsWith('.json') ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function buildSegmentPayload(segments: VideoSubtitleSegment[]) {
  return segments
    .map((seg) => ({
      start_ms: seg.start_ms,
      end_ms: seg.end_ms,
      text: seg.text.trim(),
      translation_zh: seg.translation_zh?.trim() || undefined,
      highlights: seg.highlights?.length ? seg.highlights : undefined,
      prep_note: seg.prep_note?.trim() || undefined,
      prep_words: seg.prep_words?.length ? seg.prep_words : undefined,
      prep_phrases: serializePrepPhrasesForApi(seg.prep_phrases),
      prep_expressions: serializePrepExpressionsForApi(seg.prep_expressions),
    }))
    .filter((seg) => seg.text)
}

function cloneSubtitleSegmentsForExport(segments: VideoSubtitleSegment[]): VideoSubtitleSegment[] {
  return segments.map((seg) => ({
    ...seg,
    highlights: seg.highlights ? [...seg.highlights] : undefined,
    prep_words: seg.prep_words ? [...seg.prep_words] : undefined,
    prep_phrases: seg.prep_phrases ? seg.prep_phrases.map((item) => ({ ...item })) : undefined,
    prep_expressions: seg.prep_expressions ? seg.prep_expressions.map((item) => ({ ...item })) : undefined,
    words: seg.words ? seg.words.map((item) => ({ ...item })) : undefined,
  }))
}

function mergePrepFieldsOnly(
  current: VideoSubtitleSegment,
  incoming: Record<string, unknown>,
): VideoSubtitleSegment {
  const normalized = normalizeStoredSubtitleSegments([incoming])[0]
  if (!normalized) return current
  return {
    ...current,
    ...(normalized.prep_phrases?.length ? { prep_phrases: normalized.prep_phrases } : {}),
    ...(normalized.prep_expressions?.length ? { prep_expressions: normalized.prep_expressions } : {}),
  }
}

function resolveImportedSegments(raw: unknown): VideoSubtitleSegment[] {
  const source = Array.isArray(raw)
    ? raw
    : isRecord(raw) && Array.isArray(raw.segments)
      ? raw.segments
      : isRecord(raw) && isRecord(raw.subtitles) && Array.isArray(raw.subtitles.segments)
        ? raw.subtitles.segments
        : null
  if (!source) {
    throw new Error('JSON 中没有找到 segments 数组')
  }
  const normalized = normalizeStoredSubtitleSegments(source as Array<Record<string, unknown>>)
  if (!normalized.length) {
    throw new Error('segments 为空，或没有有效字幕文本')
  }
  return normalized
}

async function resolvePlayUrl(asset: VideoAsset): Promise<string> {
  if (asset.video_access_url) return asset.video_access_url
  if (!asset.video_url) return ''
  try {
    const { play_url } = await assetsApi.getPlaybackUrl({ file_url: asset.video_url })
    return play_url
  } catch {
    return asset.video_url
  }
}

export default function SubtitleTimingPage() {
  const playerRef = useRef<DittoVideoPlayerHandle>(null)
  const prepExtractAbortRef = useRef<AbortController | null>(null)
  const subtitleJsonInputRef = useRef<HTMLInputElement>(null)
  const [messageApi, contextHolder] = message.useMessage()

  const [pickerOpen, setPickerOpen] = useState(false)
  const [asset, setAsset] = useState<VideoAsset | null>(null)
  const [playUrl, setPlayUrl] = useState('')
  const [loadingAsset, setLoadingAsset] = useState(false)

  const [segments, setSegments] = useState<VideoSubtitleSegment[]>([])
  const [dirty, setDirty] = useState(false)
  const [loadingSubtitle, setLoadingSubtitle] = useState(false)
  const [saving, setSaving] = useState(false)
  const [realigning, setRealigning] = useState(false)
  const [prepMode, setPrepMode] = useState(false)
  const [metadataBundle, setMetadataBundle] = useState<VideoMetadataBundle | null>(null)
  const [loadingMetadata, setLoadingMetadata] = useState(false)
  const [syncingMetadata, setSyncingMetadata] = useState(false)
  const [extractingPrep, setExtractingPrep] = useState(false)
  const [prepExtractStatus, setPrepExtractStatus] = useState<PrepExtractStatus>('idle')
  const [prepExtractLogs, setPrepExtractLogs] = useState<string[]>([])
  const [prepExtractProgress, setPrepExtractProgress] = useState({
    totalChunks: 0,
    doneChunks: 0,
    phrasesAdded: 0,
    expressionsAdded: 0,
  })

  const [currentTimeMs, setCurrentTimeMs] = useState(0)
  const [activeIndex, setActiveIndex] = useState(-1)

  const overlayText = useMemo(() => {
    if (activeIndex < 0) return null
    const seg = segments[activeIndex]
    if (!seg) return null
    const zh = seg.translation_zh?.trim()
    return zh ? `${seg.text}\n${zh}` : seg.text
  }, [activeIndex, segments])

  const loadSubtitle = useCallback(async (assetId: string, bundle?: VideoMetadataBundle | null) => {
    setLoadingSubtitle(true)
    try {
      const data = await assetsApi.getSubtitle(assetId)
      const normalized = normalizeStoredSubtitleSegments(data.segments)
      const merged = mergePrepKnowledgeFromMetadata(normalized, bundle ?? metadataBundle)
      setSegments(merged)
      setDirty(false)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 404) {
        setSegments([])
        setDirty(false)
        return
      }
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      messageApi.error(detail || '加载字幕失败')
      setSegments([])
    } finally {
      setLoadingSubtitle(false)
    }
  }, [messageApi, metadataBundle])

  const loadMetadata = useCallback(async (assetId: string) => {
    setLoadingMetadata(true)
    try {
      const bundle = await assetsApi.getMetadata(assetId)
      setMetadataBundle(bundle)
      return bundle
    } catch {
      setMetadataBundle(null)
      return null
    } finally {
      setLoadingMetadata(false)
    }
  }, [])

  const handleSelectAsset = useCallback(async (selected: VideoAsset) => {
    setLoadingAsset(true)
    setAsset(selected)
    setSegments([])
    setMetadataBundle(null)
    setDirty(false)
    setCurrentTimeMs(0)
    setActiveIndex(-1)
    try {
      const url = await resolvePlayUrl(selected)
      if (!url) {
        messageApi.error('无法获取视频播放地址')
        setPlayUrl('')
        return
      }
      setPlayUrl(url)
      const bundle = await loadMetadata(selected.id)
      await loadSubtitle(selected.id, bundle)
    } finally {
      setLoadingAsset(false)
    }
  }, [loadMetadata, loadSubtitle, messageApi])

  const handlePrepModeChange = useCallback((enabled: boolean) => {
    setPrepMode(enabled)
    if (enabled && metadataBundle) {
      setSegments((prev) => mergePrepKnowledgeFromMetadata(prev, metadataBundle))
    }
  }, [metadataBundle])

  const handleSegmentsChange = useCallback((next: VideoSubtitleSegment[]) => {
    setSegments(next)
    setDirty(true)
  }, [])

  const handleTimeUpdate = useCallback((seconds: number) => {
    const ms = Math.round(seconds * 1000)
    setCurrentTimeMs(ms)
    setActiveIndex(findActiveSegmentIndex(segments, ms))
  }, [segments])

  useEffect(() => {
    setActiveIndex(findActiveSegmentIndex(segments, currentTimeMs))
  }, [segments, currentTimeMs])

  useEffect(() => () => {
    prepExtractAbortRef.current?.abort()
  }, [])

  const appendPrepExtractLog = useCallback((line: string) => {
    const time = new Date().toLocaleTimeString()
    setPrepExtractLogs((prev) => [...prev.slice(-80), `[${time}] ${line}`])
  }, [])

  const handleAddAtCurrentTime = useCallback(() => {
    const startMs = currentTimeMs
    const endMs = startMs + 3000
    const next = [
      ...segments,
      { start_ms: startMs, end_ms: endMs, text: '', highlights: [] },
    ].sort((a, b) => a.start_ms - b.start_ms)
    setSegments(next)
    setDirty(true)
    const newIndex = findActiveSegmentIndex(next, startMs)
    if (newIndex >= 0) setActiveIndex(newIndex)
  }, [currentTimeMs, segments])

  const handleSeekToSegment = useCallback((index: number) => {
    const seg = segments[index]
    if (!seg) return
    playerRef.current?.seekTo(seg.start_ms / 1000)
    setActiveIndex(index)
  }, [segments])

  const handleSave = useCallback(async () => {
    if (!asset) return
    const payload = buildSegmentPayload(segments)

    if (!payload.length) {
      messageApi.warning('请至少添加一条有效字幕（需填写文本）')
      return
    }

    setSaving(true)
    try {
      await assetsApi.upsertSubtitle(asset.id, { segments: payload })
      messageApi.success('字幕已保存')
      setDirty(false)
      setAsset((prev) => (prev ? { ...prev, subtitle_status: 'ready' } : prev))
      await loadSubtitle(asset.id)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      messageApi.error(detail || '保存字幕失败')
    } finally {
      setSaving(false)
    }
  }, [asset, loadSubtitle, messageApi, segments])

  const handleExportSubtitleJson = useCallback(() => {
    if (!segments.length) {
      messageApi.warning('暂无字幕轴可导出')
      return
    }
    const payload: SubtitleAxisExport = {
      schema: 'ditto.subtitle-axis.v1',
      exported_at: new Date().toISOString(),
      asset: asset ? { id: asset.id, title: asset.title } : undefined,
      segments: cloneSubtitleSegmentsForExport(segments),
    }
    const filename = `${safeDownloadFilename(asset?.title)}-subtitle-axis.json`
    downloadTextFile(filename, `${JSON.stringify(payload, null, 2)}\n`)
    messageApi.success(`已导出 ${filename}`)
  }, [asset, messageApi, segments])

  const handleExportSelfStudyV2Json = useCallback(() => {
    if (!asset) {
      messageApi.warning('请先选择视频素材')
      return
    }
    if (!segments.length) {
      messageApi.warning('暂无字幕可导出')
      return
    }
    if (dirty) {
      messageApi.warning('请先保存字幕，再导出自学课 JSON')
      return
    }
    const payload = buildSelfStudyV2Export({
      asset,
      segments,
      metadataBundle,
    })
    const filename = `${safeDownloadFilename(asset.title)}-self-study-v2.json`
    downloadTextFile(filename, `${JSON.stringify(payload, null, 2)}\n`)
    messageApi.success(`已导出 ${filename}`)
  }, [asset, dirty, messageApi, metadataBundle, segments])

  const handleImportSubtitleJsonClick = useCallback(() => {
    subtitleJsonInputRef.current?.click()
  }, [])

  const handleImportSubtitleJsonFile = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const importFile = async () => {
      try {
        const rawText = await file.text()
        const imported = resolveImportedSegments(JSON.parse(rawText))
        setSegments(imported)
        setDirty(true)
        setActiveIndex(-1)
        messageApi.success(`已导入 ${imported.length} 条字幕轴，请确认后保存字幕`)
      } catch (err) {
        const detail = err instanceof Error ? err.message : '导入失败'
        messageApi.error(`导入字幕轴 JSON 失败：${detail}`)
      }
    }

    if (dirty || segments.length > 0) {
      Modal.confirm({
        title: '导入字幕轴 JSON',
        content: '导入会替换当前编辑器里的字幕轴内容。建议先导出当前字幕轴 JSON 作为备份。',
        okText: '确认导入',
        cancelText: '取消',
        onOk: importFile,
      })
      return
    }

    await importFile()
  }, [dirty, messageApi, segments.length])

  const handleSyncPrepMetadata = useCallback(async () => {
    if (!asset) return
    if (dirty) {
      messageApi.warning('请先保存字幕，再同步到元数据')
      return
    }
    const payload = buildPrepMetadataSyncPayload(segments)
    if (!payload.length) {
      messageApi.warning('请至少添加一条有效字幕')
      return
    }

    setSyncingMetadata(true)
    try {
      const result = await assetsApi.syncPrepMetadata(asset.id, payload)
      messageApi.success(
        `已同步到元数据：词汇 ${result.vocabulary_count}、词组 ${result.phrases_count}、句型 ${result.expressions_count}`,
      )
      await loadMetadata(asset.id)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      messageApi.error(detail || '同步元数据失败')
    } finally {
      setSyncingMetadata(false)
    }
  }, [asset, dirty, loadMetadata, messageApi, segments])

  const applyPrepExtractEvent = useCallback((event: SubtitlePrepExtractStreamEvent) => {
    if (event.type === 'start') {
      setPrepExtractProgress({
        totalChunks: event.total_chunks,
        doneChunks: 0,
        phrasesAdded: 0,
        expressionsAdded: 0,
      })
      appendPrepExtractLog(`开始提取：${event.total_segments} 句，分 ${event.total_chunks} 批处理`)
      return
    }
    if (event.type === 'chunk_start') {
      appendPrepExtractLog(`第 ${event.chunk_index}/${event.total_chunks} 批开始：句子 #${event.segment_indexes.map((i) => i + 1).join(', #')}`)
      return
    }
    if (event.type === 'llm_attempt_start') {
      appendPrepExtractLog(
        `第 ${event.chunk_index}/${event.total_chunks} 批 · ${event.kind === 'phrases' ? '词组' : '句型'}：第 ${event.attempt}/${event.max_attempts} 轮调用 LLM（${event.mode === 'custom_prompt' ? '当前 Prompt' : '内置重试 Prompt'}）`,
      )
      return
    }
    if (event.type === 'llm_attempt_ok') {
      appendPrepExtractLog(
        `第 ${event.chunk_index}/${event.total_chunks} 批 · ${event.kind === 'phrases' ? '词组' : '句型'}：JSON 检测通过，items=${event.items_count}`,
      )
      if (event.raw_output || event.raw_preview) {
        appendPrepExtractLog(`第 ${event.chunk_index}/${event.total_chunks} 批 · ${event.kind === 'phrases' ? '词组' : '句型'} LLM 原始输出：${event.raw_output || event.raw_preview}`)
      }
      return
    }
    if (event.type === 'llm_normalized') {
      const unmatched = event.unmatched_indexes.length ? `；未匹配索引=${event.unmatched_indexes.join(', ')}` : ''
      appendPrepExtractLog(
        `第 ${event.chunk_index}/${event.total_chunks} 批 · ${event.kind === 'phrases' ? '词组' : '句型'}：规范化完成，raw items=${event.raw_items_count}，可回填条目=${event.usable_items_count}，匹配句子=${event.matched_segment_count}${unmatched}`,
      )
      return
    }
    if (event.type === 'llm_attempt_failed') {
      appendPrepExtractLog(
        `第 ${event.chunk_index}/${event.total_chunks} 批 · ${event.kind === 'phrases' ? '词组' : '句型'}：第 ${event.attempt}/${event.max_attempts} 轮 JSON/结构检测失败（返回 ${event.raw_chars} 字）：${event.detail}`,
      )
      if (event.raw_output) {
        appendPrepExtractLog(`第 ${event.chunk_index}/${event.total_chunks} 批 · ${event.kind === 'phrases' ? '词组' : '句型'} 失败轮次原始输出：${event.raw_output}`)
      }
      return
    }
    if (event.type === 'chunk_result') {
      setSegments((prev) => {
        const next = [...prev]
        for (const update of event.segments) {
          if (next[update.index]) {
            next[update.index] = mergePrepFieldsOnly(next[update.index], update.segment as Record<string, unknown>)
          }
        }
        return next
      })
      setDirty(true)
      setPrepExtractProgress({
        totalChunks: event.total_chunks,
        doneChunks: event.chunk_index,
        phrasesAdded: event.total_phrases_added,
        expressionsAdded: event.total_expressions_added,
      })
      appendPrepExtractLog(
        `第 ${event.chunk_index}/${event.total_chunks} 批完成：新增词组 ${event.phrases_added} 条、句型 ${event.expressions_added} 条，已回填`,
      )
      return
    }
    if (event.type === 'chunk_error') {
      setPrepExtractProgress((prev) => ({
        ...prev,
        totalChunks: event.total_chunks,
        doneChunks: Math.max(prev.doneChunks, event.chunk_index),
      }))
      appendPrepExtractLog(
        `第 ${event.chunk_index}/${event.total_chunks} 批失败，已跳过并继续：句子 #${event.segment_indexes.map((i) => i + 1).join(', #')}；${event.detail}`,
      )
      return
    }
    if (event.type === 'done') {
      setDirty(true)
      setPrepExtractStatus('done')
      setExtractingPrep(false)
      prepExtractAbortRef.current = null
      appendPrepExtractLog(`全部完成：新增词组 ${event.phrases_added} 条、句型 ${event.expressions_added} 条`)
      messageApi.success(`LLM 提取完成：新增词组 ${event.phrases_added} 条、句型 ${event.expressions_added} 条`)
      return
    }
    if (event.type === 'cancelled') {
      setPrepExtractStatus('cancelled')
      setExtractingPrep(false)
      prepExtractAbortRef.current = null
      appendPrepExtractLog(event.detail || '任务已取消')
      return
    }
    if (event.type === 'error') {
      setPrepExtractStatus('error')
      setExtractingPrep(false)
      prepExtractAbortRef.current = null
      appendPrepExtractLog(`失败：${event.detail}`)
      messageApi.error(event.detail || 'LLM 提取失败')
    }
  }, [appendPrepExtractLog, messageApi])

  const handleCancelPrepExtract = useCallback(() => {
    prepExtractAbortRef.current?.abort()
    prepExtractAbortRef.current = null
    setExtractingPrep(false)
    setPrepExtractStatus('cancelled')
    appendPrepExtractLog('已发送取消请求；如果后端正在等待当前 LLM 调用，会在本批返回后停止后续批次')
  }, [appendPrepExtractLog])

  const handleExtractPrepKnowledge = useCallback(() => {
    if (!asset) return
    const payload = buildSegmentPayload(segments)
    if (!payload.length) {
      messageApi.warning('请至少添加一条有效英文字幕')
      return
    }

    prepExtractAbortRef.current?.abort()
    const controller = new AbortController()
    prepExtractAbortRef.current = controller
    setExtractingPrep(true)
    setPrepExtractStatus('running')
    setPrepExtractLogs([])
    setPrepExtractProgress({ totalChunks: 0, doneChunks: 0, phrasesAdded: 0, expressionsAdded: 0 })
    appendPrepExtractLog('任务已启动，编辑器已暂时锁定')

    void assetsApi.prepExtractStream(asset.id, payload, {
      signal: controller.signal,
      onEvent: applyPrepExtractEvent,
    }).catch((err: unknown) => {
      if (controller.signal.aborted) {
        setPrepExtractStatus('cancelled')
        appendPrepExtractLog('前端已取消连接')
        return
      }
      const detail = err instanceof Error ? err.message : 'LLM 提取失败'
      setPrepExtractStatus('error')
      appendPrepExtractLog(`失败：${detail}`)
      messageApi.error(detail)
    }).finally(() => {
      if (prepExtractAbortRef.current === controller) {
        prepExtractAbortRef.current = null
      }
      setExtractingPrep(false)
    })
  }, [appendPrepExtractLog, applyPrepExtractEvent, asset, messageApi, segments])

  const handleDownloadTranscript = useCallback((field: 'text' | 'translation_zh') => {
    const lines = buildTranscriptLines(segments, field)
    if (!lines.length) {
      messageApi.warning(field === 'text' ? '暂无英文文稿可下载' : '暂无中文文稿可下载')
      return
    }
    const suffix = field === 'text' ? 'en' : 'zh'
    const filename = `${safeDownloadFilename(asset?.title)}-${suffix}.txt`
    downloadTextFile(filename, `${lines.join('\n')}\n`)
    messageApi.success(`已下载 ${filename}`)
  }, [asset?.title, messageApi, segments])

  const handleDownloadDirectorPrepScript = useCallback(() => {
    const content = buildDirectorPrepScript(segments)
    if (!content) {
      messageApi.warning('暂无导演组稿件可导出')
      return
    }
    const filename = `${safeDownloadFilename(asset?.title)}-director-prep-script.txt`
    downloadTextFile(filename, `${content}\n`)
    messageApi.success(`已导出 ${filename}`)
  }, [asset?.title, messageApi, segments])

  const buildRealignPayload = useCallback(() => buildSegmentPayload(segments), [segments])

  const handleRealign = useCallback(() => {
    if (!asset) return
    const payload = buildRealignPayload()
    if (!payload.length) {
      messageApi.warning('请先填写至少一条英文字幕文本')
      return
    }

    Modal.confirm({
      title: '重新打轴',
      content:
        '将把当前字幕段中的英文文本按顺序拼合，调用火山引擎字幕打轴 API 重新生成时间轴。'
        + '打轴结果会直接保存；若分句变化，仅文本完全匹配的中文翻译、备课备注与备课知识会保留。',
      okText: '开始打轴',
      cancelText: '取消',
      onOk: async () => {
        setRealigning(true)
        try {
          const data = await assetsApi.realignSubtitle(asset.id, {
            segments: payload,
            caption_type: 'speech',
          })
          setSegments(normalizeStoredSubtitleSegments(data.segments))
          setDirty(false)
          setAsset((prev) => (prev ? { ...prev, subtitle_status: 'ready' } : prev))
          messageApi.success(`重新打轴完成，共 ${data.segments?.length ?? 0} 句`)
        } catch (err: unknown) {
          const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
          messageApi.error(detail || '重新打轴失败')
          throw err
        } finally {
          setRealigning(false)
        }
      },
    })
  }, [asset, buildRealignPayload, messageApi])

  return (
    <div>
      {contextHolder}
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>
            <FieldTimeOutlined style={{ marginRight: 8 }} />
            字幕打轴器
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 13 }}>
            从素材库导入视频，查看或手动编辑字幕时间轴
          </Paragraph>
        </Col>
        <Col>
          <Space>
            {asset ? (
              <>
                <Text type="secondary">
                  <VideoCameraOutlined /> {asset.title || '未命名视频'}
                </Text>
                {dirty ? <Tag color="orange">未保存</Tag> : null}
                <Space size={4}>
                  <BookOutlined style={{ color: prepMode ? '#1677ff' : undefined }} />
                  <Text type="secondary" style={{ fontSize: 13 }}>备课模式</Text>
                  <Switch checked={prepMode} onChange={handlePrepModeChange} size="small" />
                </Space>
                {prepMode ? (
                  <>
                    <Button
                      icon={<BookOutlined />}
                      loading={extractingPrep}
                      disabled={segments.length === 0 || extractingPrep}
                      onClick={handleExtractPrepKnowledge}
                    >
                      LLM 提取词组/句型
                    </Button>
                    <Button
                      icon={<BookOutlined />}
                      loading={syncingMetadata}
                      disabled={segments.length === 0 || syncingMetadata || dirty || extractingPrep}
                      onClick={() => void handleSyncPrepMetadata()}
                    >
                      保存到元数据
                    </Button>
                    <Button
                      icon={<DownloadOutlined />}
                      disabled={segments.length === 0 || extractingPrep}
                      onClick={handleDownloadDirectorPrepScript}
                    >
                      导出导演组稿件
                    </Button>
                  </>
                ) : null}
                <Button
                  icon={<NodeIndexOutlined />}
                  loading={realigning}
                  disabled={segments.length === 0 || realigning || extractingPrep}
                  onClick={handleRealign}
                >
                  重新打轴
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  disabled={segments.length === 0 || extractingPrep}
                  onClick={() => handleDownloadTranscript('text')}
                >
                  保存英文文稿
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  disabled={segments.length === 0 || extractingPrep}
                  onClick={() => handleDownloadTranscript('translation_zh')}
                >
                  保存中文文稿
                </Button>
                <Button
                  icon={<DownloadOutlined />}
                  disabled={segments.length === 0 || extractingPrep}
                  onClick={handleExportSubtitleJson}
                >
                  导出字幕轴 JSON
                </Button>
                <Button
                  type="primary"
                  icon={<DownloadOutlined />}
                  disabled={!asset || segments.length === 0 || dirty || extractingPrep}
                  onClick={handleExportSelfStudyV2Json}
                >
                  导出自学课 JSON（V2）
                </Button>
                <Button
                  icon={<ImportOutlined />}
                  disabled={extractingPrep}
                  onClick={handleImportSubtitleJsonClick}
                >
                  导入字幕轴 JSON
                </Button>
                <Button disabled={extractingPrep} onClick={() => setPickerOpen(true)}>更换视频</Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={saving}
                  disabled={!dirty || extractingPrep}
                  onClick={() => void handleSave()}
                >
                  保存字幕
                </Button>
              </>
            ) : (
              <Button type="primary" icon={<ImportOutlined />} onClick={() => setPickerOpen(true)}>
                导入素材库视频
              </Button>
            )}
          </Space>
        </Col>
      </Row>

      <Tabs
        items={[
          {
            key: 'editor',
            label: '打轴编辑',
            children: !asset ? (
              <Card>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="尚未选择视频"
                >
                  <Button type="primary" icon={<ImportOutlined />} onClick={() => setPickerOpen(true)}>
                    从素材库选择视频
                  </Button>
                </Empty>
              </Card>
            ) : (
              <Spin spinning={loadingAsset || loadingSubtitle || loadingMetadata}>
                <Row gutter={16}>
                  <Col xs={24} lg={14}>
                    <Card
                      title="视频预览"
                      size="small"
                      extra={
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          播放位置 {formatMs(currentTimeMs)}
                        </Text>
                      }
                    >
                      {playUrl ? (
                        <div style={{ position: 'relative' }}>
                          <DittoVideoPlayer
                            ref={playerRef}
                            url={playUrl}
                            isVisible
                            autoplay={false}
                            onTimeUpdate={handleTimeUpdate}
                          />
                          {overlayText?.trim() ? (
                            <div
                              style={{
                                position: 'absolute',
                                left: '3%',
                                right: '3%',
                                top: '8%',
                                zIndex: 2,
                                padding: '10px 14px',
                                borderRadius: 6,
                                background: 'rgba(0,0,0,0.72)',
                                color: '#fff',
                                fontSize: 'clamp(13px, 2vw, 17px)',
                                lineHeight: 1.55,
                                textAlign: 'center',
                                pointerEvents: 'none',
                                maxHeight: '42%',
                                overflow: 'auto',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                              }}
                            >
                              {overlayText}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <Empty description="无法加载视频" />
                      )}
                      <Space style={{ marginTop: 12 }}>
                        <Button icon={<PlusOutlined />} disabled={extractingPrep} onClick={handleAddAtCurrentTime}>
                          在当前位置添加字幕
                        </Button>
                        {activeIndex >= 0 ? (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            当前句：#{activeIndex + 1}
                          </Text>
                        ) : null}
                      </Space>
                    </Card>
                  </Col>

                  <Col xs={24} lg={10} style={{ display: 'flex' }}>
                    <Card
                      title={prepMode ? '字幕轴 · 备课模式' : '字幕轴'}
                      size="small"
                      style={{ flex: 1, minWidth: 0 }}
                      styles={{ body: { display: 'flex', flexDirection: 'column', minHeight: 0 } }}
                    >
                      {prepMode ? (
                        <Alert
                          type="info"
                          showIcon
                          message="备课模式已开启"
                          description="可为每句字幕添加备注、单词、词组与句型。开启时会尝试从已有元数据读取；编辑后先「保存字幕」，再点「保存到元数据」写入自学课知识库。"
                          style={{ marginBottom: 12 }}
                        />
                      ) : null}
                      {segments.length === 0 ? (
                        <Alert
                          type="info"
                          showIcon
                          message="该视频暂无字幕"
                          description="可点击「在当前位置添加字幕」手动创建，或在素材库中先提交 ASR 识别任务。"
                          style={{ marginBottom: 12 }}
                        />
                      ) : null}
                      {prepMode && (extractingPrep || prepExtractLogs.length > 0) ? (
                        <Card
                          size="small"
                          title="LLM 提取进度"
                          style={{ marginBottom: 12 }}
                          extra={extractingPrep ? (
                            <Button size="small" danger onClick={handleCancelPrepExtract}>
                              取消任务
                            </Button>
                          ) : (
                            <Tag color={
                              prepExtractStatus === 'done'
                                ? 'green'
                                : prepExtractStatus === 'error'
                                  ? 'red'
                                  : prepExtractStatus === 'cancelled'
                                    ? 'orange'
                                    : 'blue'
                            }
                            >
                              {prepExtractStatus === 'done'
                                ? '已完成'
                                : prepExtractStatus === 'error'
                                  ? '失败'
                                  : prepExtractStatus === 'cancelled'
                                    ? '已取消'
                                    : '处理中'}
                            </Tag>
                          )}
                        >
                          <Space direction="vertical" style={{ width: '100%' }} size={8}>
                            <Progress
                              percent={
                                prepExtractProgress.totalChunks
                                  ? Math.round((prepExtractProgress.doneChunks / prepExtractProgress.totalChunks) * 100)
                                  : 0
                              }
                              status={prepExtractStatus === 'error' ? 'exception' : prepExtractStatus === 'done' ? 'success' : 'active'}
                            />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              已完成 {prepExtractProgress.doneChunks}/{prepExtractProgress.totalChunks || '-'} 批；
                              已新增词组 {prepExtractProgress.phrasesAdded} 条、句型 {prepExtractProgress.expressionsAdded} 条。
                              处理期间字幕编辑区会暂时置灰，已完成批次会自动回填。
                            </Text>
                            <div
                              style={{
                                maxHeight: 220,
                                overflow: 'auto',
                                padding: '8px 10px',
                                border: '1px solid #f0f0f0',
                                borderRadius: 6,
                                background: '#0b1020',
                                color: '#d6e4ff',
                                fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                fontSize: 12,
                                lineHeight: 1.6,
                                whiteSpace: 'pre-wrap',
                              }}
                            >
                              {prepExtractLogs.join('\n') || '等待任务开始...'}
                            </div>
                          </Space>
                        </Card>
                      ) : null}
                      <VideoSubtitleEditor
                        label="字幕段列表"
                        layout="timing"
                        prepMode={prepMode}
                        disabled={extractingPrep}
                        segments={segments}
                        activeIndex={activeIndex}
                        onSeekToSegment={handleSeekToSegment}
                        onChange={handleSegmentsChange}
                        listMaxHeight="calc(100vh - 300px)"
                      />
                    </Card>
                  </Col>
                </Row>
              </Spin>
            ),
          },
          {
            key: 'prep-prompts',
            label: 'Prompt 管理',
            children: <PrepPromptManager />,
          },
        ]}
      />

      <AssetPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(selected) => void handleSelectAsset(selected)}
      />
      <input
        ref={subtitleJsonInputRef}
        type="file"
        accept="application/json,.json"
        style={{ display: 'none' }}
        onChange={(event) => void handleImportSubtitleJsonFile(event)}
      />
    </div>
  )
}
