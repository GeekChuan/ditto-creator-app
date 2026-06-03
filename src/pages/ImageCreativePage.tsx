import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Button,
  Card,
  Col,
  Empty,
  Image,
  Input,
  List,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd'
import { CopyOutlined, CloseOutlined, PictureOutlined, PlusOutlined, SendOutlined } from '@ant-design/icons'
import {
  extractCopyablePrompt,
  imageCreativeApi,
  type ImageCreativeGenerationOut,
  type ImageCreativeMessageOut,
  type ImageCreativeSessionOut,
} from '../api/imageCreative'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

const SIZE_OPTIONS = [
  { value: '1024x1024', label: '1:1 (1024×1024)' },
  { value: '1024x1536', label: '竖屏 (1024×1536)' },
  { value: '1536x1024', label: '横屏 (1536×1024)' },
]

function ChatBubble({ msg }: { msg: ImageCreativeMessageOut }) {
  const isUser = msg.role === 'user'
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: 12,
      }}
    >
      <div
        style={{
          maxWidth: '92%',
          padding: '10px 14px',
          borderRadius: 12,
          background: isUser ? '#1677ff' : '#f5f5f5',
          color: isUser ? '#fff' : 'inherit',
          whiteSpace: 'pre-wrap',
          fontSize: 13,
          lineHeight: 1.55,
        }}
      >
        {msg.content}
      </div>
    </div>
  )
}

export default function ImageCreativePage() {
  const [sessions, setSessions] = useState<ImageCreativeSessionOut[]>([])
  const [sessionId, setSessionId] = useState<string>()
  const [messages, setMessages] = useState<ImageCreativeMessageOut[]>([])
  const [generations, setGenerations] = useState<ImageCreativeGenerationOut[]>([])
  const [chatInput, setChatInput] = useState('')
  const [imagePrompt, setImagePrompt] = useState('')
  const [size, setSize] = useState('1024x1536')
  const [genMode, setGenMode] = useState<'generate' | 'edit'>('generate')
  const [referenceGeneration, setReferenceGeneration] = useState<ImageCreativeGenerationOut | null>(null)
  const [chatLoading, setChatLoading] = useState(false)
  const [genLoading, setGenLoading] = useState(false)
  const [initLoading, setInitLoading] = useState(true)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatComposingRef = useRef(false)

  const scrollChatToEnd = () => {
    requestAnimationFrame(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }))
  }

  const loadGenerations = useCallback(async () => {
    const rows = await imageCreativeApi.listGenerations()
    setGenerations(rows)
  }, [])

  const loadMessages = useCallback(async (sid: string) => {
    const rows = await imageCreativeApi.listMessages(sid)
    setMessages(rows)
    scrollChatToEnd()
  }, [])

  const ensureSession = useCallback(async (): Promise<string> => {
    if (sessionId) return sessionId
    const created = await imageCreativeApi.createSession()
    setSessions((prev) => [created, ...prev])
    setSessionId(created.id)
    return created.id
  }, [sessionId])

  useEffect(() => {
    const boot = async () => {
      setInitLoading(true)
      try {
        const [sess, gens] = await Promise.all([
          imageCreativeApi.listSessions(),
          imageCreativeApi.listGenerations(),
        ])
        setSessions(sess)
        setGenerations(gens)
        const sid = sess[0]?.id
        if (sid) {
          setSessionId(sid)
          await loadMessages(sid)
        }
      } finally {
        setInitLoading(false)
      }
    }
    void boot()
  }, [loadMessages])

  const onNewSession = async () => {
    const created = await imageCreativeApi.createSession()
    setSessions((prev) => [created, ...prev])
    setSessionId(created.id)
    setMessages([])
    message.success('已创建新对话')
  }

  const onSessionChange = async (sid: string) => {
    setSessionId(sid)
    setInitLoading(true)
    try {
      await loadMessages(sid)
    } finally {
      setInitLoading(false)
    }
  }

  const onSendChat = async () => {
    const text = chatInput.trim()
    if (!text) return
    setChatLoading(true)
    try {
      const sid = await ensureSession()
      const res = await imageCreativeApi.chat(sid, text)
      setMessages((prev) => [...prev, res.user_message, res.assistant_message])
      setChatInput('')
      scrollChatToEnd()
      const extracted = extractCopyablePrompt(res.assistant_message.content)
      if (extracted) setImagePrompt(extracted)
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      message.error(detail || '对话失败，请检查 UNIFIED_LLM 配置')
    } finally {
      setChatLoading(false)
    }
  }

  const onCopyPrompt = async () => {
    if (!imagePrompt.trim()) {
      message.warning('暂无提示词可复制')
      return
    }
    await navigator.clipboard.writeText(imagePrompt)
    message.success('已复制到剪贴板')
  }

  const onGenerate = async () => {
    const prompt = imagePrompt.trim()
    if (!prompt) {
      message.warning('请先填写或从左侧对话复制绘画提示词')
      return
    }
    if (genMode === 'edit' && !referenceGeneration) {
      message.warning('改图模式请先引用一张已生成的图片')
      return
    }
    setGenLoading(true)
    try {
      const row = await imageCreativeApi.createGeneration({
        prompt,
        session_id: sessionId,
        size,
        mode: genMode,
        reference_generation_id: genMode === 'edit' ? referenceGeneration?.id : undefined,
      })
      setGenerations((prev) => [row, ...prev])
      if (row.status === 'success') {
        message.success(genMode === 'edit' ? '改图已完成并保存' : '图片已生成并保存')
      } else {
        message.error(row.error_message || '生成失败')
      }
    } catch (e: unknown) {
      const detail = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      message.error(detail || '生图失败，请检查 IMAGE_GEN 配置')
    } finally {
      setGenLoading(false)
    }
  }

  const onReferenceForEdit = (item: ImageCreativeGenerationOut) => {
    if (item.status !== 'success' || !item.image_access_url) {
      message.warning('只能引用生成成功的图片')
      return
    }
    setGenMode('edit')
    setReferenceGeneration(item)
    message.success('已引用为改图底图')
  }

  const applyPromptFromMessage = (content: string) => {
    setImagePrompt(extractCopyablePrompt(content))
    message.info('已填入右侧绘画提示词')
  }

  if (initLoading && !sessions.length && !generations.length) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Space>
          <PictureOutlined style={{ fontSize: 22, color: '#1677ff' }} />
          <Title level={4} style={{ margin: 0 }}>
            图片创意
          </Title>
          <Text type="secondary">左侧协作写提示词 · 右侧文生图 / 引用历史图改图</Text>
        </Space>
      </Space>

      <Row gutter={16} style={{ minHeight: 'calc(100vh - 220px)' }}>
        <Col xs={24} lg={12}>
          <Card
            title="提示词生成"
            extra={
              <Space>
                <Select
                  style={{ width: 200 }}
                  placeholder="选择对话"
                  value={sessionId}
                  onChange={onSessionChange}
                  options={sessions.map((s) => ({
                    value: s.id,
                    label: s.title.length > 18 ? `${s.title.slice(0, 18)}…` : s.title,
                  }))}
                  allowClear={false}
                />
                <Button icon={<PlusOutlined />} onClick={() => void onNewSession()}>
                  新对话
                </Button>
              </Space>
            }
            styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: 560 } }}
          >
            <div style={{ flex: 1, overflow: 'auto', padding: '16px 16px 0' }}>
              {messages.length === 0 ? (
                <Empty
                  description="描述你想画的界面或插画，助手会给出可复制英文提示词"
                  style={{ marginTop: 80 }}
                />
              ) : (
                messages.map((m) => (
                  <div key={m.id}>
                    <ChatBubble msg={m} />
                    {m.role === 'assistant' && (
                      <div style={{ margin: '-4px 0 12px 0' }}>
                        <Button
                          type="link"
                          size="small"
                          onClick={() => applyPromptFromMessage(m.content)}
                        >
                          填入右侧绘画区
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ padding: 16, borderTop: '1px solid #f0f0f0' }}>
              <TextArea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="例如：帮我写一张 ditto-learner 课节列表页的 UI 示意图提示词…"
                autoSize={{ minRows: 2, maxRows: 5 }}
                onCompositionStart={() => {
                  chatComposingRef.current = true
                }}
                onCompositionEnd={() => {
                  chatComposingRef.current = false
                }}
                onPressEnter={(e) => {
                  if (chatComposingRef.current || e.nativeEvent.isComposing) return
                  if (!e.shiftKey) {
                    e.preventDefault()
                    void onSendChat()
                  }
                }}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={chatLoading}
                onClick={() => void onSendChat()}
                style={{ marginTop: 8 }}
                block
              >
                发送（Shift+Enter 换行）
              </Button>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="生成图片" styles={{ body: { paddingBottom: 8 } }}>
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <Segmented
                value={genMode}
                onChange={(v) => {
                  const mode = v as 'generate' | 'edit'
                  setGenMode(mode)
                  if (mode === 'generate') setReferenceGeneration(null)
                }}
                options={[
                  { label: '文生图', value: 'generate' },
                  { label: '提示词改图', value: 'edit' },
                ]}
              />

              {genMode === 'edit' && (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
                    border: '1px dashed #d9d9d9',
                    background: '#fafafa',
                  }}
                >
                  <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                    引用底图（从下方生图记录点击「引用改图」）
                  </Text>
                  {referenceGeneration ? (
                    <Space align="start">
                      <Image
                        src={referenceGeneration.image_access_url || ''}
                        alt="reference"
                        width={88}
                        height={88}
                        style={{ objectFit: 'cover', borderRadius: 8 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 4, fontSize: 12 }}>
                          {referenceGeneration.prompt}
                        </Paragraph>
                        <Button
                          type="text"
                          size="small"
                          icon={<CloseOutlined />}
                          onClick={() => setReferenceGeneration(null)}
                        >
                          取消引用
                        </Button>
                      </div>
                    </Space>
                  ) : (
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      尚未选择引用图片
                    </Text>
                  )}
                </div>
              )}

              <div>
                <Text type="secondary">{genMode === 'edit' ? '改图提示词' : '绘画提示词'}</Text>
                <TextArea
                  value={imagePrompt}
                  onChange={(e) => setImagePrompt(e.target.value)}
                  placeholder={
                    genMode === 'edit'
                      ? '描述要在引用图上修改的内容，例如：把标题改成「进阶商务英语」，整体色调更暖…'
                      : '从左侧复制或粘贴英文提示词…'
                  }
                  autoSize={{ minRows: 6, maxRows: 14 }}
                  style={{ marginTop: 8 }}
                />
              </div>
              <Space wrap>
                <Select value={size} onChange={setSize} options={SIZE_OPTIONS} style={{ width: 200 }} />
                <Button icon={<CopyOutlined />} onClick={() => void onCopyPrompt()}>
                  复制
                </Button>
                <Button type="primary" loading={genLoading} onClick={() => void onGenerate()}>
                  {genMode === 'edit' ? '改图生成' : '生成图片'}
                </Button>
              </Space>
            </Space>
          </Card>

          <Card title="生图记录" style={{ marginTop: 16 }} styles={{ body: { maxHeight: 360, overflow: 'auto' } }}>
            {generations.length === 0 ? (
              <Empty description="暂无记录" />
            ) : (
              <List
                dataSource={generations}
                renderItem={(item) => (
                  <List.Item key={item.id}>
                    <List.Item.Meta
                      title={
                        <Space wrap>
                          <Tag color={item.status === 'success' ? 'green' : item.status === 'failed' ? 'red' : 'default'}>
                            {item.status}
                          </Tag>
                          {item.mode === 'edit' && <Tag color="blue">改图</Tag>}
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {new Date(item.created_at).toLocaleString()}
                          </Text>
                        </Space>
                      }
                      description={
                        <Paragraph ellipsis={{ rows: 2 }} style={{ marginBottom: 8, fontSize: 12 }}>
                          {item.prompt}
                        </Paragraph>
                      }
                    />
                    {item.status === 'success' && item.image_access_url && (
                      <Space direction="vertical" align="end" size={4}>
                        <Image
                          src={item.image_access_url}
                          alt="generated"
                          width={96}
                          height={96}
                          style={{ objectFit: 'cover', borderRadius: 8 }}
                        />
                        <Button type="link" size="small" onClick={() => onReferenceForEdit(item)}>
                          引用改图
                        </Button>
                      </Space>
                    )}
                    {item.status === 'failed' && item.error_message && (
                      <Text type="danger" style={{ fontSize: 11, maxWidth: 120 }}>
                        {item.error_message}
                      </Text>
                    )}
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
