import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Form,
  Image,
  Input,
  List,
  Row,
  Select,
  Segmented,
  Space,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd'
import { CopyOutlined, DownloadOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import { coursesApi, type CourseOut } from '../api/courses'
import {
  courseImageComposerApi,
  type CourseImageComposerCreate,
  type CourseImageComposerOut,
} from '../api/courseImageComposer'
import {
  courseImageTemplateApi,
  type CourseImageDefaultParams,
  type CourseImageSafeAreaSpecs,
  type CourseImageStyleLocks,
  type CourseImageTemplateCreate,
  type CourseImageTemplateOut,
  type SafeAreaSpec,
} from '../api/courseImageTemplate'
import {
  lessonImageGenApi,
  type ImageGenerationType,
  type LessonImageGenerationOut,
  type PromptComposerOutput,
} from '../api/lessonImageGen'
import ImageOssUploadField from '../components/ImageOssUploadField'

const { Title, Paragraph, Text } = Typography
const { TextArea } = Input
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const SUBMERGE_TEMPLATE = `Use case: immersive educational explainer image
Asset type: vertical short-video image, no UI
Course style: {{COURSE_STYLE_LOCK}}

Primary request:
Create one finished image for this lesson moment. It should visualize the idea behind the node script, not display the full script.

Node concept:
{{SCENE_GOAL}}

Visual concept:
{{VISUAL_CONCEPT}}

Scene / backdrop:
{{SCENE_BACKDROP}}

Composition:
{{LAYOUT_PLAN}}

{{UI_SAFE_AREA_RULES}}

Text allowed in image, render exactly and clearly:
{{REQUIRED_TEXT_LIST}}

Typography:
{{TYPOGRAPHY_RULES}}

Constraints:
The image must include background and overlaid text as one generated artwork.
No UI elements, no app cards, no logos, no watermark.
Do not add any readable text beyond the allowed text list.

Avoid:
{{NEGATIVE_RULES}}
{{SAFETY_NEGATIVE_PROMPT}}`

const WHITEBOARD_TEMPLATE = `Use case: clean educational whiteboard image
Asset type: flat digital whiteboard canvas, landscape 1536x1024, UI-ready, no physical scene, no UI

Course whiteboard style:
{{WHITEBOARD_STYLE_LOCK}}

Primary request:
Create one finished clean whiteboard image for this lesson moment.
The entire image should be a flat white/off-white whiteboard canvas.
It must look like a polished digital lesson board that can be placed directly inside an app UI.

Important style correction:
Do NOT create a realistic classroom scene.
Do NOT show a physical whiteboard mounted on a wall.
Do NOT show board frames, metal corners, classroom windows, desks, books, flowers, cups, hands, people, lighting beams, or room backgrounds.
The whiteboard surface itself fills the whole image from edge to edge.

Teaching goal:
{{SCENE_GOAL}}

Whiteboard content plan:
{{WHITEBOARD_OUTLINE_OR_MODEL_PLAN}}

Layout:
{{LAYOUT_PLAN}}

Canvas and composition:
Landscape 1536x1024.
Use a clean flat front-facing composition.
Background should be white or very light warm off-white, with only subtle paper/marker texture.
No perspective angle.
No realistic depth.
No photographic lighting.
No external environment.
No visible wall, table, desk, window, or physical frame.

Content should be centered with generous margins.
Use clear grouped sections, pastel highlight pills, arrows, underlines, and simple doodle icons.
Keep all board text large enough to read inside a mobile app.
Avoid tiny notes and dense paragraphs.

{{WHITEBOARD_SAFE_AREA_RULES}}

Text allowed on the whiteboard, render exactly and clearly:
{{REQUIRED_TEXT_LIST}}

Visual icons:
{{ICON_PLAN}}

Whiteboard visual style:
Flat digital whiteboard.
Hand-drawn marker text.
Pastel green / lavender / yellow-orange highlight pills.
Simple black marker doodle icons.
Thin marker arrows and underlines.
Airy spacing.
Clean online-course board style.
Friendly but polished.
No realistic classroom setting.

Typography:
Chinese and English must be crisp, large, and readable.
Use marker-like handwriting, but do not make it messy.
Prioritize legibility over decoration.
Keep line lengths short.
Do not shrink text to fit too much content.
If content is long, simplify layout rather than adding tiny writing.

Constraints:
The image must be a clean standalone whiteboard graphic ready to place inside UI.
No UI elements, no logos, no watermark.
No physical classroom scene.
No realistic photo background.
No board frame.
No wall.
No desk.
No people.
No props outside the board.
Do not add any readable text beyond the allowed text list.

Avoid:
{{NEGATIVE_RULES}}
{{SAFETY_NEGATIVE_PROMPT}}

Additional avoid:
No realistic classroom.
No physical whiteboard object.
No whiteboard frame.
No metal corners.
No window light.
No desk foreground.
No books, tea cups, flowers, plants, pens, hands, or classroom props.
No shadows that imply a real room.
No perspective tilt.
No photo-realistic rendering.
No dense paragraphs.
No tiny unreadable text.
No fake Chinese.
No duplicated text.
No random extra words.`

const DEFAULT_PARAMS: CourseImageDefaultParams = {
  submerge: { size: '944x2048', quality: 'high', output_format: 'png' },
  whiteboard: { size: '1536x1024', quality: 'high', output_format: 'png' },
}

const DEFAULT_SAFE_AREA_SPEC: SafeAreaSpec = {
  canvas: '944x2048',
  absoluteNoGoZones: {
    topPx: 170,
    bottomPx: 330,
  },
  contentSafeZone: {
    xMinPx: 70,
    xMaxPx: 874,
    yMinPx: 220,
    yMaxPx: 1660,
  },
  rules:
    'Do not place main subject, faces, important objects, readable text, labels, icons, diagrams, or high-contrast focal points inside the top 170px or bottom 330px. These zones may contain only blurred background, soft texture, darkness, light gradients, or non-essential scenery.',
}

const DEFAULT_SAFE_AREA_SPECS: CourseImageSafeAreaSpecs = {
  submerge: DEFAULT_SAFE_AREA_SPEC,
  whiteboard: {
    canvas: '1536x1024',
    absoluteNoGoZones: {
      topPx: 96,
      bottomPx: 96,
    },
    contentSafeZone: {
      xMinPx: 96,
      xMaxPx: 1440,
      yMinPx: 96,
      yMaxPx: 928,
    },
    rules:
      'For whiteboard images, keep all readable text, diagrams, arrows, icons, and high-contrast content inside the 96px inset content-safe zone. The outer margins may contain only clean white/off-white paper texture or non-essential marker texture so the board can sit cleanly inside app UI containers.',
  },
}

const DEFAULT_STYLE_LOCKS: CourseImageStyleLocks = {
  submerge: `Warm cinematic indoor study scene, golden-hour window light, dark vignette,
shallow depth of field, cozy desk, symbolic cultural objects, immersive lesson-card style.`,
  whiteboard: `Flat digital whiteboard canvas, white/off-white background, no physical scene,
hand-drawn marker text, pastel highlight pills, simple doodle icons, arrows, underlines,
clean online-course board style, UI-ready.`,
}

const DEFAULT_TEMPLATE: CourseImageTemplateCreate = {
  course_id: null,
  template_key: 'eva-china-culture-english-june',
  template_version: '2026-06-v1',
  submerge_template: SUBMERGE_TEMPLATE,
  whiteboard_template: WHITEBOARD_TEMPLATE,
  style_lock: DEFAULT_STYLE_LOCKS.submerge,
  typography_rules: `Use short bilingual text only. English can be casual handwritten.
Chinese must be large, clear, and natural. Highlight 1-2 keywords with yellow/purple/green.`,
  negative_rules: `No UI, no app interface, no logos, no watermark, no dense paragraphs, no fake text,
no malformed Chinese, no duplicated headings, no unrelated objects.`,
  default_params: DEFAULT_PARAMS,
  safe_area_spec: DEFAULT_SAFE_AREA_SPEC,
  safe_area_specs: DEFAULT_SAFE_AREA_SPECS,
  style_locks: DEFAULT_STYLE_LOCKS,
  is_active: false,
}

type TemplateInjectionRelationship = {
  token: string
  source: string
  scope: string
}

const TEMPLATE_INJECTION_RELATIONSHIPS: TemplateInjectionRelationship[] = [
  { token: '{{COURSE_STYLE_LOCK}}', source: '按 imageType 自动选择 style_locks.submerge 或 style_locks.whiteboard', scope: '通用兼容占位符' },
  { token: '{{SUBMERGE_STYLE_LOCK}}', source: 'style_locks.submerge', scope: 'submerge_template' },
  { token: '{{WHITEBOARD_STYLE_LOCK}}', source: 'style_locks.whiteboard', scope: 'whiteboard_template' },
  { token: '{{SCENE_GOAL}}', source: 'Prompt Composer 输出的 sceneGoal', scope: '通用' },
  { token: '{{VISUAL_CONCEPT}}', source: 'Prompt Composer 输出的 visualConcept', scope: 'submerge_template' },
  { token: '{{SCENE_BACKDROP}}', source: 'Prompt Composer 输出的 imagePrompt', scope: 'submerge_template' },
  { token: '{{WHITEBOARD_OUTLINE_OR_MODEL_PLAN}}', source: '用户填写的白板大纲；为空时使用 Composer 的 imagePrompt', scope: 'whiteboard_template' },
  { token: '{{LAYOUT_PLAN}}', source: 'Prompt Composer 输出的 layoutPlan', scope: '通用' },
  { token: '{{REQUIRED_TEXT_LIST}}', source: 'Prompt Composer 输出的 requiredText，后端格式化成列表', scope: '通用' },
  { token: '{{ICON_PLAN}}', source: 'Prompt Composer 输出的 visualConcept', scope: 'whiteboard_template' },
  { token: '{{TYPOGRAPHY_RULES}}', source: '模板表单里的 typography_rules', scope: '通用' },
  { token: '{{NEGATIVE_RULES}}', source: '模板表单里的 negative_rules', scope: '通用' },
  { token: '{{SAFETY_NEGATIVE_PROMPT}}', source: 'Prompt Composer 输出的 safetyNegativePrompt', scope: '通用' },
  { token: '{{UI_SAFE_AREA_RULES}}', source: '按 imageType 自动选择 safe_area_specs.submerge 或 safe_area_specs.whiteboard', scope: '通用兼容占位符' },
  { token: '{{SUBMERGE_SAFE_AREA_RULES}}', source: 'safe_area_specs.submerge 格式化后的 UI 避让硬约束，默认 944x2048', scope: 'submerge_template' },
  { token: '{{WHITEBOARD_SAFE_AREA_RULES}}', source: 'safe_area_specs.whiteboard 格式化后的白板内容安全边距，默认 1536x1024', scope: 'whiteboard_template' },
]

function nextTemplateVersion() {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

function buildNewTemplateDefaults(courseId?: string): CourseImageTemplateCreate {
  return {
    ...DEFAULT_TEMPLATE,
    course_id: courseId ?? null,
    template_version: nextTemplateVersion(),
  }
}

function buildNewComposerDefaults(
  courseId?: string,
  prompts: { system_prompt?: string; submerge_system_prompt?: string; whiteboard_system_prompt?: string } = {},
): CourseImageComposerCreate {
  const submergePrompt = prompts.submerge_system_prompt || prompts.system_prompt || ''
  const whiteboardPrompt = prompts.whiteboard_system_prompt || prompts.system_prompt || ''
  return {
    course_id: courseId ?? null,
    composer_key: 'default-lesson-image-composer',
    composer_version: nextTemplateVersion(),
    system_prompt: prompts.system_prompt || `Submerge Composer:\n${submergePrompt}\n\nWhiteboard Composer:\n${whiteboardPrompt}`,
    submerge_system_prompt: submergePrompt,
    whiteboard_system_prompt: whiteboardPrompt,
    is_active: false,
  }
}

function tryParseComposerJson(value: string): PromptComposerOutput | null {
  try {
    const parsed = JSON.parse(value) as PromptComposerOutput
    if (!parsed.imageType || !parsed.sceneGoal || !parsed.imagePrompt) return null
    return parsed
  } catch {
    return null
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleString()
}

function formatApiError(err: any, fallback: string) {
  const detail = err?.response?.data?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        const loc = Array.isArray(item?.loc) ? item.loc.join('.') : ''
        return `${loc ? `${loc}: ` : ''}${item?.msg || JSON.stringify(item)}`
      })
      .join('；')
  }
  return err?.message || fallback
}

function TemplateInjectionGuide() {
  return (
    <Card
      size="small"
      type="inner"
      title="提示词注入关系"
      style={{ marginBottom: 16 }}
    >
      <Paragraph type="secondary" style={{ marginBottom: 12 }}>
        保存模板时只保存原始占位符；点击「生成 Prompt」时，后端会把这些占位符替换成当前课程、用户输入和 Composer 输出。
      </Paragraph>
      <List
        size="small"
        dataSource={TEMPLATE_INJECTION_RELATIONSHIPS}
        renderItem={(item) => (
          <List.Item>
            <Space direction="vertical" size={2}>
              <Space wrap>
                <Text code>{item.token}</Text>
                <Tag>{item.scope}</Tag>
              </Space>
              <Text type="secondary">注入来源：{item.source}</Text>
            </Space>
          </List.Item>
        )}
      />
    </Card>
  )
}

function safeJsonParse(value: string): unknown {
  if (!value.trim()) return null
  try {
    return JSON.parse(value)
  } catch {
    return value
  }
}

function downloadTextFile(filename: string, content: string, mimeType = 'application/json;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function courseLabel(courses: CourseOut[], courseId?: string | null) {
  if (!courseId) return '全局模板'
  return courses.find((course) => course.id === courseId)?.title || `课程 ${courseId}`
}

function formatDuration(ms?: number | null) {
  if (ms == null) return '-'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

export default function LessonImageGenPage() {
  const [courses, setCourses] = useState<CourseOut[]>([])
  const [templates, setTemplates] = useState<CourseImageTemplateOut[]>([])
  const [allTemplates, setAllTemplates] = useState<CourseImageTemplateOut[]>([])
  const [composers, setComposers] = useState<CourseImageComposerOut[]>([])
  const [allComposers, setAllComposers] = useState<CourseImageComposerOut[]>([])
  const [history, setHistory] = useState<LessonImageGenerationOut[]>([])
  const [courseId, setCourseId] = useState<string>()
  const [templateId, setTemplateId] = useState<string>()
  const [composerId, setComposerId] = useState<string>()
  const [imageType, setImageType] = useState<ImageGenerationType>('submerge_sequence')
  const [lessonId, setLessonId] = useState('')
  const [nodeId, setNodeId] = useState('')
  const [nodeScript, setNodeScript] = useState('')
  const [fullCourseScript, setFullCourseScript] = useState('')
  const [whiteboardOutline, setWhiteboardOutline] = useState('')
  const [referenceImageUrl, setReferenceImageUrl] = useState('')
  const [referenceImageNote, setReferenceImageNote] = useState('')
  const [composerJson, setComposerJson] = useState('')
  const [finalPrompt, setFinalPrompt] = useState('')
  const [paramsJson, setParamsJson] = useState(JSON.stringify(DEFAULT_PARAMS.submerge, null, 2))
  const [lastComposerDurationMs, setLastComposerDurationMs] = useState<number | null>(null)
  const [currentGeneration, setCurrentGeneration] = useState<LessonImageGenerationOut | null>(null)
  const [loading, setLoading] = useState(false)
  const [templateForm] = Form.useForm<CourseImageTemplateCreate>()
  const [composerForm] = Form.useForm<CourseImageComposerCreate>()
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [editingComposerId, setEditingComposerId] = useState<string | null>(null)
  const [defaultComposerPrompts, setDefaultComposerPrompts] = useState({
    system_prompt: '',
    submerge_system_prompt: '',
    whiteboard_system_prompt: '',
  })

  const selectedTemplate = useMemo(
    () => templates.find((item) => item.id === templateId) ?? templates[0],
    [templateId, templates],
  )
  const selectedComposer = useMemo(
    () => composers.find((item) => item.id === composerId) ?? composers[0],
    [composerId, composers],
  )
  const selectedCourse = useMemo(
    () => courses.find((item) => item.id === courseId),
    [courseId, courses],
  )

  const loadCourses = useCallback(async () => {
    const rows = await coursesApi.listCourses()
    setCourses(rows)
    setCourseId((prev) => prev ?? rows[0]?.id)
  }, [])

  const loadTemplates = useCallback(async (nextCourseId?: string) => {
    const rows = await courseImageTemplateApi.list(nextCourseId)
    setTemplates(rows)
    setTemplateId((prev) => (prev && rows.some((item) => item.id === prev) ? prev : rows[0]?.id))
  }, [])

  const loadAllTemplates = useCallback(async () => {
    const rows = await courseImageTemplateApi.list()
    setAllTemplates(rows)
  }, [])

  const loadComposers = useCallback(async (nextCourseId?: string) => {
    const rows = await courseImageComposerApi.list(nextCourseId)
    setComposers(rows)
    setComposerId((prev) => (prev && rows.some((item) => item.id === prev) ? prev : rows[0]?.id))
  }, [])

  const loadAllComposers = useCallback(async () => {
    const rows = await courseImageComposerApi.list()
    setAllComposers(rows)
  }, [])

  const loadHistory = useCallback(async (nextCourseId?: string, nextImageType?: ImageGenerationType) => {
    const rows = await lessonImageGenApi.listGenerations({
      course_id: nextCourseId,
      image_type: nextImageType,
    })
    setHistory(rows)
  }, [])

  useEffect(() => {
    loadCourses().catch((err) => message.error(err?.message || '课程加载失败'))
    loadAllTemplates().catch((err) => message.error(err?.message || '模板加载失败'))
    loadAllComposers().catch((err) => message.error(err?.message || 'Composer 加载失败'))
    courseImageComposerApi
      .getDefaultSystemPrompt()
      .then(setDefaultComposerPrompts)
      .catch((err) => message.error(err?.message || '默认 Composer 加载失败'))
  }, [loadAllComposers, loadAllTemplates, loadCourses])

  useEffect(() => {
    if (!courseId) return
    loadTemplates(courseId).catch((err) => message.error(err?.message || '模板加载失败'))
    loadComposers(courseId).catch((err) => message.error(err?.message || 'Composer 加载失败'))
    loadHistory(courseId, imageType).catch((err) => message.error(err?.message || '历史加载失败'))
  }, [courseId, imageType, loadComposers, loadHistory, loadTemplates])

  useEffect(() => {
    if (!selectedTemplate) return
    const nextParams = imageType === 'submerge_sequence'
      ? selectedTemplate.default_params.submerge
      : selectedTemplate.default_params.whiteboard
    setParamsJson(JSON.stringify(nextParams, null, 2))
  }, [imageType, selectedTemplate])

  const buildBaseRequest = () => {
    if (!courseId) throw new Error('请先选择课程')
    if (!nodeScript.trim()) throw new Error('请输入 Node 台词')
    if (!fullCourseScript.trim()) throw new Error('请输入全课台词')
    const trimmedLessonId = lessonId.trim()
    if (trimmedLessonId && !UUID_RE.test(trimmedLessonId)) {
      throw new Error('lesson_id 必须是 UUID；如果只是调试，可以留空')
    }
    return {
      course_id: courseId,
      lesson_id: trimmedLessonId || null,
      node_id: nodeId.trim() || null,
      image_type: imageType,
      template_id: selectedTemplate?.id ?? null,
      composer_id: selectedComposer?.id ?? null,
      node_script: nodeScript,
      full_course_script: fullCourseScript,
      whiteboard_outline: whiteboardOutline.trim() || null,
      reference_image_url: referenceImageUrl.trim() || null,
      reference_image_note: referenceImageNote.trim() || null,
    }
  }

  const handleCompose = async () => {
    setLoading(true)
    try {
      const res = await lessonImageGenApi.composePrompt(buildBaseRequest())
      if (res.composer?.id) setComposerId(res.composer.id)
      setComposerJson(JSON.stringify(res.composer_output, null, 2))
      setFinalPrompt(res.final_image_prompt)
      setParamsJson(JSON.stringify(res.params, null, 2))
      setLastComposerDurationMs(res.composer_duration_ms)
      message.success(`Prompt 已生成，耗时 ${formatDuration(res.composer_duration_ms)}`)
    } catch (err: any) {
      message.error(formatApiError(err, 'Prompt 生成失败'))
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const composerOutput = composerJson.trim() ? tryParseComposerJson(composerJson) : null
      if (composerJson.trim() && !composerOutput) throw new Error('composer_output JSON 格式不正确')
      const params = paramsJson.trim() ? JSON.parse(paramsJson) : null
      const res = await lessonImageGenApi.generate({
        ...buildBaseRequest(),
        composer_output: composerOutput,
        final_image_prompt: finalPrompt.trim() || null,
        params,
        composer_duration_ms: composerOutput ? lastComposerDurationMs : null,
      })
      setCurrentGeneration(res)
      setFinalPrompt(res.final_image_prompt)
      setComposerJson(JSON.stringify(res.composer_output, null, 2))
      setLastComposerDurationMs(res.composer_duration_ms)
      await loadHistory(courseId, imageType)
      message.success(res.status === 'success' ? '图片已生成' : '生成失败，已记录错误')
    } catch (err: any) {
      message.error(formatApiError(err, '图片生成失败'))
    } finally {
      setLoading(false)
    }
  }

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(finalPrompt)
    message.success('已复制 final prompt')
  }

  const buildCodexExportPayload = () => {
    const exportedAt = new Date().toISOString()
    return {
      exportPurpose: 'Tune Ditto lesson image generation prompts with Codex',
      exportedAt,
      page: 'lesson-image-gen',
      course: selectedCourse
        ? {
            id: selectedCourse.id,
            title: selectedCourse.title,
            description: selectedCourse.description,
          }
        : { id: courseId ?? null },
      context: {
        imageType,
        lessonId: lessonId.trim() || null,
        nodeId: nodeId.trim() || null,
        nodeScript,
        fullCourseScript,
        whiteboardOutline: whiteboardOutline.trim() || null,
        referenceImageUrl: referenceImageUrl.trim() || null,
        referenceImageNote: referenceImageNote.trim() || null,
      },
      template: selectedTemplate
        ? {
            id: selectedTemplate.id,
            templateKey: selectedTemplate.template_key,
            templateVersion: selectedTemplate.template_version,
            submergeTemplate: selectedTemplate.submerge_template,
            whiteboardTemplate: selectedTemplate.whiteboard_template,
            styleLock: selectedTemplate.style_lock,
            styleLocks: selectedTemplate.style_locks,
            typographyRules: selectedTemplate.typography_rules,
            negativeRules: selectedTemplate.negative_rules,
            defaultParams: selectedTemplate.default_params,
            safeAreaSpec: selectedTemplate.safe_area_spec,
            safeAreaSpecs: selectedTemplate.safe_area_specs,
          }
        : null,
      composer: selectedComposer
        ? {
            id: selectedComposer.id,
            composerKey: selectedComposer.composer_key,
            composerVersion: selectedComposer.composer_version,
            courseId: selectedComposer.course_id,
            isActive: selectedComposer.is_active,
            systemPrompt: selectedComposer.system_prompt,
            submergeSystemPrompt: selectedComposer.submerge_system_prompt,
            whiteboardSystemPrompt: selectedComposer.whiteboard_system_prompt,
          }
        : null,
      promptDraft: {
        composerOutput: safeJsonParse(composerJson),
        finalImagePrompt: finalPrompt,
        params: safeJsonParse(paramsJson),
      },
      generation: currentGeneration
        ? {
            id: currentGeneration.id,
            status: currentGeneration.status,
            model: currentGeneration.model,
            size: currentGeneration.size,
            quality: currentGeneration.quality,
            outputFormat: currentGeneration.output_format,
            imageUrl: currentGeneration.image_url,
            imageAccessUrl: currentGeneration.image_access_url,
            errorMessage: currentGeneration.error_message,
            composerDurationMs: currentGeneration.composer_duration_ms,
            imageGenerationDurationMs: currentGeneration.image_generation_duration_ms,
            createdAt: currentGeneration.created_at,
          }
        : null,
      codexTask: [
        'Please review the prompt package for this lesson image generation case.',
        'Improve the course template and final image prompt while preserving the intended image type.',
        'For submerge_sequence, optimize for an immersive iPhone full-screen educational explainer image with no UI.',
        'For whiteboard, optimize for a clean educational whiteboard with clear board text and no UI.',
        'Keep readable image text constrained to requiredText.',
      ],
    }
  }

  const buildCodexMarkdown = () => {
    const payload = buildCodexExportPayload()
    return `# Ditto 课节图片生成器 Prompt 调试包

请帮我基于以下数据优化课程图片生成提示词。重点优化：

- 保持 imageType 的用途不变。
- 图片中不得出现 UI、Logo、水印。
- 可读文字只能来自 requiredText。
- 如果是 submerge_sequence，请优化成沉浸式手机全屏讲解图。
- 如果是 whiteboard，请优化成 UI-ready flat digital whiteboard canvas，整张图是平面白板画布，不要真实教室、墙面、边框、光影或道具。

\`\`\`json
${JSON.stringify(payload, null, 2)}
\`\`\`
`
  }

  const handleCopyCodexExport = async () => {
    if (!finalPrompt.trim() && !composerJson.trim() && !currentGeneration) {
      message.warning('请先生成 Prompt 或选择一条历史记录')
      return
    }
    await navigator.clipboard.writeText(buildCodexMarkdown())
    message.success('已复制 Codex 调参包')
  }

  const handleDownloadCodexExport = () => {
    if (!finalPrompt.trim() && !composerJson.trim() && !currentGeneration) {
      message.warning('请先生成 Prompt 或选择一条历史记录')
      return
    }
    const payload = buildCodexExportPayload()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    downloadTextFile(
      `lesson-image-gen-${imageType}-${timestamp}.json`,
      JSON.stringify(payload, null, 2),
    )
    message.success('已下载 JSON 调参包')
  }

  const editTemplate = (tpl: CourseImageTemplateOut) => {
    setEditingTemplateId(tpl.id)
    templateForm.setFieldsValue(tpl)
  }

  const editComposer = (composer: CourseImageComposerOut) => {
    setEditingComposerId(composer.id)
    composerForm.setFieldsValue(composer)
  }

  const resetTemplateForm = (showMessage = false) => {
    setEditingTemplateId(null)
    templateForm.resetFields()
    templateForm.setFieldsValue(buildNewTemplateDefaults(courseId))
    if (showMessage) {
      message.info('已在右侧填入新模板草稿，编辑后点击「保存模板」才会创建')
    }
  }

  const resetComposerForm = (showMessage = false) => {
    setEditingComposerId(null)
    composerForm.resetFields()
    composerForm.setFieldsValue(buildNewComposerDefaults(courseId, defaultComposerPrompts))
    if (showMessage) {
      message.info('已在右侧填入新 Composer 草稿，编辑后点击「保存 Composer」才会创建')
    }
  }

  const submitTemplate = async (values: CourseImageTemplateCreate) => {
    try {
      const body = {
        ...values,
        course_id: values.course_id || null,
        default_params: values.default_params || DEFAULT_PARAMS,
        safe_area_spec: values.safe_area_spec || DEFAULT_SAFE_AREA_SPEC,
        safe_area_specs: values.safe_area_specs || DEFAULT_SAFE_AREA_SPECS,
        style_locks: values.style_locks || DEFAULT_STYLE_LOCKS,
      }
      let saved: CourseImageTemplateOut
      if (editingTemplateId) {
        saved = await courseImageTemplateApi.update(editingTemplateId, body)
        message.success('模板已更新')
      } else {
        saved = await courseImageTemplateApi.create(body)
        message.success('模板已创建')
      }
      resetTemplateForm()
      if (saved.course_id && saved.course_id !== courseId) {
        setCourseId(saved.course_id)
      }
      await loadTemplates(saved.course_id ?? courseId)
      await loadAllTemplates()
      setTemplateId(saved.id)
    } catch (err: any) {
      message.error(formatApiError(err, '模板保存失败'))
    }
  }

  const activateTemplate = async (tpl: CourseImageTemplateOut) => {
    await courseImageTemplateApi.activate(tpl.id)
    message.success('已设为 active 模板')
    await loadTemplates(courseId)
    await loadAllTemplates()
  }

  const submitComposer = async (values: CourseImageComposerCreate) => {
    try {
      const body = {
        ...values,
        course_id: values.course_id || null,
        system_prompt: values.system_prompt || `Submerge Composer:\n${values.submerge_system_prompt}\n\nWhiteboard Composer:\n${values.whiteboard_system_prompt}`,
        submerge_system_prompt: values.submerge_system_prompt || defaultComposerPrompts.submerge_system_prompt,
        whiteboard_system_prompt: values.whiteboard_system_prompt || defaultComposerPrompts.whiteboard_system_prompt,
      }
      let saved: CourseImageComposerOut
      if (editingComposerId) {
        saved = await courseImageComposerApi.update(editingComposerId, body)
        message.success('Composer 已更新')
      } else {
        saved = await courseImageComposerApi.create(body)
        message.success('Composer 已创建')
      }
      resetComposerForm()
      if (saved.course_id && saved.course_id !== courseId) {
        setCourseId(saved.course_id)
      }
      await loadComposers(saved.course_id ?? courseId)
      await loadAllComposers()
      setComposerId(saved.id)
    } catch (err: any) {
      message.error(formatApiError(err, 'Composer 保存失败'))
    }
  }

  const activateComposer = async (composer: CourseImageComposerOut) => {
    await courseImageComposerApi.activate(composer.id)
    message.success('已设为 active Composer')
    await loadComposers(courseId)
    await loadAllComposers()
  }

  useEffect(() => {
    resetTemplateForm()
    resetComposerForm()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, defaultComposerPrompts])

  const generatorTab = (
    <Row gutter={16}>
      <Col xs={24} xl={7}>
        <Card title="输入" size="small">
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <Select
              placeholder="选择 Course"
              value={courseId}
              onChange={setCourseId}
              options={courses.map((course) => ({ value: course.id, label: course.title }))}
            />
            <Select
              placeholder="选择模板"
              value={selectedTemplate?.id}
              onChange={setTemplateId}
              options={templates.map((tpl) => ({
                value: tpl.id,
                label: `${tpl.template_key} / ${tpl.template_version}${tpl.is_active ? '（active）' : ''}`,
              }))}
            />
            {!templates.length && <Alert type="warning" showIcon message="当前课程暂无模板，请先在模板管理里创建或导入示例模板。" />}
            <Select
              placeholder="选择 Prompt Composer"
              value={selectedComposer?.id}
              onChange={setComposerId}
              options={composers.map((composer) => ({
                value: composer.id,
                label: `${composer.composer_key} / ${composer.composer_version}${composer.is_active ? '（active）' : ''}`,
              }))}
            />
            {!composers.length && (
              <Alert type="warning" showIcon message="当前课程暂无 Composer，将使用后端默认 Composer；建议在 Composer 管理里创建或绑定一个 active Composer。" />
            )}
            <Segmented
              block
              value={imageType}
              onChange={(v) => setImageType(v as ImageGenerationType)}
              options={[
                { value: 'submerge_sequence', label: 'submerge-sequence image' },
                { value: 'whiteboard', label: 'whiteboard image' },
              ]}
            />
            <Input placeholder="lesson_id（可选，仅记录上下文）" value={lessonId} onChange={(e) => setLessonId(e.target.value)} />
            <Input placeholder="node_id（可选，仅记录上下文）" value={nodeId} onChange={(e) => setNodeId(e.target.value)} />
            <TextArea rows={6} placeholder="Node 台词" value={nodeScript} onChange={(e) => setNodeScript(e.target.value)} />
            <TextArea rows={6} placeholder="全课台词" value={fullCourseScript} onChange={(e) => setFullCourseScript(e.target.value)} />
            <div>
              <Text strong>参考图（可选）</Text>
              <Paragraph type="secondary" style={{ marginBottom: 6 }}>
                会同时用于 Prompt Composer 的风格参考，以及实际生图的参考图/编辑图输入。
              </Paragraph>
              <ImageOssUploadField
                value={referenceImageUrl}
                onChange={setReferenceImageUrl}
                placeholder="OSS 图片 URL，或上传参考图自动填入"
              />
            </div>
            <TextArea
              rows={3}
              placeholder="参考图备注（可选）：例如参考构图、光线、字体氛围，不要复制图中文字"
              value={referenceImageNote}
              onChange={(e) => setReferenceImageNote(e.target.value)}
            />
            {imageType === 'whiteboard' && (
              <TextArea
                rows={5}
                placeholder="白板大纲（可选）"
                value={whiteboardOutline}
                onChange={(e) => setWhiteboardOutline(e.target.value)}
              />
            )}
            <Space wrap>
              <Button onClick={handleCompose} loading={loading} disabled={!selectedTemplate}>
                生成 Prompt
              </Button>
              <Button type="primary" onClick={handleGenerate} loading={loading} disabled={!selectedTemplate}>
                生成图片
              </Button>
            </Space>
          </Space>
        </Card>
      </Col>
      <Col xs={24} xl={9}>
        <Card
          title="Prompt 调试"
          size="small"
          extra={
            <Button size="small" icon={<CopyOutlined />} onClick={handleCopyPrompt} disabled={!finalPrompt}>
              复制
            </Button>
          }
        >
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <Space wrap>
              <Tag color="blue">Composer 耗时：{formatDuration(lastComposerDurationMs)}</Tag>
              {currentGeneration && (
                <Tag color="purple">图片耗时：{formatDuration(currentGeneration.image_generation_duration_ms)}</Tag>
              )}
            </Space>
            <div>
              <Text strong>composer_output JSON</Text>
              <TextArea rows={10} value={composerJson} onChange={(e) => setComposerJson(e.target.value)} />
            </div>
            <div>
              <Text strong>final_image_prompt</Text>
              <TextArea rows={12} value={finalPrompt} onChange={(e) => setFinalPrompt(e.target.value)} />
            </div>
            <div>
              <Text strong>params JSON</Text>
              <TextArea rows={4} value={paramsJson} onChange={(e) => setParamsJson(e.target.value)} />
            </div>
          </Space>
        </Card>
      </Col>
      <Col xs={24} xl={8}>
        <Card
          title="结果预览"
          size="small"
          extra={
            <Space>
              <Button size="small" icon={<CopyOutlined />} onClick={handleCopyCodexExport}>
                复制给 Codex
              </Button>
              <Button size="small" icon={<DownloadOutlined />} onClick={handleDownloadCodexExport}>
                下载 JSON
              </Button>
            </Space>
          }
        >
          {currentGeneration?.image_access_url ? (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Image src={currentGeneration.image_access_url} style={{ maxHeight: 520, objectFit: 'contain' }} />
              <Space wrap>
                <Tag>{currentGeneration.image_type}</Tag>
                <Tag>{currentGeneration.size}</Tag>
                <Tag>{currentGeneration.quality}</Tag>
                <Tag>{currentGeneration.template_version}</Tag>
                <Tag color="blue">Prompt {formatDuration(currentGeneration.composer_duration_ms)}</Tag>
                <Tag color="purple">Image {formatDuration(currentGeneration.image_generation_duration_ms)}</Tag>
              </Space>
            </Space>
          ) : currentGeneration?.error_message ? (
            <Alert type="error" showIcon message={currentGeneration.error_message} />
          ) : (
            <Empty description="生成后在这里预览" />
          )}
        </Card>
        <Card
          title="历史"
          size="small"
          style={{ marginTop: 16 }}
          extra={<Button size="small" icon={<ReloadOutlined />} onClick={() => loadHistory(courseId, imageType)} />}
        >
          <List
            size="small"
            dataSource={history}
            locale={{ emptyText: '暂无历史' }}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button
                    key="use"
                    type="link"
                    size="small"
                    onClick={() => {
                      setCurrentGeneration(item)
                      setLastComposerDurationMs(item.composer_duration_ms)
                      setComposerJson(JSON.stringify(item.composer_output, null, 2))
                      setFinalPrompt(item.final_image_prompt)
                      setReferenceImageUrl(
                        typeof item.composer_input?.referenceImageUrl === 'string'
                          ? item.composer_input.referenceImageUrl
                          : '',
                      )
                      setReferenceImageNote(
                        typeof item.composer_input?.referenceImageNote === 'string'
                          ? item.composer_input.referenceImageNote
                          : '',
                      )
                      setParamsJson(JSON.stringify({
                        size: item.size,
                        quality: item.quality,
                        output_format: item.output_format,
                      }, null, 2))
                    }}
                  >
                    回看
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={<Space><Tag color={item.status === 'success' ? 'green' : 'red'}>{item.status}</Tag>{item.image_type}</Space>}
                  description={`${item.size || ''} · Prompt ${formatDuration(item.composer_duration_ms)} · Image ${formatDuration(item.image_generation_duration_ms)} · ${formatDate(item.created_at)}`}
                />
              </List.Item>
            )}
          />
        </Card>
      </Col>
    </Row>
  )

  const templatesTab = (
    <Row gutter={16}>
      <Col xs={24} lg={10}>
        <Card
          title="模板列表"
          size="small"
          extra={
            <Button icon={<PlusOutlined />} onClick={() => resetTemplateForm(true)}>
              新建模板草稿
            </Button>
          }
        >
          <List
            dataSource={allTemplates}
            locale={{ emptyText: '暂无模板' }}
            renderItem={(tpl) => (
              <List.Item
                actions={[
                  <Button key="edit" type="link" onClick={() => editTemplate(tpl)}>编辑</Button>,
                  <Button key="active" type="link" disabled={tpl.is_active} onClick={() => activateTemplate(tpl)}>
                    设为 active
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={<Space>{tpl.template_key}<Tag>{tpl.template_version}</Tag>{tpl.is_active && <Tag color="green">active</Tag>}</Space>}
                  description={courseLabel(courses, tpl.course_id)}
                />
              </List.Item>
            )}
          />
        </Card>
      </Col>
      <Col xs={24} lg={14}>
        <Card title={editingTemplateId ? '编辑模板' : '创建模板'} size="small">
          <Form form={templateForm} layout="vertical" onFinish={submitTemplate} initialValues={{ ...DEFAULT_TEMPLATE, course_id: courseId ?? null }}>
            {!editingTemplateId && (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 12 }}
                message="当前是新模板草稿"
                description="点击左侧「新建模板草稿」只会重置右侧表单；填写完成后，需要点击下方「保存模板」才会真正创建。"
              />
            )}
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="course_id" label="绑定课程">
                  <Select
                    allowClear
                    placeholder="为空表示全局模板"
                    options={courses.map((course) => ({ value: course.id, label: course.title }))}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="is_active" label="状态">
                  <Select options={[{ value: false, label: '普通模板' }, { value: true, label: '设为 active' }]} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="template_key" label="template_key" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="template_version" label="template_version" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <TemplateInjectionGuide />
            <Form.Item name="style_lock" label="style_lock（兼容旧字段，submerge 默认使用）" rules={[{ required: true }]}>
              <TextArea rows={4} />
            </Form.Item>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name={['style_locks', 'submerge']} label="style_locks.submerge" rules={[{ required: true }]}>
                  <TextArea rows={4} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name={['style_locks', 'whiteboard']} label="style_locks.whiteboard" rules={[{ required: true }]}>
                  <TextArea rows={4} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="typography_rules" label="typography_rules" rules={[{ required: true }]}>
              <TextArea rows={3} />
            </Form.Item>
            <Form.Item name="negative_rules" label="negative_rules" rules={[{ required: true }]}>
              <TextArea rows={3} />
            </Form.Item>
            <Form.Item
              name="submerge_template"
              label="submerge_template"
              rules={[{ required: true }]}
              extra="主要使用 SUBMERGE_STYLE_LOCK / SCENE_GOAL / VISUAL_CONCEPT / SCENE_BACKDROP / LAYOUT_PLAN / SUBMERGE_SAFE_AREA_RULES / REQUIRED_TEXT_LIST 等占位符。"
            >
              <TextArea rows={8} />
            </Form.Item>
            <Form.Item
              name="whiteboard_template"
              label="whiteboard_template"
              rules={[{ required: true }]}
              extra="主要使用 WHITEBOARD_STYLE_LOCK / SCENE_GOAL / WHITEBOARD_OUTLINE_OR_MODEL_PLAN / LAYOUT_PLAN / REQUIRED_TEXT_LIST / ICON_PLAN 等占位符。"
            >
              <TextArea rows={8} />
            </Form.Item>
            <Form.Item label="default_params">
              <TextArea rows={4} disabled value={JSON.stringify(DEFAULT_PARAMS, null, 2)} />
            </Form.Item>
            <Form.Item label="safe_area_specs（按图片模式拆分的 UI 避让硬约束）">
              <TextArea rows={12} disabled value={JSON.stringify(DEFAULT_SAFE_AREA_SPECS, null, 2)} />
            </Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                保存模板
              </Button>
              <Button
                onClick={() => {
                  templateForm.resetFields()
                  templateForm.setFieldsValue(buildNewTemplateDefaults(courseId))
                  message.info('已导入示例模板草稿，编辑后点击「保存模板」')
                }}
              >
                导入示例模板
              </Button>
            </Space>
          </Form>
        </Card>
      </Col>
    </Row>
  )

  const composersTab = (
    <Row gutter={16}>
      <Col xs={24} lg={10}>
        <Card
          title="Composer 列表"
          size="small"
          extra={
            <Button icon={<PlusOutlined />} onClick={() => resetComposerForm(true)}>
              新建 Composer 草稿
            </Button>
          }
        >
          <List
            dataSource={allComposers}
            locale={{ emptyText: '暂无 Composer' }}
            renderItem={(composer) => (
              <List.Item
                actions={[
                  <Button key="edit" type="link" onClick={() => editComposer(composer)}>编辑</Button>,
                  <Button key="active" type="link" disabled={composer.is_active} onClick={() => activateComposer(composer)}>
                    设为 active
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={<Space>{composer.composer_key}<Tag>{composer.composer_version}</Tag>{composer.is_active && <Tag color="green">active</Tag>}</Space>}
                  description={courseLabel(courses, composer.course_id)}
                />
              </List.Item>
            )}
          />
        </Card>
      </Col>
      <Col xs={24} lg={14}>
        <Card title={editingComposerId ? '编辑 Composer' : '创建 Composer'} size="small">
          <Form
            form={composerForm}
            layout="vertical"
            onFinish={submitComposer}
            initialValues={buildNewComposerDefaults(courseId, defaultComposerPrompts)}
          >
            {!editingComposerId && (
              <Alert
                type="info"
                showIcon
                style={{ marginBottom: 12 }}
                message="当前是新 Composer 草稿"
                description="Composer 负责把 Node 台词、全课台词、参考图和 Course 模板先整理成 composer_output JSON；最终生图 Prompt 再由模板占位符注入生成。"
              />
            )}
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="course_id" label="绑定课程">
                  <Select
                    allowClear
                    placeholder="为空表示全局默认 Composer"
                    options={courses.map((course) => ({ value: course.id, label: course.title }))}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="is_active" label="状态">
                  <Select options={[{ value: false, label: '普通 Composer' }, { value: true, label: '设为 active' }]} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="composer_key" label="composer_key" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="composer_version" label="composer_version" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 12 }}
              message="Submerge 和 Whiteboard 的 Composer 提示词必须分开写"
              description="生成时后端只会把当前 imageType 对应的 system prompt 发给模型，避免竖屏沉浸式规则和白板规则互相干扰。"
            />
            <Form.Item
              name="submerge_system_prompt"
              label="submerge_system_prompt（只用于 submerge_sequence）"
              rules={[{ required: true }]}
              extra="这里只写竖屏沉浸式讲解图的 Composer 规则，不要写 whiteboard / marker / flat canvas 等白板要求。"
            >
              <TextArea rows={18} />
            </Form.Item>
            <Form.Item
              name="whiteboard_system_prompt"
              label="whiteboard_system_prompt（只用于 whiteboard）"
              rules={[{ required: true }]}
              extra="这里只写平面数字白板图的 Composer 规则，不要写 cinematic / desk / window light / shallow depth of field 等实景要求。"
            >
              <TextArea rows={18} />
            </Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                保存 Composer
              </Button>
              <Button
                onClick={() => {
                  composerForm.resetFields()
                  composerForm.setFieldsValue(buildNewComposerDefaults(courseId, defaultComposerPrompts))
                  message.info('已导入默认 Composer 草稿，编辑后点击「保存 Composer」')
                }}
              >
                导入默认 Composer
              </Button>
            </Space>
          </Form>
        </Card>
      </Col>
    </Row>
  )

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div>
        <Title level={4} style={{ marginBottom: 4 }}>课节图片生成器</Title>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          用 Node 台词、全课台词和课程图片模板生成 submerge-sequence / whiteboard 图片，先作为独立调试页使用。
        </Paragraph>
      </div>
      <Divider style={{ margin: 0 }} />
      <Tabs
        items={[
          { key: 'generator', label: '生成调试', children: generatorTab },
          { key: 'templates', label: '模板管理', children: templatesTab },
          { key: 'composers', label: 'Composer 管理', children: composersTab },
        ]}
      />
    </Space>
  )
}
