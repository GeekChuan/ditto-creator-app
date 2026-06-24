import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Image,
  Input,
  Row,
  Select,
  Space,
  Steps,
  Tag,
  Typography,
  message,
} from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined } from '@ant-design/icons'
import { coursesApi, type CourseOut } from '../../api/courses'
import { courseImageComposerApi, type CourseImageComposerOut } from '../../api/courseImageComposer'
import {
  courseImageTemplateApi,
  type CourseImageTemplateOut,
  type CourseStyleBible,
  type SceneArchetype,
} from '../../api/courseImageTemplate'
import {
  lessonImageGenV2Api,
  type ImageGenerationType,
  type LessonImageComposeV2Request,
  type LessonImageComposeV2Response,
  type LessonImageGenerationV2Out,
} from '../../api/lessonImageGenV2'
import ImageOssUploadField from '../../components/ImageOssUploadField'

const { Title, Paragraph, Text } = Typography
const { TextArea } = Input

interface FormValues {
  course_id?: string
  image_type: ImageGenerationType
  template_id?: string
  composer_id?: string
  lesson_id?: string
  node_id?: string
  node_script: string
  full_course_script: string
  whiteboard_outline?: string
  reference_image_url?: string
  reference_image_note?: string
}

function prettyJson(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2)
}

function parseJsonObject(text: string, label: string): Record<string, unknown> {
  const value = JSON.parse(text)
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} 必须是 JSON object`)
  }
  return value as Record<string, unknown>
}

function parseJsonArray(text: string, label: string): Record<string, unknown>[] {
  const value = JSON.parse(text)
  if (!Array.isArray(value)) {
    throw new Error(`${label} 必须是 JSON array`)
  }
  return value as Record<string, unknown>[]
}

function generationStatusTag(status: string) {
  if (status === 'success') return <Tag color="success">成功</Tag>
  if (status === 'failed') return <Tag color="error">失败</Tag>
  return <Tag color="processing">处理中</Tag>
}

export default function LessonImageGenV2Page() {
  const [form] = Form.useForm<FormValues>()
  const [courses, setCourses] = useState<CourseOut[]>([])
  const [templates, setTemplates] = useState<CourseImageTemplateOut[]>([])
  const [composers, setComposers] = useState<CourseImageComposerOut[]>([])
  const [history, setHistory] = useState<LessonImageGenerationV2Out[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<CourseImageTemplateOut | null>(null)
  const [styleBibleText, setStyleBibleText] = useState('{}')
  const [sceneArchetypesText, setSceneArchetypesText] = useState('[]')
  const [composeResult, setComposeResult] = useState<LessonImageComposeV2Response | null>(null)
  const [generation, setGeneration] = useState<LessonImageGenerationV2Out | null>(null)
  const [loading, setLoading] = useState(false)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [step, setStep] = useState(0)

  const courseId = Form.useWatch('course_id', form)
  const imageType = Form.useWatch('image_type', form)
  const templateId = Form.useWatch('template_id', form)

  const selectedImageTypeLabel = imageType === 'whiteboard' ? '白板图' : '沉浸式讲解图'
  const filteredTemplates = useMemo(
    () => templates.filter((item) => item.image_type === imageType),
    [templates, imageType],
  )
  const filteredComposers = useMemo(
    () => composers.filter((item) => item.image_type === imageType),
    [composers, imageType],
  )

  const loadCourses = useCallback(async () => {
    const rows = await coursesApi.listCourses()
    setCourses(rows)
    if (!form.getFieldValue('course_id') && rows[0]) {
      form.setFieldValue('course_id', rows[0].id)
    }
  }, [form])

  const loadCourseResources = useCallback(async (id?: string) => {
    if (!id) return
    const [templateRows, composerRows, historyRows] = await Promise.all([
      courseImageTemplateApi.list(id),
      courseImageComposerApi.list(id),
      lessonImageGenV2Api.listGenerations({ course_id: id }),
    ])
    setTemplates(templateRows)
    setComposers(composerRows)
    setHistory(historyRows)
    const currentType = form.getFieldValue('image_type') || 'submerge_sequence'
    const typedTemplates = templateRows.filter((item) => item.image_type === currentType)
    const typedComposers = composerRows.filter((item) => item.image_type === currentType)
    const activeTemplate = typedTemplates.find((item) => item.is_active) || typedTemplates[0] || null
    const activeComposer = typedComposers.find((item) => item.is_active) || typedComposers[0] || null
    setSelectedTemplate(activeTemplate)
    form.setFieldValue('template_id', activeTemplate?.id)
    form.setFieldValue('composer_id', activeComposer?.id)
  }, [form])

  const refreshHistory = useCallback(async () => {
    if (!courseId) return
    setHistory(await lessonImageGenV2Api.listGenerations({ course_id: courseId, image_type: imageType }))
  }, [courseId, imageType])

  useEffect(() => {
    void loadCourses().catch((e: unknown) => message.error(e instanceof Error ? e.message : '课程加载失败'))
  }, [loadCourses])

  useEffect(() => {
    void loadCourseResources(courseId).catch((e: unknown) => message.error(e instanceof Error ? e.message : '课节图配置加载失败'))
  }, [courseId, loadCourseResources])

  useEffect(() => {
    const next = templates.find((item) => item.id === templateId) || null
    setSelectedTemplate(next)
  }, [templateId, templates])

  useEffect(() => {
    if (!imageType) return
    const activeTemplate = filteredTemplates.find((item) => item.is_active) || filteredTemplates[0] || null
    const activeComposer = filteredComposers.find((item) => item.is_active) || filteredComposers[0] || null
    form.setFieldValue('template_id', activeTemplate?.id)
    form.setFieldValue('composer_id', activeComposer?.id)
    setSelectedTemplate(activeTemplate)
  }, [filteredComposers, filteredTemplates, form, imageType])

  useEffect(() => {
    if (!selectedTemplate) {
      setStyleBibleText('{}')
      setSceneArchetypesText('[]')
      return
    }
    setStyleBibleText(prettyJson(selectedTemplate.style_bible))
    setSceneArchetypesText(prettyJson(selectedTemplate.scene_archetypes))
  }, [selectedTemplate])

  const requestBody = useCallback(async (): Promise<LessonImageComposeV2Request> => {
    const values = await form.validateFields()
    if (!values.course_id) throw new Error('请选择课程')
    return {
      course_id: values.course_id,
      lesson_id: values.lesson_id || null,
      node_id: values.node_id || null,
      image_type: values.image_type,
      template_id: values.template_id || null,
      composer_id: values.composer_id || null,
      node_script: values.node_script,
      full_course_script: values.full_course_script,
      whiteboard_outline: values.whiteboard_outline || null,
      reference_image_url: values.reference_image_url || null,
      reference_image_note: values.reference_image_note || null,
    }
  }, [form])

  const saveTemplateHarness = async () => {
    if (!selectedTemplate) {
      message.warning('请先选择模板')
      return
    }
    setSavingTemplate(true)
    try {
      const styleBible = parseJsonObject(styleBibleText, 'Style Bible')
      const sceneArchetypes = parseJsonArray(sceneArchetypesText, 'Scene Archetypes')
      const updated = await courseImageTemplateApi.update(selectedTemplate.id, {
        style_bible: styleBible as CourseStyleBible,
        scene_archetypes: sceneArchetypes as SceneArchetype[],
      })
      setTemplates((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      setSelectedTemplate(updated)
      message.success('V2 Harness 配置已保存到模板')
    } catch (e) {
      message.error(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSavingTemplate(false)
    }
  }

  const composePrompt = async () => {
    setLoading(true)
    try {
      const body = await requestBody()
      const result = await lessonImageGenV2Api.composePrompt(body)
      setComposeResult(result)
      setGeneration(null)
      setStep(2)
      message.success('Composer + Style Check 完成')
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Prompt 生成失败')
    } finally {
      setLoading(false)
    }
  }

  const generateImage = async () => {
    setLoading(true)
    try {
      const body = await requestBody()
      const result = await lessonImageGenV2Api.generate({
        ...body,
        composer_output: composeResult?.composer_output,
        final_image_prompt: composeResult?.final_image_prompt,
        params: composeResult?.params,
        composer_duration_ms: composeResult?.composer_duration_ms,
      })
      setGeneration(result)
      setStep(4)
      await refreshHistory()
      if (result.status === 'success') message.success('图片生成成功')
      else message.error(result.error_message || '图片生成失败')
    } catch (e) {
      message.error(e instanceof Error ? e.message : '图片生成失败')
    } finally {
      setLoading(false)
    }
  }

  const styleCheckIcon = useMemo(() => {
    const result = composeResult?.style_check_result
    if (!result) return null
    return result.pass ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
  }, [composeResult])

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div>
        <Title level={4} style={{ marginBottom: 4 }}>
          课节图片生成器 V2
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          基于 Course Style Bible、Scene Archetype、类型专属 Composer 和 Style Check 的新 Harness。原 V1 页面保持不变。
        </Paragraph>
      </div>

      <Steps
        current={step}
        onChange={setStep}
        items={[
          { title: '上下文', description: '课程与台词' },
          { title: 'Harness', description: 'Style Bible / Archetype' },
          { title: 'Composer', description: '结构化 Prompt JSON' },
          { title: 'Style Check', description: '风格与约束检查', icon: styleCheckIcon || undefined },
          { title: '生成', description: 'OSS 签名预览' },
        ]}
      />

      <Row gutter={16}>
        <Col xs={24} lg={9}>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Card title="输入上下文" size="small">
              <Form
                form={form}
                layout="vertical"
                initialValues={{
                  image_type: 'submerge_sequence',
                  node_script: '',
                  full_course_script: '',
                }}
              >
                <Row gutter={8}>
                  <Col span={14}>
                    <Form.Item name="course_id" label="课程" rules={[{ required: true, message: '请选择课程' }]}>
                      <Select
                        showSearch
                        optionFilterProp="label"
                        options={courses.map((item) => ({ value: item.id, label: item.title }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={10}>
                    <Form.Item name="image_type" label="图片类型" rules={[{ required: true }]}>
                      <Select
                        options={[
                          { value: 'submerge_sequence', label: '沉浸式讲解图' },
                          { value: 'whiteboard', label: '白板图' },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="template_id" label="模板">
                  <Select
                    allowClear
                    placeholder="不选则使用当前课程 active 模板"
                    options={filteredTemplates.map((item) => ({
                      value: item.id,
                      label: `${item.template_key}@${item.template_version}${item.is_active ? ' · active' : ''}`,
                    }))}
                  />
                </Form.Item>
                <Form.Item name="composer_id" label="Composer">
                  <Select
                    allowClear
                    placeholder="V2 默认使用内置 Harness Composer"
                    options={filteredComposers.map((item) => ({
                      value: item.id,
                      label: `${item.composer_key}@${item.composer_version}${item.is_active ? ' · active' : ''}`,
                    }))}
                  />
                </Form.Item>
                <Row gutter={8}>
                  <Col span={12}>
                    <Form.Item name="lesson_id" label="Lesson ID">
                      <Input placeholder="可选" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item name="node_id" label="Node ID">
                      <Input placeholder="可选" />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name="node_script" label="当前 Node 台词" rules={[{ required: true, message: '请输入当前台词' }]}>
                  <TextArea rows={5} placeholder="当前节点讲解文本" />
                </Form.Item>
                <Form.Item name="full_course_script" label="全课台词" rules={[{ required: true, message: '请输入全课台词' }]}>
                  <TextArea rows={5} placeholder="用于保持同课风格与内容一致性" />
                </Form.Item>
                {imageType === 'whiteboard' && (
                  <Form.Item name="whiteboard_outline" label="白板大纲">
                    <TextArea rows={4} placeholder="白板图的分组、文字和图标规划" />
                  </Form.Item>
                )}
                <Form.Item name="reference_image_url" label="参考图 URL">
                  <ImageOssUploadField placeholder="可选：上传或粘贴参考图 URL" />
                </Form.Item>
                <Form.Item name="reference_image_note" label="参考图说明">
                  <TextArea rows={3} placeholder="说明参考构图、字体密度、风格，不要让模型复制无关细节" />
                </Form.Item>
              </Form>
            </Card>

            <Card
              title="V2 Harness 配置"
              size="small"
              extra={
                <Button size="small" loading={savingTemplate} onClick={() => void saveTemplateHarness()}>
                  保存到模板
                </Button>
              }
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text type="secondary">
                  当前模板：{selectedTemplate ? `${selectedTemplate.template_key}@${selectedTemplate.template_version}` : '未选择'}
                </Text>
                <Text strong>Course Style Bible</Text>
                <TextArea rows={9} value={styleBibleText} onChange={(e) => setStyleBibleText(e.target.value)} />
                <Text strong>Scene Archetypes</Text>
                <TextArea rows={9} value={sceneArchetypesText} onChange={(e) => setSceneArchetypesText(e.target.value)} />
              </Space>
            </Card>
          </Space>
        </Col>

        <Col xs={24} lg={9}>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Card
              title={`Composer 预览 · ${selectedImageTypeLabel}`}
              size="small"
              extra={
                <Space>
                  <Button onClick={() => void composePrompt()} loading={loading}>
                    生成 Prompt
                  </Button>
                  <Button type="primary" onClick={() => void generateImage()} loading={loading}>
                    生成图片
                  </Button>
                </Space>
              }
            >
              {!composeResult ? (
                <Alert type="info" showIcon message="先点击“生成 Prompt”，查看 Composer 输出与 Style Check 结果。" />
              ) : (
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <Text strong>Composer Output</Text>
                  <TextArea rows={12} value={prettyJson(composeResult.composer_output)} readOnly />
                  <Divider style={{ margin: '8px 0' }} />
                  <Space align="center">
                    <Text strong>Style Check</Text>
                    {composeResult.style_check_result?.pass ? <Tag color="success">通过</Tag> : <Tag color="error">需要注意</Tag>}
                  </Space>
                  <TextArea rows={5} value={prettyJson(composeResult.style_check_result)} readOnly />
                  <Divider style={{ margin: '8px 0' }} />
                  <Text strong>Final Image Prompt</Text>
                  <TextArea rows={14} value={composeResult.final_image_prompt} readOnly />
                </Space>
              )}
            </Card>
          </Space>
        </Col>

        <Col xs={24} lg={6}>
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Card title="生成结果" size="small">
              {!generation ? (
                <Text type="secondary">暂无 V2 生成结果。</Text>
              ) : (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Space>
                    {generationStatusTag(generation.status)}
                    <Text type="secondary">{generation.scene_archetype || '未记录 archetype'}</Text>
                  </Space>
                  {generation.image_access_url && (
                    <Image src={generation.image_access_url} alt="课节图片 V2" style={{ width: '100%', objectFit: 'contain' }} />
                  )}
                  {generation.error_message && <Alert type="error" showIcon message={generation.error_message} />}
                  <TextArea rows={7} value={prettyJson(generation.style_check_result)} readOnly />
                </Space>
              )}
            </Card>

            <Card
              title="历史记录"
              size="small"
              extra={<Button size="small" icon={<ReloadOutlined />} onClick={() => void refreshHistory()} />}
            >
              <Space direction="vertical" style={{ width: '100%' }}>
                {history.length === 0 && <Text type="secondary">暂无历史记录。</Text>}
                {history.slice(0, 8).map((item) => (
                  <Card
                    key={item.id}
                    size="small"
                    hoverable
                    onClick={() => {
                      setGeneration(item)
                      setStep(4)
                    }}
                  >
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Space>
                        {generationStatusTag(item.status)}
                        <Text>{item.image_type === 'whiteboard' ? '白板' : '沉浸式'}</Text>
                      </Space>
                      <Text type="secondary" ellipsis>
                        {item.scene_archetype || item.id}
                      </Text>
                      {item.image_access_url && (
                        <Image
                          src={item.image_access_url}
                          alt="历史预览"
                          preview={false}
                          style={{ width: '100%', maxHeight: 120, objectFit: 'contain' }}
                        />
                      )}
                    </Space>
                  </Card>
                ))}
              </Space>
            </Card>
          </Space>
        </Col>
      </Row>
    </Space>
  )
}
