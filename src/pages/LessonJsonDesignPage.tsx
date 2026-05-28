import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  ATB_ACT_TYPES,
  type AtbActType,
  type AtbLessonDocument,
  type LessonMetadata,
  type LessonScriptNode,
  buildNewNode,
  createDefaultMetadata,
  createEmptyLesson,
  DRAFT_STORAGE_KEY,
  parseLessonImport,
  renumberPrioritiesByOrder,
  stringifyLesson,
  suggestParentTreeId,
  validateLessonDocument,
  DEFAULT_POSITIVE_FEEDBACK_AUDIOS,
} from '../types/atbLessonScript'
import { lessonDesignApi } from '../api/lessonDesign'
import { assetsApi, type MinimaxTtsRequest } from '../api/assets'
import ImageOssUploadField from '../components/ImageOssUploadField'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

type NodeModalMode = 'add' | 'edit'

interface NodeFormShape {
  tree_id: number
  parent_tree_id: number
  act_type: AtbActType
  actor: 'Tutor' | 'Student'
  priority: number
  url?: string
  text_en?: string
  text_zh?: string
  audio_url?: string
  audio_duration?: number
  image_url?: string
  image_width?: number
  image_height?: number
  start_time?: number
  end_time?: number
  scenario_key?: string
  task_type?: string
  quote_en?: string
  quote_zh?: string
  opening_prompt_en?: string
  opening_prompt_zh?: string
  opening_audio_url?: string
  vocabulary_hints?: Array<{ term_en?: string; phrase_en?: string; gloss_zh?: string }>
  context_lines_text?: string
  max_student_turns?: number
  max_llm_calls?: number
  max_extension_rounds?: number
  tts_enabled?: boolean
  tts_voice_id?: string
  tts_model?: string
  tts_speed?: number
  tts_vol?: number
  tts_pitch?: number
  tts_emotion?: string
  options?: Array<{ text_en: string; text_zh: string; next_tree_id: number }>
  language?: string
  positive_feedback_audios?: Array<{ text_en: string; audio_url: string }>
}

function nodeToFormValues(n: LessonScriptNode): NodeFormShape {
  const p = n.payload
  const base: NodeFormShape = {
    tree_id: n.tree_id,
    parent_tree_id: n.parent_tree_id,
    act_type: n.act_type,
    actor: n.actor,
    priority: n.priority,
  }
  switch (n.act_type) {
    case 'IntroMusic':
      return { ...base, url: String(p.url ?? '') }
    case 'CUI-Bubble':
      return {
        ...base,
        text_en: String(p.text_en ?? ''),
        text_zh: String(p.text_zh ?? ''),
        audio_url: String(p.audio_url ?? ''),
        audio_duration: typeof p.audio_duration === 'number' ? p.audio_duration : 0,
      }
    case 'ShowImage':
      return {
        ...base,
        image_url: String(p.image_url ?? ''),
        image_width: typeof p.image_width === 'number' ? p.image_width : 0,
        image_height: typeof p.image_height === 'number' ? p.image_height : 0,
      }
    case 'CUI-Card-ChoiceSingle': {
      const opts = Array.isArray(p.options) ? p.options : []
      return {
        ...base,
        options: opts.map((o) => ({
          text_en: String((o as { text_en?: string }).text_en ?? ''),
          text_zh: String((o as { text_zh?: string }).text_zh ?? ''),
          next_tree_id: typeof (o as { next_tree_id?: number }).next_tree_id === 'number'
            ? (o as { next_tree_id: number }).next_tree_id
            : 0,
        })),
      }
    }
    case 'PlayVideo':
      return {
        ...base,
        start_time: typeof p.start_time === 'number' ? p.start_time : 0,
        end_time: typeof p.end_time === 'number' ? p.end_time : 0,
      }
    case 'CUI-FreeTalk-Practice': {
      const lines = Array.isArray(p.context_lines_en) ? (p.context_lines_en as string[]) : []
      const hints = Array.isArray(p.vocabulary_hints) ? p.vocabulary_hints : []
      const tts = p.tts && typeof p.tts === 'object' ? (p.tts as Record<string, unknown>) : {}
      return {
        ...base,
        scenario_key: String(p.scenario_key ?? ''),
        task_type: String(p.task_type ?? 'video_quote'),
        quote_en: String(p.quote_en ?? ''),
        quote_zh: String(p.quote_zh ?? ''),
        opening_prompt_en: String(p.opening_prompt_en ?? ''),
        opening_prompt_zh: String(p.opening_prompt_zh ?? ''),
        opening_audio_url: String(p.opening_audio_url ?? ''),
        vocabulary_hints: hints.map((h) => {
          const row = h as { term_en?: string; phrase_en?: string; gloss_zh?: string }
          return {
            term_en: String(row.term_en ?? ''),
            phrase_en: String(row.phrase_en ?? ''),
            gloss_zh: String(row.gloss_zh ?? ''),
          }
        }),
        context_lines_text: lines.join('\n'),
        max_student_turns: typeof p.max_student_turns === 'number' ? p.max_student_turns : 8,
        max_llm_calls: typeof p.max_llm_calls === 'number' ? p.max_llm_calls : 12,
        max_extension_rounds: typeof p.max_extension_rounds === 'number' ? p.max_extension_rounds : 1,
        tts_enabled: tts.enabled !== false,
        tts_voice_id: String(tts.voice_id ?? 'ZxueliLLS'),
        tts_model: String(tts.model ?? 'speech-2.8-hd'),
        tts_speed: typeof tts.speed === 'number' ? tts.speed : 1,
        tts_vol: typeof tts.vol === 'number' ? tts.vol : 1,
        tts_pitch: typeof tts.pitch === 'number' ? tts.pitch : 0,
        tts_emotion: String(tts.emotion ?? 'happy'),
      }
    }
    case 'CUI-FollowReading': {
      const audios = Array.isArray(p.positive_feedback_audios) ? p.positive_feedback_audios : []
      const normalized = DEFAULT_POSITIVE_FEEDBACK_AUDIOS.map((fallback, index) => {
        const item = audios[index] as { text_en?: string; audio_url?: string } | undefined
        return {
          text_en: String(item?.text_en ?? fallback.text_en),
          audio_url: String(item?.audio_url ?? ''),
        }
      })
      return {
        ...base,
        text_en: String(p.text_en ?? ''),
        text_zh: String(p.text_zh ?? ''),
        language: String(p.language ?? 'en_us'),
        positive_feedback_audios: normalized,
      }
    }
    default:
      return base
  }
}

function formValuesToPayload(act: AtbActType, v: NodeFormShape): Record<string, unknown> {
  switch (act) {
    case 'IntroMusic':
      return { url: v.url ?? '' }
    case 'CUI-Bubble':
      return {
        text_en: v.text_en ?? '',
        text_zh: v.text_zh ?? '',
        audio_url: v.audio_url ?? '',
        audio_duration: v.audio_duration ?? 0,
      }
    case 'ShowImage':
      return {
        image_url: v.image_url ?? '',
        image_width: v.image_width ?? 0,
        image_height: v.image_height ?? 0,
      }
    case 'CUI-Card-ChoiceSingle':
      return {
        options: (v.options ?? []).map((o) => ({
          text_en: o.text_en ?? '',
          text_zh: o.text_zh ?? '',
          next_tree_id: typeof o.next_tree_id === 'number' ? o.next_tree_id : 0,
        })),
      }
    case 'PlayVideo':
      return {
        start_time: v.start_time ?? 0,
        end_time: v.end_time ?? 0,
      }
    case 'CUI-FreeTalk-Practice': {
      const raw = v.context_lines_text ?? ''
      const context_lines_en = raw
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
      const hintsRaw = Array.isArray(v.vocabulary_hints) ? v.vocabulary_hints : []
      const vocabulary_hints = hintsRaw
        .map((h) => {
          const row = h as { term_en?: string; phrase_en?: string; gloss_zh?: string }
          const term = String(row.term_en ?? '').trim()
          const phrase = String(row.phrase_en ?? '').trim()
          const gloss = String(row.gloss_zh ?? '').trim()
          if (phrase) return { phrase_en: phrase, gloss_zh: gloss }
          if (term) return { term_en: term, gloss_zh: gloss }
          return null
        })
        .filter(Boolean)
      return {
        scenario_key: v.scenario_key ?? '',
        task_type: v.task_type ?? 'video_quote',
        quote_en: v.quote_en ?? '',
        quote_zh: v.quote_zh ?? '',
        opening_prompt_en: v.opening_prompt_en ?? '',
        opening_prompt_zh: v.opening_prompt_zh ?? '',
        opening_audio_url: v.opening_audio_url ?? '',
        vocabulary_hints,
        context_lines_en: context_lines_en.length ? context_lines_en : [''],
        max_student_turns: v.max_student_turns ?? 8,
        max_llm_calls: v.max_llm_calls ?? 12,
        max_extension_rounds: v.max_extension_rounds ?? 1,
        tts: {
          enabled: v.tts_enabled !== false,
          voice_id: v.tts_voice_id ?? 'ZxueliLLS',
          model: v.tts_model ?? 'speech-2.8-hd',
          speed: v.tts_speed ?? 1,
          vol: v.tts_vol ?? 1,
          pitch: v.tts_pitch ?? 0,
          emotion: v.tts_emotion ?? 'happy',
        },
      }
    }
    case 'CUI-FollowReading':
      return {
        text_en: v.text_en ?? '',
        text_zh: v.text_zh ?? '',
        language: v.language ?? 'en_us',
        positive_feedback_audios: (v.positive_feedback_audios ?? DEFAULT_POSITIVE_FEEDBACK_AUDIOS).map((item) => ({
          text_en: item.text_en ?? '',
          audio_url: item.audio_url ?? '',
        })),
      }
    default: {
      const _e: never = act
      return _e
    }
  }
}

function useDebouncedEffect(fn: () => void, deps: unknown[], ms: number) {
  const t = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (t.current) clearTimeout(t.current)
    t.current = setTimeout(fn, ms)
    return () => {
      if (t.current) clearTimeout(t.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce deps passed explicitly
  }, deps)
}

export default function LessonJsonDesignPage() {
  const [metaForm] = Form.useForm<LessonMetadata>()
  const [nodes, setNodes] = useState<LessonScriptNode[]>([])
  const [importText, setImportText] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  const [nodeModalOpen, setNodeModalOpen] = useState(false)
  const [nodeModalMode, setNodeModalMode] = useState<NodeModalMode>('add')
  const [editingTreeId, setEditingTreeId] = useState<number | null>(null)
  const [nodeForm] = Form.useForm<NodeFormShape>()
  const [addActType, setAddActType] = useState<AtbActType>('CUI-Bubble')
  const [aiTranslating, setAiTranslating] = useState<string | null>(null)
  const [minimaxVoiceId, setMinimaxVoiceId] = useState('')
  const [minimaxLoading, setMinimaxLoading] = useState(false)

  const metaWatch = Form.useWatch([], metaForm)

  const runAiTranslate = async (
    taskKey: string,
    direction: 'en_to_zh' | 'zh_to_en',
    source: string,
    apply: (translated: string) => void,
  ) => {
    const s = source.trim()
    if (!s) {
      message.warning(direction === 'en_to_zh' ? '请先填写英文内容' : '请先填写中文内容')
      return
    }
    setAiTranslating(taskKey)
    try {
      const { translated } = await lessonDesignApi.translateLessonText({ direction, text: s })
      apply(translated)
      message.success('已覆盖写入翻译')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      const d = err?.response?.data?.detail
      message.error(typeof d === 'string' ? d : '翻译失败')
    } finally {
      setAiTranslating(null)
    }
  }

  const runMinimaxTts = async () => {
    const text = String(nodeForm.getFieldValue('text_en') ?? '').trim()
    if (!text) {
      message.warning('请先填写 text_en')
      return
    }
    setMinimaxLoading(true)
    try {
      const req: MinimaxTtsRequest = { text }
      const vid = minimaxVoiceId.trim()
      if (vid) req.voice_id = vid
      const res = await assetsApi.minimaxTts(req)
      const patch: { audio_url: string; audio_duration?: number } = { audio_url: res.audio_url }
      if (res.audio_duration != null && !Number.isNaN(res.audio_duration)) {
        patch.audio_duration = res.audio_duration
      }
      nodeForm.setFieldsValue(patch)
      message.success('已写入 audio_url')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      const d = err?.response?.data?.detail
      message.error(typeof d === 'string' ? d : '配音失败')
    } finally {
      setMinimaxLoading(false)
    }
  }

  const runMinimaxOpeningTts = async () => {
    const text = String(nodeForm.getFieldValue('opening_prompt_en') ?? '').trim()
    if (!text) {
      message.warning('请先填写 opening_prompt_en')
      return
    }
    setMinimaxLoading(true)
    try {
      const req: MinimaxTtsRequest = { text }
      const vid = String(nodeForm.getFieldValue('tts_voice_id') ?? minimaxVoiceId).trim()
      if (vid) req.voice_id = vid
      const res = await assetsApi.minimaxTts(req)
      nodeForm.setFieldsValue({ opening_audio_url: res.audio_url })
      message.success('已写入 opening_audio_url')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      const d = err?.response?.data?.detail
      message.error(typeof d === 'string' ? d : '开场配音失败')
    } finally {
      setMinimaxLoading(false)
    }
  }

  const runMinimaxPositiveFeedbackTts = async () => {
    const audios = (nodeForm.getFieldValue('positive_feedback_audios') ?? []) as Array<{
      text_en?: string
      audio_url?: string
    }>
    const vid = minimaxVoiceId.trim()
    setMinimaxLoading(true)
    try {
      const next = [...audios]
      for (let i = 0; i < 3; i++) {
        const text = String(next[i]?.text_en ?? '').trim()
        if (!text) {
          message.warning(`请先填写肯定反馈 ${i + 1} 的 text_en`)
          return
        }
        const req: MinimaxTtsRequest = { text }
        if (vid) req.voice_id = vid
        const res = await assetsApi.minimaxTts(req)
        next[i] = { ...next[i], text_en: text, audio_url: res.audio_url }
      }
      nodeForm.setFieldsValue({ positive_feedback_audios: next })
      message.success('已为 3 条肯定反馈生成语音')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      const d = err?.response?.data?.detail
      message.error(typeof d === 'string' ? d : '批量配音失败')
    } finally {
      setMinimaxLoading(false)
    }
  }

  const patchOptionField = (
    optionIndex: number,
    patch: Partial<{ text_en: string; text_zh: string; next_tree_id: number }>,
  ) => {
    const opts = [...(nodeForm.getFieldValue('options') || [])] as Array<{
      text_en: string
      text_zh: string
      next_tree_id: number
    }>
    if (!opts[optionIndex]) return
    opts[optionIndex] = { ...opts[optionIndex], ...patch }
    nodeForm.setFieldsValue({ options: opts })
  }

  const fullDoc: AtbLessonDocument = useMemo(
    () => ({
      metadata: { ...createDefaultMetadata(), ...(metaWatch || {}) } as LessonMetadata,
      nodes,
    }),
    [metaWatch, nodes],
  )

  const jsonPreview = useMemo(() => stringifyLesson(fullDoc), [fullDoc])
  const validationIssues = useMemo(() => validateLessonDocument(fullDoc), [fullDoc])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY)
      if (raw) {
        const doc = parseLessonImport(raw)
        metaForm.setFieldsValue(doc.metadata)
        setNodes(doc.nodes)
      } else {
        const empty = createEmptyLesson()
        metaForm.setFieldsValue(empty.metadata)
        setNodes(empty.nodes)
      }
    } catch {
      const empty = createEmptyLesson()
      metaForm.setFieldsValue(empty.metadata)
      setNodes(empty.nodes)
    }
    setHydrated(true)
  }, [metaForm])

  useDebouncedEffect(
    () => {
      if (!hydrated) return
      try {
        localStorage.setItem(DRAFT_STORAGE_KEY, jsonPreview)
      } catch {
        /* ignore quota */
      }
    },
    [jsonPreview, hydrated],
    500,
  )

  const parentOptions = useMemo(
    () => [
      { value: 0, label: '0（根）' },
      ...nodes.map((n) => ({ value: n.tree_id, label: `${n.tree_id} — ${n.act_type}` })),
    ],
    [nodes],
  )

  const openAddModal = () => {
    setNodeModalMode('add')
    setEditingTreeId(null)
    const parent = suggestParentTreeId(nodes)
    const draft = buildNewNode(nodes, addActType, { parent_tree_id: parent })
    nodeForm.setFieldsValue(nodeToFormValues(draft))
    setNodeModalOpen(true)
  }

  const openEditModal = (n: LessonScriptNode) => {
    setNodeModalMode('edit')
    setEditingTreeId(n.tree_id)
    nodeForm.setFieldsValue(nodeToFormValues(n))
    setNodeModalOpen(true)
  }

  const handleNodeModalOk = async () => {
    try {
      const v = await nodeForm.validateFields()
      const payload = formValuesToPayload(v.act_type, v)
      const next: LessonScriptNode = {
        tree_id: v.tree_id,
        parent_tree_id: v.parent_tree_id,
        act_type: v.act_type,
        actor: v.actor,
        priority: v.priority,
        payload,
      }
      if (nodeModalMode === 'add') {
        if (nodes.some((x) => x.tree_id === next.tree_id)) {
          message.error('tree_id 已存在')
          return
        }
        setNodes((prev) => [...prev, next])
      } else {
        setNodes((prev) => prev.map((x) => (x.tree_id === editingTreeId ? next : x)))
      }
      setNodeModalOpen(false)
      message.success(nodeModalMode === 'add' ? '已添加节点' : '已保存节点')
    } catch {
      /* validate */
    }
  }

  const deleteNode = (treeId: number) => {
    Modal.confirm({
      title: '删除节点？',
      content: `将删除 tree_id=${treeId}，请自行检查分支引用。`,
      onOk: () => setNodes((prev) => prev.filter((x) => x.tree_id !== treeId)),
    })
  }

  const moveNode = (treeId: number, dir: -1 | 1) => {
    setNodes((prev) => {
      const i = prev.findIndex((x) => x.tree_id === treeId)
      if (i < 0) return prev
      const j = i + dir
      if (j < 0 || j >= prev.length) return prev
      const copy = [...prev]
      ;[copy[i], copy[j]] = [copy[j], copy[i]]
      return copy
    })
  }

  const handleImport = () => {
    try {
      const doc = parseLessonImport(importText)
      metaForm.setFieldsValue(doc.metadata)
      setNodes(doc.nodes)
      setImportOpen(false)
      setImportText('')
      message.success('导入成功')
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : 'JSON 解析失败')
    }
  }

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(jsonPreview)
      message.success('已复制到剪贴板')
    } catch {
      message.error('复制失败')
    }
  }

  const downloadJson = () => {
    const blob = new Blob([jsonPreview], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'lesson.json'
    a.click()
    URL.revokeObjectURL(url)
    message.success('已开始下载')
  }

  const resetDraft = () => {
    Modal.confirm({
      title: '清空草稿？',
      onOk: () => {
        const empty = createEmptyLesson()
        metaForm.setFieldsValue(empty.metadata)
        setNodes(empty.nodes)
        localStorage.removeItem(DRAFT_STORAGE_KEY)
        message.success('已重置')
      },
    })
  }

  const columns: ColumnsType<LessonScriptNode> = [
    { title: 'tree_id', dataIndex: 'tree_id', width: 90 },
    { title: 'parent', dataIndex: 'parent_tree_id', width: 90 },
    { title: 'act_type', dataIndex: 'act_type', ellipsis: true },
    { title: 'actor', dataIndex: 'actor', width: 100 },
    { title: 'priority', dataIndex: 'priority', width: 90 },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      render: (_, row) => (
        <Space size="small" wrap>
          <Button type="link" size="small" onClick={() => openEditModal(row)}>
            编辑
          </Button>
          <Button type="link" size="small" onClick={() => moveNode(row.tree_id, -1)}>
            上移
          </Button>
          <Button type="link" size="small" onClick={() => moveNode(row.tree_id, 1)}>
            下移
          </Button>
          <Button type="link" size="small" danger onClick={() => deleteNode(row.tree_id)}>
            删除
          </Button>
        </Space>
      ),
    },
  ]

  const watchedAct = Form.useWatch('act_type', nodeForm) as AtbActType | undefined

  const renderPayloadFields = () => {
    const act = watchedAct ?? 'CUI-Bubble'
    switch (act) {
      case 'IntroMusic':
        return (
          <Form.Item name="url" label="url" rules={[{ required: true }]}>
            <Input placeholder="https://..." />
          </Form.Item>
        )
      case 'CUI-Bubble':
        return (
          <>
            <Form.Item
              name="text_en"
              label="text_en"
              extra={
                <Button
                  type="link"
                  size="small"
                  style={{ paddingLeft: 0 }}
                  loading={aiTranslating === 'bubble:en2zh'}
                  onClick={() =>
                    runAiTranslate(
                      'bubble:en2zh',
                      'en_to_zh',
                      String(nodeForm.getFieldValue('text_en') ?? ''),
                      (t) => nodeForm.setFieldsValue({ text_zh: t }),
                    )
                  }
                >
                  AI：英译中并覆盖 text_zh
                </Button>
              }
            >
              <TextArea rows={3} />
            </Form.Item>
            <Form.Item
              name="text_zh"
              label="text_zh"
              extra={
                <Button
                  type="link"
                  size="small"
                  style={{ paddingLeft: 0 }}
                  loading={aiTranslating === 'bubble:zh2en'}
                  onClick={() =>
                    runAiTranslate(
                      'bubble:zh2en',
                      'zh_to_en',
                      String(nodeForm.getFieldValue('text_zh') ?? ''),
                      (t) => nodeForm.setFieldsValue({ text_en: t }),
                    )
                  }
                >
                  AI：中译英并覆盖 text_en
                </Button>
              }
            >
              <TextArea rows={3} />
            </Form.Item>
            <Form.Item
              name="audio_url"
              label="audio_url"
              extra={
                <Space wrap align="center" style={{ marginTop: 4 }}>
                  <Text type="secondary">Minimax voice_id（可选）</Text>
                  <Input
                    style={{ width: 200 }}
                    placeholder="默认 ZxueliLLS"
                    value={minimaxVoiceId}
                    onChange={(e) => setMinimaxVoiceId(e.target.value)}
                  />
                  <Button type="primary" loading={minimaxLoading} onClick={() => void runMinimaxTts()}>
                    Minimax 配音并写入
                  </Button>
                </Space>
              }
            >
              <Input />
            </Form.Item>
            <Form.Item name="audio_duration" label="audio_duration">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </>
        )
      case 'ShowImage':
        return (
          <>
            <Form.Item
              name="image_url"
              label="image_url"
              extra="可手动填写 URL，或上传图片自动写入 OSS 地址"
            >
              <ImageOssUploadField
                onUploaded={({ url, width, height }) =>
                  nodeForm.setFieldsValue({
                    image_url: url,
                    image_width: width,
                    image_height: height,
                  })
                }
              />
            </Form.Item>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="image_width" label="image_width">
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="image_height" label="image_height">
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
              </Col>
            </Row>
          </>
        )
      case 'CUI-Card-ChoiceSingle':
        return (
          <Form.List name="options">
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: '100%' }}>
                {fields.map((f) => (
                  <Card key={f.key} size="small" title={`选项 ${f.name + 1}`}>
                    <Form.Item
                      name={[f.name, 'text_en']}
                      label="text_en"
                      extra={
                        <Button
                          type="link"
                          size="small"
                          style={{ paddingLeft: 0 }}
                          loading={aiTranslating === `opt:${f.name}:en2zh`}
                          onClick={() =>
                            runAiTranslate(
                              `opt:${f.name}:en2zh`,
                              'en_to_zh',
                              String(nodeForm.getFieldValue(['options', f.name, 'text_en']) ?? ''),
                              (t) => patchOptionField(f.name, { text_zh: t }),
                            )
                          }
                        >
                          AI：英译中并覆盖 text_zh
                        </Button>
                      }
                    >
                      <Input />
                    </Form.Item>
                    <Form.Item
                      name={[f.name, 'text_zh']}
                      label="text_zh"
                      extra={
                        <Button
                          type="link"
                          size="small"
                          style={{ paddingLeft: 0 }}
                          loading={aiTranslating === `opt:${f.name}:zh2en`}
                          onClick={() =>
                            runAiTranslate(
                              `opt:${f.name}:zh2en`,
                              'zh_to_en',
                              String(nodeForm.getFieldValue(['options', f.name, 'text_zh']) ?? ''),
                              (t) => patchOptionField(f.name, { text_en: t }),
                            )
                          }
                        >
                          AI：中译英并覆盖 text_en
                        </Button>
                      }
                    >
                      <Input />
                    </Form.Item>
                    <Form.Item name={[f.name, 'next_tree_id']} label="next_tree_id">
                      <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                    <Button danger size="small" onClick={() => remove(f.name)}>
                      移除此选项
                    </Button>
                  </Card>
                ))}
                <Button type="dashed" onClick={() => add({ text_en: '', text_zh: '', next_tree_id: 0 })}>
                  添加选项
                </Button>
              </Space>
            )}
          </Form.List>
        )
      case 'PlayVideo':
        return (
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="start_time" label="start_time (ms)">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="end_time" label="end_time (ms)">
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
          </Row>
        )
      case 'CUI-FollowReading':
        return (
          <>
            <Form.Item
              name="text_en"
              label="跟读句子 text_en"
              rules={[{ required: true, message: '请填写跟读英文句子' }]}
            >
              <TextArea rows={2} />
            </Form.Item>
            <Form.Item name="text_zh" label="跟读句子 text_zh">
              <TextArea rows={2} />
            </Form.Item>
            <Form.Item name="language" label="language" extra="评测语言，默认 en_us">
              <Input placeholder="en_us" />
            </Form.Item>
            <Paragraph type="secondary" style={{ marginBottom: 8 }}>
              4 分及以上时，学员端会从以下 3 条肯定反馈中随机播放 1 条语音（请提前生成并填写 audio_url）。
            </Paragraph>
            <Form.List name="positive_feedback_audios">
              {(fields) => (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {fields.map((f, index) => (
                    <Card key={f.key} size="small" title={`肯定反馈 ${index + 1}`}>
                      <Form.Item
                        name={[f.name, 'text_en']}
                        label="text_en"
                        rules={[{ required: true, message: '请填写反馈文案' }]}
                      >
                        <TextArea rows={2} />
                      </Form.Item>
                      <Form.Item name={[f.name, 'audio_url']} label="audio_url">
                        <Input placeholder="https://..." />
                      </Form.Item>
                    </Card>
                  ))}
                </Space>
              )}
            </Form.List>
            <Space wrap align="center">
              <Text type="secondary">Minimax voice_id（可选）</Text>
              <Input
                style={{ width: 200 }}
                placeholder="默认 ZxueliLLS"
                value={minimaxVoiceId}
                onChange={(e) => setMinimaxVoiceId(e.target.value)}
              />
              <Button type="primary" loading={minimaxLoading} onClick={() => void runMinimaxPositiveFeedbackTts()}>
                批量为 3 条肯定反馈配音
              </Button>
            </Space>
          </>
        )
      case 'CUI-FreeTalk-Practice':
        return (
          <>
            <Form.Item name="scenario_key" label="scenario_key">
              <Input />
            </Form.Item>
            <Form.Item name="task_type" label="task_type">
              <Select
                options={[
                  { value: 'video_quote', label: 'video_quote（视频金句复述）' },
                  { value: 'concept_explain', label: 'concept_explain（概念/成语解释）' },
                ]}
              />
            </Form.Item>
            <Form.Item name="quote_en" label="quote_en">
              <TextArea rows={2} />
            </Form.Item>
            <Form.Item name="quote_zh" label="quote_zh">
              <TextArea rows={2} />
            </Form.Item>
            <Form.Item name="opening_prompt_en" label="opening_prompt_en">
              <TextArea rows={3} placeholder="导师开场白（英文 markdown）" />
            </Form.Item>
            <Form.Item name="opening_prompt_zh" label="opening_prompt_zh">
              <TextArea rows={2} placeholder="可选" />
            </Form.Item>
            <Form.Item name="opening_audio_url" label="opening_audio_url">
              <Input placeholder="预生成开场音频；留空则学习端动态 TTS" />
            </Form.Item>
            <Button
              type="default"
              loading={minimaxLoading}
              onClick={() => void runMinimaxOpeningTts()}
              style={{ marginBottom: 12 }}
            >
              为开场生成 TTS（写入 opening_audio_url）
            </Button>
            <Form.List name="vocabulary_hints">
              {(fields, { add, remove }) => (
                <>
                  <Typography.Text strong>vocabulary_hints</Typography.Text>
                  {fields.map((f) => (
                    <Card key={f.key} size="small" style={{ marginTop: 8 }}>
                      <Row gutter={8}>
                        <Col span={7}>
                          <Form.Item name={[f.name, 'term_en']} label="term_en">
                            <Input placeholder="chaotic" />
                          </Form.Item>
                        </Col>
                        <Col span={7}>
                          <Form.Item name={[f.name, 'phrase_en']} label="phrase_en">
                            <Input placeholder="challenge the ..." />
                          </Form.Item>
                        </Col>
                        <Col span={7}>
                          <Form.Item name={[f.name, 'gloss_zh']} label="gloss_zh">
                            <Input placeholder="混乱的" />
                          </Form.Item>
                        </Col>
                        <Col span={3}>
                          <Button danger type="text" onClick={() => remove(f.name)}>
                            删
                          </Button>
                        </Col>
                      </Row>
                    </Card>
                  ))}
                  <Button type="dashed" onClick={() => add({ term_en: '', gloss_zh: '' })} style={{ marginTop: 8 }}>
                    添加词汇提示
                  </Button>
                </>
              )}
            </Form.List>
            <Form.Item
              name="context_lines_text"
              label="context_lines_en（每行一句，LLM 评分 rubric）"
            >
              <TextArea rows={6} placeholder="每行一句英文" />
            </Form.Item>
            <Row gutter={12}>
              <Col span={8}>
                <Form.Item name="max_student_turns" label="max_student_turns">
                  <InputNumber style={{ width: '100%' }} min={1} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="max_llm_calls" label="max_llm_calls">
                  <InputNumber style={{ width: '100%' }} min={1} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="max_extension_rounds" label="max_extension_rounds">
                  <InputNumber style={{ width: '100%' }} min={0} />
                </Form.Item>
              </Col>
            </Row>
            <Typography.Text strong style={{ display: 'block', marginTop: 8 }}>
              tts（学习端动态配音）
            </Typography.Text>
            <Form.Item name="tts_enabled" label="enabled" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="tts_voice_id" label="voice_id">
                  <Input placeholder="ZxueliLLS" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="tts_model" label="model">
                  <Input placeholder="speech-2.8-hd" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={12}>
              <Col span={6}>
                <Form.Item name="tts_speed" label="speed">
                  <InputNumber style={{ width: '100%' }} min={0.5} max={2} step={0.1} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="tts_vol" label="vol">
                  <InputNumber style={{ width: '100%' }} min={0} max={10} step={0.1} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="tts_pitch" label="pitch">
                  <InputNumber style={{ width: '100%' }} min={-12} max={12} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item name="tts_emotion" label="emotion">
                  <Input placeholder="happy" />
                </Form.Item>
              </Col>
            </Row>
          </>
        )
      default:
        return null
    }
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div>
        <Title level={3} style={{ marginBottom: 4 }}>
          课程 JSON 设计（调试）
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          按节点编辑与 lesson mock 同构的 JSON，用于开发调试。草稿自动保存在本机浏览器。
          节点表单中 text_en / text_zh 支持调用服务端统一 LLM 做 AI 翻译并覆盖另一侧字段（需配置 UNIFIED_LLM_*）。
          定稿后请复制或下载 JSON，到课程管理 → 对应里程碑的课节列表中，打开 ATB 课节的「脚本 JSON」写入服务端。
        </Paragraph>
      </div>

      {validationIssues.length > 0 && (
        <Alert
          type="warning"
          showIcon
          message="结构提示（不阻止导出）"
          description={
            <ul style={{ marginBottom: 0, paddingLeft: 18 }}>
              {validationIssues.map((it, i) => (
                <li key={i}>{it.message}</li>
              ))}
            </ul>
          }
        />
      )}

      <Row gutter={16}>
        <Col xs={24} lg={12}>
          <Card title="metadata" size="small">
            <Form form={metaForm} layout="vertical" size="small">
              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item name="title_en" label="title_en">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="title_zh" label="title_zh">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item name="description_en" label="description_en">
                    <TextArea rows={2} />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item name="description_zh" label="description_zh">
                    <TextArea rows={2} />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item name="cover_url" label="cover_url">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="cover_width" label="cover_width">
                    <InputNumber style={{ width: '100%' }} min={0} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="cover_height" label="cover_height">
                    <InputNumber style={{ width: '100%' }} min={0} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="tutor_name" label="tutor_name">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="student_name" label="student_name">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item name="tutor_avatar" label="tutor_avatar">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item name="student_avatar" label="student_avatar">
                    <Input />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item name="video_url" label="video_url">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title="JSON 预览与操作"
            size="small"
            extra={
              <Space wrap>
                <Button size="small" onClick={() => setImportOpen(true)}>
                  导入 JSON
                </Button>
                <Button size="small" onClick={copyJson}>
                  复制
                </Button>
                <Button size="small" type="primary" onClick={downloadJson}>
                  下载 lesson.json
                </Button>
                <Button size="small" danger onClick={resetDraft}>
                  清空草稿
                </Button>
              </Space>
            }
          >
            <TextArea readOnly value={jsonPreview} rows={18} style={{ fontFamily: 'monospace', fontSize: 12 }} />
          </Card>
        </Col>
      </Row>

      <Card
        title="nodes"
        size="small"
        extra={
          <Space wrap>
            <Text type="secondary">新增时类型：</Text>
            <Select<AtbActType>
              style={{ width: 220 }}
              value={addActType}
              onChange={setAddActType}
              options={ATB_ACT_TYPES.map((t) => ({ value: t, label: t }))}
            />
            <Button type="primary" onClick={openAddModal}>
              添加节点
            </Button>
            <Button
              onClick={() =>
                setNodes((prev) => renumberPrioritiesByOrder(prev))
              }
            >
              按当前顺序重算 priority
            </Button>
          </Space>
        }
      >
        <Paragraph type="secondary" style={{ marginTop: 0 }}>
          默认规则：新增节点时 tree_id 自动为 max+1，可在编辑中修改；parent 默认接在列表末尾节点之后。
        </Paragraph>
        <Table<LessonScriptNode>
          rowKey="tree_id"
          size="small"
          pagination={false}
          dataSource={nodes}
          columns={columns}
          scroll={{ x: 720 }}
        />
      </Card>

      <Modal
        title={nodeModalMode === 'add' ? '添加节点' : '编辑节点'}
        open={nodeModalOpen}
        onOk={handleNodeModalOk}
        onCancel={() => setNodeModalOpen(false)}
        width={640}
        destroyOnClose
      >
        <Form form={nodeForm} layout="vertical" size="small">
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="tree_id" label="tree_id" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={1} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="parent_tree_id" label="parent_tree_id" rules={[{ required: true }]}>
                <Select options={parentOptions} showSearch optionFilterProp="label" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="priority" label="priority" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={1} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="act_type" label="act_type" rules={[{ required: true }]}>
                <Select
                  disabled={nodeModalMode === 'edit'}
                  options={ATB_ACT_TYPES.map((t) => ({ value: t, label: t }))}
                  onChange={(act: AtbActType) => {
                    const tid = nodeForm.getFieldValue('tree_id')
                    const parent = nodeForm.getFieldValue('parent_tree_id')
                    const pri = nodeForm.getFieldValue('priority')
                    const actor = nodeForm.getFieldValue('actor')
                    const base = buildNewNode(nodes.filter((x) => x.tree_id !== tid), act, {
                      parent_tree_id: typeof parent === 'number' ? parent : suggestParentTreeId(nodes),
                      actor,
                    })
                    if (typeof tid === 'number') base.tree_id = tid
                    if (typeof pri === 'number') base.priority = pri
                    nodeForm.setFieldsValue(nodeToFormValues(base))
                  }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="actor" label="actor" rules={[{ required: true }]}>
                <Select
                  options={[
                    { value: 'Tutor', label: 'Tutor' },
                    { value: 'Student', label: 'Student' },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
          {nodeModalMode === 'add' && (
            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
              添加模式下修改 act_type 会重置 payload 为默认值（保留当前 tree_id / priority / parent）。
            </Text>
          )}
          {renderPayloadFields()}
        </Form>
      </Modal>

      <Modal
        title="从文本导入 JSON"
        open={importOpen}
        onOk={handleImport}
        onCancel={() => setImportOpen(false)}
        width={720}
        okText="导入"
      >
        <TextArea
          rows={14}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="粘贴完整 lesson JSON"
          style={{ fontFamily: 'monospace', fontSize: 12 }}
        />
      </Modal>
    </Space>
  )
}
