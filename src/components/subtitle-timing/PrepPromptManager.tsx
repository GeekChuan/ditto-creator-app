import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Card, Col, Empty, Form, Input, List, Row, Space, Switch, Tag, Typography, message } from 'antd'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons'
import {
  subtitlePrepPromptApi,
  type SubtitlePrepDefaultPrompt,
  type SubtitlePrepPromptCreate,
  type SubtitlePrepPromptOut,
} from '../../api/subtitlePrepPrompt'

const { Text, Paragraph } = Typography
const { TextArea } = Input

function nextPromptVersion(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`
}

function buildPromptDefaults(defaultPrompt: SubtitlePrepDefaultPrompt): SubtitlePrepPromptCreate {
  return {
    prompt_key: 'default-subtitle-prep-prompt',
    prompt_version: nextPromptVersion(),
    phrases_system_prompt: defaultPrompt.phrases_system_prompt,
    expressions_system_prompt: defaultPrompt.expressions_system_prompt,
    is_active: false,
  }
}

export default function PrepPromptManager() {
  const [messageApi, contextHolder] = message.useMessage()
  const [form] = Form.useForm<SubtitlePrepPromptCreate>()
  const [prompts, setPrompts] = useState<SubtitlePrepPromptOut[]>([])
  const [defaultPrompt, setDefaultPrompt] = useState<SubtitlePrepDefaultPrompt>({
    phrases_system_prompt: '',
    expressions_system_prompt: '',
  })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const loadPrompts = useCallback(async () => {
    setLoading(true)
    try {
      const [defaults, rows] = await Promise.all([
        subtitlePrepPromptApi.getDefaultSystemPrompt(),
        subtitlePrepPromptApi.list(),
      ])
      setDefaultPrompt(defaults)
      setPrompts(rows)
      if (!editingId && !form.getFieldValue('phrases_system_prompt')) {
        form.setFieldsValue(buildPromptDefaults(defaults))
      }
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      messageApi.error(detail || '加载 Prompt 配置失败')
    } finally {
      setLoading(false)
    }
  }, [editingId, form, messageApi])

  useEffect(() => {
    void loadPrompts()
  }, [loadPrompts])

  const resetDraft = (showMessage = false) => {
    setEditingId(null)
    form.setFieldsValue(buildPromptDefaults(defaultPrompt))
    if (showMessage) {
      messageApi.info('已填入默认 Prompt 草稿，编辑后点击保存才会创建')
    }
  }

  const editPrompt = (prompt: SubtitlePrepPromptOut) => {
    setEditingId(prompt.id)
    form.setFieldsValue(prompt)
  }

  const submitPrompt = async (values: SubtitlePrepPromptCreate) => {
    setSaving(true)
    try {
      const body = {
        ...values,
        is_active: Boolean(values.is_active),
      }
      let saved: SubtitlePrepPromptOut
      if (editingId) {
        saved = await subtitlePrepPromptApi.update(editingId, body)
        messageApi.success('Prompt 已更新')
      } else {
        saved = await subtitlePrepPromptApi.create(body)
        messageApi.success('Prompt 已创建')
      }
      setEditingId(saved.id)
      await loadPrompts()
      form.setFieldsValue(saved)
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail
      messageApi.error(detail || 'Prompt 保存失败')
    } finally {
      setSaving(false)
    }
  }

  const activatePrompt = async (prompt: SubtitlePrepPromptOut) => {
    await subtitlePrepPromptApi.activate(prompt.id)
    messageApi.success('已设为 active Prompt')
    await loadPrompts()
  }

  return (
    <div>
      {contextHolder}
      <Alert
        type="info"
        showIcon
        message="备课 LLM Prompt"
        description="这里配置字幕打轴器备课模式中「LLM 提取词组/句型」使用的 system prompt。提取会使用 active 配置；如果没有配置，后端会回退到内置默认 Prompt。"
        style={{ marginBottom: 16 }}
      />
      <Row gutter={16}>
        <Col xs={24} lg={9}>
          <Card
            title="Prompt 配置"
            size="small"
            loading={loading}
            extra={
              <Button size="small" icon={<ReloadOutlined />} onClick={() => void loadPrompts()}>
                刷新
              </Button>
            }
          >
            {prompts.length === 0 ? (
              <Empty description="暂无 Prompt 配置" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <List
                size="small"
                dataSource={prompts}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Button key="edit" size="small" type="link" onClick={() => editPrompt(item)}>
                        编辑
                      </Button>,
                      <Button
                        key="active"
                        size="small"
                        type="link"
                        disabled={item.is_active}
                        onClick={() => void activatePrompt(item)}
                      >
                        设为 active
                      </Button>,
                    ]}
                  >
                    <List.Item.Meta
                      title={(
                        <Space size={6}>
                          <Text>{item.prompt_key}</Text>
                          {item.is_active ? <Tag color="green">active</Tag> : null}
                        </Space>
                      )}
                      description={item.prompt_version}
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={15}>
          <Card
            title={editingId ? '编辑 Prompt' : '新建 Prompt'}
            size="small"
            extra={(
              <Space>
                <Button size="small" icon={<PlusOutlined />} onClick={() => resetDraft(true)}>
                  导入默认 Prompt
                </Button>
                <Button size="small" onClick={() => resetDraft()}>
                  新建
                </Button>
              </Space>
            )}
          >
            <Paragraph type="secondary" style={{ marginTop: 0 }}>
              保存为 active 后，字幕打轴器中的 LLM 提取会立即使用这份配置。
            </Paragraph>
            <Form form={form} layout="vertical" onFinish={(values) => void submitPrompt(values)}>
              <Row gutter={12}>
                <Col xs={24} md={12}>
                  <Form.Item name="prompt_key" label="prompt_key" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="prompt_version" label="prompt_version" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="phrases_system_prompt" label="词组提取 Prompt" rules={[{ required: true }]}>
                <TextArea autoSize={{ minRows: 10, maxRows: 18 }} />
              </Form.Item>
              <Form.Item name="expressions_system_prompt" label="句型提取 Prompt" rules={[{ required: true }]}>
                <TextArea autoSize={{ minRows: 10, maxRows: 18 }} />
              </Form.Item>
              <Form.Item name="is_active" label="保存后设为 active" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" loading={saving}>
                  保存 Prompt
                </Button>
              </Space>
            </Form>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
