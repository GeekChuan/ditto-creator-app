import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  Button,
  Card,
  Col,
  Collapse,
  Divider,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowUpOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  CopyOutlined,
  PictureOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import {
  buildHeroPromptAssistantMessage,
  HERO_PROMPT_TEMPLATE_EN,
} from '../constants/courseHeroPrompt'
import {
  coursesApi,
  LESSON_TYPE_ATB_REACTION,
  LESSON_TYPE_MATERIAL_LIBRARY,
  type CourseOut,
  type CourseUpdate,
  type LessonCreate,
  type LessonOut,
  type LessonUpdate,
  type MilestoneCreate,
  type MilestoneOut,
  type MilestoneUpdate,
} from '../api/courses'
import { assetsApi, type VideoAsset } from '../api/assets'
import ImageOssUploadField from '../components/ImageOssUploadField'
import CourseThemeField from '../components/CourseThemeField'
import CourseBrandingField from '../components/CourseBrandingField'
import CourseHomePreviewFrame from '../components/CourseHomePreviewFrame'
import { creatorProfileApi, type CreatorProfileOut } from '../api/creatorProfile'
import { buildCoursePreviewDetail } from '../utils/buildCoursePreviewDetail'
import { signCoursePreviewDetail } from '../utils/signCoursePreviewDetail'

const { Title, Text, Paragraph } = Typography

function atbPayloadForEditor(row: LessonOut): Record<string, unknown> | null {
  const a = row.atb_ditto_payload
  if (a && typeof a === 'object' && Object.keys(a).length > 0) return a
  if (row.lesson_type === LESSON_TYPE_ATB_REACTION && row.ditto_payload) {
    return row.ditto_payload
  }
  return null
}

function lessonTypeTag(lessonType: string) {
  if (lessonType === LESSON_TYPE_MATERIAL_LIBRARY) {
    return <Tag color="blue">素材自学</Tag>
  }
  if (lessonType === LESSON_TYPE_ATB_REACTION) {
    return <Tag color="purple">ATB 互动</Tag>
  }
  return <Tag>{lessonType}</Tag>
}

function useDebouncedAssetSearch(
  fn: (keyword: string) => Promise<void>,
  ms: number,
): (keyword: string) => void {
  const t = useRef<ReturnType<typeof setTimeout> | null>(null)
  return useCallback(
    (keyword: string) => {
      if (t.current) clearTimeout(t.current)
      t.current = setTimeout(() => {
        void fn(keyword)
      }, ms)
    },
    [fn, ms],
  )
}

export default function CourseDetailPage() {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const [course, setCourse] = useState<CourseOut | null>(null)
  const [milestones, setMilestones] = useState<MilestoneOut[]>([])
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null)
  const [lessons, setLessons] = useState<LessonOut[]>([])
  const [loadingCourse, setLoadingCourse] = useState(true)
  const [loadingLessons, setLoadingLessons] = useState(false)
  const [savingCourseMeta, setSavingCourseMeta] = useState(false)
  const [courseForm] = Form.useForm<CourseUpdate>()

  const [msModalOpen, setMsModalOpen] = useState(false)
  const [editingMs, setEditingMs] = useState<MilestoneOut | null>(null)
  const [msForm] = Form.useForm<MilestoneCreate & MilestoneUpdate>()

  const [lessonModalOpen, setLessonModalOpen] = useState(false)
  const [editingLesson, setEditingLesson] = useState<LessonOut | null>(null)
  const [lessonForm] = Form.useForm<LessonCreate & LessonUpdate>()
  const currentLessonType = Form.useWatch('lesson_type', lessonForm)
  const [assetOptions, setAssetOptions] = useState<{ label: string; value: string }[]>([])
  const [assetSearchLoading, setAssetSearchLoading] = useState(false)

  const [atbJsonModalOpen, setAtbJsonModalOpen] = useState(false)
  const [atbJsonLesson, setAtbJsonLesson] = useState<LessonOut | null>(null)
  const [atbJsonText, setAtbJsonText] = useState('')
  const [atbJsonSaving, setAtbJsonSaving] = useState(false)
  const [allPreviewLessons, setAllPreviewLessons] = useState<LessonOut[]>([])
  const [creatorProfile, setCreatorProfile] = useState<CreatorProfileOut | null>(null)
  const decorFormValues = Form.useWatch([], courseForm)

  const loadCourseTree = useCallback(async () => {
    if (!courseId) return
    setLoadingCourse(true)
    try {
      const [c, ms] = await Promise.all([
        coursesApi.getCourse(courseId),
        coursesApi.listMilestones(courseId),
      ])
      setCourse(c)
      const ordered = [...ms].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at))
      setMilestones(ordered)
      setSelectedMilestoneId((prev) => {
        if (prev && ordered.some((m) => m.id === prev)) return prev
        return ordered[0]?.id ?? null
      })
    } catch {
      message.error('加载课程失败')
      setCourse(null)
    } finally {
      setLoadingCourse(false)
    }
  }, [courseId])

  const loadLessons = useCallback(async () => {
    if (!selectedMilestoneId) {
      setLessons([])
      return
    }
    setLoadingLessons(true)
    try {
      const list = await coursesApi.listLessons(selectedMilestoneId)
      setLessons([...list].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at)))
    } catch {
      message.error('加载课节失败')
    } finally {
      setLoadingLessons(false)
    }
  }, [selectedMilestoneId])

  useEffect(() => {
    void loadCourseTree()
  }, [loadCourseTree])

  useEffect(() => {
    void creatorProfileApi.getProfile().then(setCreatorProfile).catch(() => setCreatorProfile(null))
  }, [])

  useEffect(() => {
    if (!milestones.length) {
      setAllPreviewLessons([])
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const lists = await Promise.all(milestones.map((ms) => coursesApi.listLessons(ms.id)))
        if (!cancelled) {
          setAllPreviewLessons(lists.flat())
        }
      } catch {
        if (!cancelled) setAllPreviewLessons([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [milestones, lessons])

  const rawPreviewDetail = useMemo(() => {
    if (!course) return null
    const formValues = (decorFormValues ?? {}) as CourseUpdate
    return buildCoursePreviewDetail({
      course,
      formValues,
      milestones,
      allLessons: allPreviewLessons,
      creatorProfile,
    })
  }, [course, decorFormValues, milestones, allPreviewLessons, creatorProfile])

  const [previewDetail, setPreviewDetail] = useState(rawPreviewDetail)
  const previewSignGenRef = useRef(0)

  useEffect(() => {
    if (!rawPreviewDetail) {
      setPreviewDetail(null)
      return
    }
    const gen = ++previewSignGenRef.current
    void signCoursePreviewDetail(rawPreviewDetail)
      .then((signed) => {
        if (previewSignGenRef.current === gen) {
          setPreviewDetail(signed)
        }
      })
      .catch(() => {
        if (previewSignGenRef.current === gen) {
          setPreviewDetail(rawPreviewDetail)
        }
      })
  }, [rawPreviewDetail])

  useEffect(() => {
    if (course) {
      courseForm.setFieldsValue({
        title: course.title,
        description: course.description ?? undefined,
        sort_order: course.sort_order,
        cover_image_url: course.cover_image_url ?? undefined,
        theme_color: course.theme_color ?? undefined,
        branding: course.branding ?? undefined,
      })
    }
  }, [course, courseForm])

  useEffect(() => {
    void loadLessons()
  }, [loadLessons])

  const runAssetSearch = useCallback(async (keyword: string) => {
    setAssetSearchLoading(true)
    try {
      const res = await assetsApi.list({ keyword: keyword || undefined, page_size: 30, page: 1 })
      setAssetOptions(
        res.items.map((a: VideoAsset) => ({
          value: a.id,
          label: `${a.title || '未命名'} · ${a.id.slice(0, 8)}…`,
        })),
      )
    } catch {
      setAssetOptions([])
    } finally {
      setAssetSearchLoading(false)
    }
  }, [])

  const searchAssets = useDebouncedAssetSearch(runAssetSearch, 300)

  useEffect(() => {
    if (lessonModalOpen) {
      void runAssetSearch('')
    }
  }, [lessonModalOpen, runAssetSearch])

  const openCreateMilestone = () => {
    setEditingMs(null)
    msForm.resetFields()
    setMsModalOpen(true)
  }

  const openEditMilestone = (m: MilestoneOut) => {
    setEditingMs(m)
    msForm.setFieldsValue({
      title: m.title,
      description: m.description ?? undefined,
    })
    setMsModalOpen(true)
  }

  const submitMilestone = async () => {
    if (!courseId) return
    try {
      const values = await msForm.validateFields()
      if (editingMs) {
        await coursesApi.updateMilestone(editingMs.id, values)
        message.success('已更新里程碑')
      } else {
        await coursesApi.createMilestone(courseId, values as MilestoneCreate)
        message.success('已创建里程碑')
      }
      setMsModalOpen(false)
      void loadCourseTree()
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'errorFields' in e) return
      message.error('保存失败')
    }
  }

  const deleteMilestone = (m: MilestoneOut) => {
    Modal.confirm({
      title: '删除里程碑',
      content: `确定删除「${m.title}」？其下课节将一并删除。`,
      okType: 'danger',
      onOk: async () => {
        try {
          await coursesApi.deleteMilestone(m.id)
          message.success('已删除')
          if (selectedMilestoneId === m.id) setSelectedMilestoneId(null)
          void loadCourseTree()
        } catch {
          message.error('删除失败')
        }
      },
    })
  }

  const moveMilestone = async (index: number, dir: -1 | 1) => {
    const j = index + dir
    if (j < 0 || j >= milestones.length) return
    const a = milestones[index]
    const b = milestones[j]
    const pa = a.position
    const pb = b.position
    try {
      await coursesApi.updateMilestone(a.id, { position: pb })
      await coursesApi.updateMilestone(b.id, { position: pa })
      void loadCourseTree()
    } catch {
      message.error('调整顺序失败')
    }
  }

  const openCreateLesson = () => {
    if (!selectedMilestoneId) {
      message.warning('请先选择一个里程碑')
      return
    }
    setEditingLesson(null)
    lessonForm.resetFields()
    lessonForm.setFieldsValue({ lesson_type: LESSON_TYPE_MATERIAL_LIBRARY })
    setLessonModalOpen(true)
  }

  const saveCourseMeta = async () => {
    if (!courseId) return
    try {
      const values = await courseForm.validateFields()
      setSavingCourseMeta(true)
      const updated = await coursesApi.updateCourse(courseId, values)
      setCourse(updated)
      message.success('已保存课程元数据')
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'errorFields' in e) return
      message.error('保存失败')
    } finally {
      setSavingCourseMeta(false)
    }
  }

  const openEditLesson = (row: LessonOut) => {
    setEditingLesson(row)
    lessonForm.setFieldsValue({
      title: row.title,
      description: row.description ?? undefined,
      lesson_type: row.lesson_type,
      video_asset_id: row.video_asset_id ?? undefined,
      cover_image_url: row.cover_image_url ?? undefined,
      duration_minutes: row.duration_minutes ?? undefined,
    })
    if (row.video_asset_id) {
      setAssetOptions([
        {
          value: row.video_asset_id,
          label: `当前素材 · ${row.video_asset_id.slice(0, 8)}…`,
        },
      ])
    }
    setLessonModalOpen(true)
  }

  const submitLesson = async () => {
    if (!selectedMilestoneId) return
    try {
      const values = await lessonForm.validateFields()
      const payload = { ...values } as LessonCreate & LessonUpdate
      if (editingLesson) {
        await coursesApi.updateLesson(editingLesson.id, payload as LessonUpdate)
        message.success('已更新课节')
      } else {
        await coursesApi.createLesson(selectedMilestoneId, payload as LessonCreate)
        message.success('已创建课节')
      }
      setLessonModalOpen(false)
      void loadLessons()
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'errorFields' in e) return
      message.error('保存失败')
    }
  }

  const deleteLesson = (row: LessonOut) => {
    Modal.confirm({
      title: '删除课节',
      content: `确定删除「${row.title}」？`,
      okType: 'danger',
      onOk: async () => {
        try {
          await coursesApi.deleteLesson(row.id)
          message.success('已删除')
          void loadLessons()
        } catch {
          message.error('删除失败')
        }
      },
    })
  }

  const openAtbJsonEditor = (row: LessonOut) => {
    setAtbJsonLesson(row)
    const existing = atbPayloadForEditor(row)
    setAtbJsonText(
      existing ? JSON.stringify(existing, null, 2) : '{\n  "metadata": {},\n  "nodes": []\n}',
    )
    setAtbJsonModalOpen(true)
  }

  const submitAtbJson = async () => {
    if (!atbJsonLesson) return
    let doc: Record<string, unknown>
    try {
      doc = JSON.parse(atbJsonText) as Record<string, unknown>
    } catch {
      message.error('JSON 格式无效')
      return
    }
    setAtbJsonSaving(true)
    try {
      await coursesApi.putLessonAtbDitto(atbJsonLesson.id, doc)
      message.success('已保存 ATB 脚本')
      setAtbJsonModalOpen(false)
      setAtbJsonLesson(null)
      void loadLessons()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } }
      const d = err?.response?.data?.detail
      message.error(typeof d === 'string' ? d : '保存失败')
    } finally {
      setAtbJsonSaving(false)
    }
  }

  const rebuildLesson = async (row: LessonOut) => {
    if (row.lesson_type !== LESSON_TYPE_MATERIAL_LIBRARY) {
      message.warning('仅素材自学课支持刷新 Ditto')
      return
    }
    if (!row.video_asset_id) {
      message.warning('请先绑定自学素材后再刷新 Ditto')
      return
    }
    try {
      await coursesApi.rebuildLessonDitto(row.id)
      message.success('已根据素材重新生成自学快照')
      void loadLessons()
    } catch {
      message.error('重建失败')
    }
  }

  const hasSelfStudy = (row: LessonOut) => row.lesson_type === LESSON_TYPE_MATERIAL_LIBRARY
  const hasAtb = (row: LessonOut) => row.lesson_type === LESSON_TYPE_ATB_REACTION

  if (!courseId) {
    return null
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/courses')}>
          返回列表
        </Button>
      </Space>

      <Card
        title="课程主页装修"
        style={{ marginBottom: 16 }}
        loading={loadingCourse}
        extra={
          <Button type="primary" loading={savingCourseMeta} onClick={() => void saveCourseMeta()}>
            保存装修
          </Button>
        }
      >
        <Form form={courseForm} layout="vertical">
          <Row gutter={[24, 24]}>
            <Col xs={24} xl={14}>
              <Form.Item name="title" label="课程标题" rules={[{ required: true, message: '请输入标题' }]}>
                <Input />
              </Form.Item>
              <Form.Item name="description" label="课程副标题 / 描述">
                <Input.TextArea rows={2} placeholder="Learner Hero 区副标题" />
              </Form.Item>
              <Form.Item name="sort_order" label="排序">
                <Input type="number" />
              </Form.Item>
              <Form.Item
                name="theme_color"
                label="课程主题色"
                extra="Learner 课程详情与课节 UI 主色（按钮、进度、高亮等）"
              >
                <CourseThemeField />
              </Form.Item>
              <Form.Item
                name="branding"
                label="视觉个性（纹理 / 图标）"
                extra="页面背景暗纹 + 课节数/继续学习按钮共用图标"
              >
                <CourseBrandingField />
              </Form.Item>
            </Col>
            <Col xs={24} xl={10}>
              <Form.Item
                name="cover_image_url"
                label="Hero 封面（优先于课节封面聚合）"
                extra={
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Text type="secondary">
                      16:9 横图（推荐 1536×1024）；留空则使用课节封面。规范见{' '}
                      <Text code>docs/course-hero-cover-design-spec.md</Text>
                    </Text>
                    <Space wrap>
                      <Link to="/image-creative">
                        <Button size="small" icon={<PictureOutlined />}>
                          图片创意生图
                        </Button>
                      </Link>
                      <Button
                        size="small"
                        icon={<CopyOutlined />}
                        onClick={() => {
                          const title = courseForm.getFieldValue('title') as string | undefined
                          const desc = courseForm.getFieldValue('description') as string | undefined
                          void navigator.clipboard.writeText(
                            buildHeroPromptAssistantMessage(title ?? '', desc ?? ''),
                          )
                          message.success('已复制顾问话术，可在图片创意左侧对话粘贴')
                        }}
                      >
                        复制顾问话术
                      </Button>
                      <Button
                        size="small"
                        onClick={() => {
                          void navigator.clipboard.writeText(HERO_PROMPT_TEMPLATE_EN)
                          message.success('已复制英文 gpt-image 模板')
                        }}
                      >
                        复制英文模板
                      </Button>
                    </Space>
                  </Space>
                }
              >
                <ImageOssUploadField placeholder="上传课程封面" />
              </Form.Item>
              <div style={{ marginTop: 24 }}>
                <CourseHomePreviewFrame courseId={courseId} previewDetail={previewDetail} />
              </div>
            </Col>
          </Row>
        </Form>
      </Card>

      <Row gutter={16}>
        <Col xs={24} md={8}>
          <Card
            title="里程碑"
            extra={
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openCreateMilestone}>
                新建
              </Button>
            }
          >
            <List
              loading={loadingCourse}
              dataSource={milestones}
              locale={{ emptyText: '暂无里程碑' }}
              renderItem={(item, index) => (
                <List.Item
                  style={{
                    cursor: 'pointer',
                    background: selectedMilestoneId === item.id ? 'var(--ant-color-primary-bg)' : undefined,
                    padding: '8px 12px',
                    borderRadius: 8,
                  }}
                  onClick={() => setSelectedMilestoneId(item.id)}
                  actions={[
                    <Button
                      key="up"
                      type="text"
                      size="small"
                      icon={<ArrowUpOutlined />}
                      disabled={index === 0}
                      onClick={(e) => {
                        e.stopPropagation()
                        void moveMilestone(index, -1)
                      }}
                    />,
                    <Button
                      key="down"
                      type="text"
                      size="small"
                      icon={<ArrowDownOutlined />}
                      disabled={index === milestones.length - 1}
                      onClick={(e) => {
                        e.stopPropagation()
                        void moveMilestone(index, 1)
                      }}
                    />,
                    <Button
                      key="edit"
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={(e) => {
                        e.stopPropagation()
                        openEditMilestone(item)
                      }}
                    />,
                    <Button
                      key="del"
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteMilestone(item)
                      }}
                    />,
                  ]}
                >
                  <List.Item.Meta title={item.title} description={item.description || undefined} />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} md={16}>
          <Card
            title={selectedMilestoneId ? '课节' : '请选择里程碑'}
            extra={
              <Button
                type="primary"
                size="small"
                icon={<PlusOutlined />}
                disabled={!selectedMilestoneId}
                onClick={openCreateLesson}
              >
                新建课节
              </Button>
            }
          >
            <Spin spinning={loadingLessons}>
              {!selectedMilestoneId ? (
                <Text type="secondary">请选择左侧里程碑</Text>
              ) : lessons.length === 0 ? (
                <Text type="secondary">暂无课节，点击「新建课节」添加</Text>
              ) : (
                <Space direction="vertical" size={16} style={{ width: '100%' }}>
                  {lessons.map((row) => (
                    <Card
                      key={row.id}
                      size="small"
                      styles={{ body: { paddingTop: 12 } }}
                      title={
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => openEditLesson(row)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') openEditLesson(row)
                          }}
                          style={{ cursor: 'pointer' }}
                        >
                          <Text strong ellipsis style={{ maxWidth: '100%', display: 'block' }} title={row.title}>
                            {row.title}
                          </Text>
                        </div>
                      }
                      extra={
                        <Space size="small" wrap onClick={(e) => e.stopPropagation()}>
                          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditLesson(row)}>
                            编辑元数据
                          </Button>
                          <Button type="link" size="small" danger icon={<DeleteOutlined />} onClick={() => deleteLesson(row)}>
                            删除
                          </Button>
                        </Space>
                      }
                    >
                      <Paragraph
                        type="secondary"
                        ellipsis={{ rows: 2, expandable: false }}
                        style={{ marginBottom: 12, minHeight: 44 }}
                      >
                        {row.description?.trim() || '（无描述）'}
                      </Paragraph>
                      <Space size={[4, 4]} wrap style={{ marginBottom: 12 }}>
                        {lessonTypeTag(row.lesson_type)}
                        {hasSelfStudy(row) ? <Tag color="green">素材课</Tag> : null}
                        {hasAtb(row) ? <Tag color="magenta">ATB课</Tag> : null}
                        {row.duration_minutes ? <Tag>{row.duration_minutes} 分钟</Tag> : null}
                        {row.cover_image_url ? <Tag color="cyan">有封面</Tag> : null}
                      </Space>

                      {row.lesson_type === LESSON_TYPE_MATERIAL_LIBRARY ? (
                        <>
                          <Divider orientation="left" plain style={{ margin: '8px 0' }}>
                            素材自学配置
                          </Divider>
                          <Space direction="vertical" size="small" style={{ width: '100%' }}>
                            <Text type="secondary">
                              素材：{' '}
                              {row.video_asset_id ? (
                                <Text copyable={{ text: row.video_asset_id }}>{row.video_asset_id.slice(0, 10)}…</Text>
                              ) : (
                                '未绑定（在「编辑元数据」中选择）'
                              )}
                            </Text>
                            <Space wrap onClick={(e) => e.stopPropagation()}>
                              <Button size="small" disabled={!row.video_asset_id} onClick={() => void rebuildLesson(row)}>
                                刷新 Ditto 快照
                              </Button>
                            </Space>
                            {row.ditto_payload ? (
                              <Collapse
                                size="small"
                                items={[
                                  {
                                    key: 'self',
                                    label: '自学 ditto_payload 预览',
                                    children: (
                                      <pre
                                        style={{
                                          margin: 0,
                                          maxHeight: 280,
                                          overflow: 'auto',
                                          fontSize: 12,
                                          background: '#0d1117',
                                          color: '#e6edf3',
                                          padding: 12,
                                          borderRadius: 6,
                                        }}
                                      >
                                        {JSON.stringify(row.ditto_payload, null, 2)}
                                      </pre>
                                    ),
                                  },
                                ]}
                              />
                            ) : (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                暂无自学快照（绑定素材并保存或点「刷新」）
                              </Text>
                            )}
                          </Space>
                        </>
                      ) : (
                        <>
                          <Divider orientation="left" plain style={{ margin: '16px 0 8px' }}>
                            ATB 脚本配置
                          </Divider>
                          <Space direction="vertical" size="small" style={{ width: '100%' }} onClick={(e) => e.stopPropagation()}>
                            <Button size="small" type="primary" icon={<FileTextOutlined />} onClick={() => openAtbJsonEditor(row)}>
                              脚本 JSON
                            </Button>
                            {hasAtb(row) ? (
                              <Collapse
                                size="small"
                                items={[
                                  {
                                    key: 'atb',
                                    label: 'ATB 脚本预览',
                                    children: (
                                      <pre
                                        style={{
                                          margin: 0,
                                          maxHeight: 280,
                                          overflow: 'auto',
                                          fontSize: 12,
                                          background: '#0d1117',
                                          color: '#e6edf3',
                                          padding: 12,
                                          borderRadius: 6,
                                        }}
                                      >
                                        {JSON.stringify(row.atb_ditto_payload ?? {}, null, 2)}
                                      </pre>
                                    ),
                                  },
                                ]}
                              />
                            ) : (
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                尚未保存 ATB 脚本
                              </Text>
                            )}
                          </Space>
                        </>
                      )}
                    </Card>
                  ))}
                </Space>
              )}
            </Spin>
          </Card>
        </Col>
      </Row>

      <Modal
        title={editingMs ? '编辑里程碑' : '新建里程碑'}
        open={msModalOpen}
        onCancel={() => setMsModalOpen(false)}
        onOk={() => void submitMilestone()}
        destroyOnClose
      >
        <Form form={msForm} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="描述">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={editingLesson ? '编辑课节' : '新建课节'}
        open={lessonModalOpen}
        onCancel={() => setLessonModalOpen(false)}
        onOk={() => void submitLesson()}
        width={560}
        destroyOnClose
      >
        <Form form={lessonForm} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item
            name="lesson_type"
            label="课节类型"
            initialValue={LESSON_TYPE_MATERIAL_LIBRARY}
            rules={[{ required: true, message: '请选择课节类型' }]}
          >
            <Select
              options={[
                { label: '素材自学课', value: LESSON_TYPE_MATERIAL_LIBRARY },
                { label: 'ATB 互动课', value: LESSON_TYPE_ATB_REACTION },
              ]}
            />
          </Form.Item>
          <Form.Item
            name="title"
            label="标题（单行）"
            rules={[
              { required: true, message: '请输入标题' },
              {
                validator: (_: unknown, v: string) => {
                  if (v && /[\r\n]/.test(String(v))) {
                    return Promise.reject(new Error('标题不能包含换行'))
                  }
                  return Promise.resolve()
                },
              },
            ]}
          >
            <Input maxLength={200} showCount placeholder="课节对外标题" />
          </Form.Item>
          <Form.Item
            name="description"
            label="描述（最多两行）"
            rules={[
              {
                validator: (_: unknown, v: string) => {
                  if (!v || !String(v).trim()) return Promise.resolve()
                  const lines = String(v).split('\n')
                  if (lines.length > 2) {
                    return Promise.reject(new Error('描述最多两行（最多一个换行）'))
                  }
                  return Promise.resolve()
                },
              },
            ]}
          >
            <Input.TextArea rows={2} maxLength={400} showCount placeholder="可选，最多两行" />
          </Form.Item>
          {currentLessonType === LESSON_TYPE_MATERIAL_LIBRARY ? (
            <Form.Item
              name="video_asset_id"
              label="自学素材"
              rules={[{ required: true, message: '素材自学课必须绑定素材' }]}
              extra="绑定后保存会自动生成自学 ditto 快照；可随时在卡片上点「刷新 Ditto」更新"
            >
              <Select
                allowClear
                showSearch
                filterOption={false}
                loading={assetSearchLoading}
                options={assetOptions}
                placeholder="搜索素材"
                onSearch={(k) => void searchAssets(k)}
              />
            </Form.Item>
          ) : currentLessonType === LESSON_TYPE_ATB_REACTION ? (
            <Form.Item
              name="video_asset_id"
              label="ATB 回放视频（可选）"
              extra="建议绑定，学习端将优先使用该素材生成稳定播放链接；未绑定时将回退到脚本 metadata.video_url"
            >
              <Select
                allowClear
                showSearch
                filterOption={false}
                loading={assetSearchLoading}
                options={assetOptions}
                placeholder="搜索素材或留空"
                onSearch={(k) => void searchAssets(k)}
              />
            </Form.Item>
          ) : null}
          <Form.Item name="cover_image_url" label="课节封面（可选）" extra="无课程 Hero 封面时参与 Learner 聚合">
            <ImageOssUploadField placeholder="上传课节封面" />
          </Form.Item>
          <Form.Item name="duration_minutes" label="时长（分钟）" extra="留空且已绑素材时，保存后服务端可从视频时长推算">
            <InputNumber min={1} style={{ width: '100%' }} placeholder="例如 15" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={atbJsonLesson ? `ATB 脚本 — ${atbJsonLesson.title}` : 'ATB 脚本'}
        open={atbJsonModalOpen}
        onCancel={() => {
          setAtbJsonModalOpen(false)
          setAtbJsonLesson(null)
        }}
        onOk={() => void submitAtbJson()}
        confirmLoading={atbJsonSaving}
        width={720}
        destroyOnClose
        okText="保存到课节"
      >
        <Paragraph type="secondary" style={{ marginTop: 0 }}>
          根级须含 <Text code>metadata</Text>（对象）与 <Text code>nodes</Text>（数组）。可与「课程 JSON 设计」页导出的
          lesson.json 一致。
        </Paragraph>
        <Input.TextArea
          value={atbJsonText}
          onChange={(e) => setAtbJsonText(e.target.value)}
          rows={20}
          style={{ fontFamily: 'monospace', fontSize: 12 }}
          spellCheck={false}
        />
      </Modal>
    </div>
  )
}
