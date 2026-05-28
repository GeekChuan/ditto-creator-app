import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Typography, Tag, Space, Button, Spin, Collapse,
  Result, Alert, Divider, Row, Col, Form, Input, Switch, message,
} from 'antd'
import {
  ArrowLeftOutlined, ExperimentFilled, ThunderboltOutlined,
} from '@ant-design/icons'
import { toolsApi, type ToolMeta, type ToolSchemaResponse, type ToolRunResponse } from '../api/tools'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

function parseJsonInput(raw: string): unknown {
  const trimmed = raw.trim()
  if (!trimmed) return undefined
  return JSON.parse(trimmed)
}

const STRATEGY_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  rule_based: {
    label: '规则驱动',
    color: 'green',
    desc: '确定性执行，无 LLM，速度快，结果可预期',
  },
  llm_workflow: {
    label: 'LLM 工作流',
    color: 'blue',
    desc: '固定 Prompt 链，半自动，质量更高',
  },
  agentic: {
    label: 'Agent 自主',
    color: 'purple',
    desc: '多步推理，自主规划，适合复杂任务',
  },
}

export default function ToolDetailPage() {
  const { toolId } = useParams<{ toolId: string }>()
  const navigate = useNavigate()

  const [meta, setMeta] = useState<ToolMeta | null>(null)
  const [schema, setSchema] = useState<ToolSchemaResponse | null>(null)
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState<ToolRunResponse | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [payloadValues, setPayloadValues] = useState<Record<string, unknown>>({})

  useEffect(() => {
    if (!toolId) return
    setLoadingMeta(true)
    setRunResult(null)
    setPayloadValues({})

    Promise.all([
      toolsApi.getToolList().then((list) => list.find((t) => t.tool_id === toolId) ?? null),
      toolsApi.getToolSchema(toolId).catch(() => null),
    ])
      .then(([foundMeta, foundSchema]) => {
        if (!foundMeta) { setNotFound(true); return }
        setMeta(foundMeta)
        setSchema(foundSchema)
        // 用 schema 默认值初始化表单
        if (foundSchema) {
          const props = (foundSchema.input_schema.properties ?? {}) as Record<string, Record<string, unknown>>
          const defaults: Record<string, unknown> = {}
          Object.entries(props).forEach(([key, field]) => {
            if (field.default !== undefined) defaults[key] = field.default
          })
          setPayloadValues(defaults)
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoadingMeta(false))
  }, [toolId])

  const handleRun = async () => {
    if (!toolId) return
    if (schema) {
      const props = (schema.input_schema.properties ?? {}) as Record<string, Record<string, unknown>>
      for (const [key, field] of Object.entries(props)) {
        const value = payloadValues[key]
        if ((field.type === 'array' || field.type === 'object') && typeof value === 'string' && value.trim()) {
          message.error(`参数 ${key} 不是合法 JSON，请先修正后再运行`)
          return
        }
      }
    }
    setRunning(true)
    try {
      const res = await toolsApi.runTool(toolId, { payload: payloadValues })
      setRunResult(res)
    } catch {
      setRunResult({
        tool_id: toolId,
        strategy_used: null,
        status: 'error',
        result: null,
        error: '请求失败，请检查网络或联系管理员',
      })
    } finally {
      setRunning(false)
    }
  }

  const setField = (key: string, value: unknown) =>
    setPayloadValues(prev => ({ ...prev, [key]: value }))

  if (loadingMeta) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (notFound || !meta) {
    return (
      <Result
        status="404"
        title="工具不存在"
        subTitle={`找不到 ID 为 "${toolId}" 的工具`}
        extra={<Button onClick={() => navigate('/tools')}>返回工具中心</Button>}
      />
    )
  }

  const isReady = meta.status === 'available'

  return (
    <div style={{ maxWidth: 860 }}>
      {/* 返回 */}
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/tools')}
        style={{ marginBottom: 20, paddingLeft: 0 }}
      >
        工具中心
      </Button>

      {/* 页头 */}
      <Row align="middle" justify="space-between" style={{ marginBottom: 8 }}>
        <Col>
          <Space size={10} align="center">
            <ExperimentFilled style={{ fontSize: 22, color: '#6366f1' }} />
            <Title level={3} style={{ margin: 0 }}>{meta.name}</Title>
            <Tag color={isReady ? '#6366f1' : 'default'} style={{ fontSize: 12 }}>
              {isReady ? '可用' : '开发中'}
            </Tag>
          </Space>
        </Col>
        <Col>
          <Tag color="cyan">{meta.category}</Tag>
        </Col>
      </Row>

      <Paragraph type="secondary" style={{ fontSize: 14, marginBottom: 20 }}>
        {meta.description}
      </Paragraph>

      {/* 功能标签 */}
      <Space size={6} wrap style={{ marginBottom: 24 }}>
        {meta.tags.map((tag) => (
          <Tag key={tag}>{tag}</Tag>
        ))}
      </Space>

      <Divider />

      {/* 执行策略 */}
      <div style={{ marginBottom: 24 }}>
        <Text strong style={{ fontSize: 14 }}>执行策略</Text>
        {meta.available_strategies.length === 0 ? (
          <div style={{ marginTop: 10 }}>
            <Alert
              type="info"
              showIcon
              message="该工具尚未注册执行策略，接口调用将返回「开发中」占位响应。"
            />
          </div>
        ) : (
          <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
            {meta.available_strategies.map((s) => {
              const cfg = STRATEGY_LABELS[s]
              return cfg ? (
                <Col key={s} xs={24} sm={8}>
                  <div style={{
                    padding: '12px 14px',
                    border: '1px solid #f0f0f0',
                    borderRadius: 8,
                    background: '#fafafa',
                  }}>
                    <Space>
                      <ThunderboltOutlined style={{ color: cfg.color === 'green' ? '#52c41a' : cfg.color === 'blue' ? '#1677ff' : '#722ed1' }} />
                      <Tag color={cfg.color} style={{ margin: 0 }}>{cfg.label}</Tag>
                    </Space>
                    <div style={{ marginTop: 6 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>{cfg.desc}</Text>
                    </div>
                  </div>
                </Col>
              ) : null
            })}
          </Row>
        )}
      </div>

      {/* Schema 展开面板 */}
      {schema && (
        <Collapse
          ghost
          style={{ marginBottom: 24 }}
          items={[
            {
              key: 'input',
              label: <Text strong>输入参数 Schema</Text>,
              children: (
                <pre style={{
                  background: '#f6f8fa',
                  padding: 14,
                  borderRadius: 6,
                  fontSize: 12,
                  overflow: 'auto',
                  maxHeight: 320,
                }}>
                  {JSON.stringify(schema.input_schema, null, 2)}
                </pre>
              ),
            },
            {
              key: 'output',
              label: <Text strong>输出参数 Schema</Text>,
              children: (
                <pre style={{
                  background: '#f6f8fa',
                  padding: 14,
                  borderRadius: 6,
                  fontSize: 12,
                  overflow: 'auto',
                  maxHeight: 320,
                }}>
                  {JSON.stringify(schema.output_schema, null, 2)}
                </pre>
              ),
            },
          ]}
        />
      )}

      {/* 执行区域 */}
      <Divider />
      <div style={{ marginBottom: 16 }}>
        <Text strong style={{ fontSize: 14 }}>测试运行</Text>
      </div>

      {!isReady && (
        <Alert
          type="warning"
          showIcon
          message="该工具尚在开发中"
          description="点击「试运行」可验证接口连通性，工具将返回「not_implemented」占位响应。策略注册完成后此提示将消失。"
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 动态输入表单 */}
      {schema && Object.keys((schema.input_schema.properties ?? {}) as object).length > 0 && (
        <Form layout="vertical" style={{ marginBottom: 16 }}>
          {Object.entries((schema.input_schema.properties ?? {}) as Record<string, Record<string, unknown>>).map(([key, field]) => {
            const required = ((schema.input_schema.required ?? []) as string[]).includes(key)
            const label = (
              <span>
                <Text strong style={{ fontSize: 13 }}>{key}</Text>
                {required && <Text type="danger" style={{ marginLeft: 4 }}>*</Text>}
                {field.description && (
                  <Text type="secondary" style={{ fontSize: 12, marginLeft: 6 }}>{field.description as string}</Text>
                )}
              </span>
            )
            if (field.type === 'boolean') {
              return (
                <Form.Item key={key} label={label} style={{ marginBottom: 12 }}>
                  <Switch
                    checked={payloadValues[key] as boolean ?? (field.default as boolean ?? false)}
                    onChange={(v) => setField(key, v)}
                  />
                </Form.Item>
              )
            }
            if (field.type === 'array') {
              const current = payloadValues[key]
              const displayValue =
                typeof current === 'string'
                  ? current
                  : current !== undefined
                    ? JSON.stringify(current, null, 2)
                    : ''
              return (
                <Form.Item key={key} label={label} style={{ marginBottom: 12 }}>
                  <TextArea
                    value={displayValue}
                    rows={4}
                    placeholder='请输入 JSON 数组，例如 ["word1","word2"]'
                    onChange={(e) => {
                      const raw = e.target.value
                      try {
                        setField(key, parseJsonInput(raw))
                      } catch {
                        setField(key, raw)
                      }
                    }}
                  />
                </Form.Item>
              )
            }
            if (field.type === 'object') {
              const current = payloadValues[key]
              const displayValue =
                typeof current === 'string'
                  ? current
                  : current !== undefined
                    ? JSON.stringify(current, null, 2)
                    : ''
              return (
                <Form.Item key={key} label={label} style={{ marginBottom: 12 }}>
                  <TextArea
                    value={displayValue}
                    rows={4}
                    placeholder='请输入 JSON 对象，例如 {"k":"v"}'
                    onChange={(e) => {
                      const raw = e.target.value
                      try {
                        setField(key, parseJsonInput(raw))
                      } catch {
                        setField(key, raw)
                      }
                    }}
                  />
                </Form.Item>
              )
            }
            if (field.type === 'number' || field.type === 'integer') {
              return (
                <Form.Item key={key} label={label} style={{ marginBottom: 12 }}>
                  <Input
                    value={payloadValues[key] !== undefined ? String(payloadValues[key]) : ''}
                    placeholder={field.default !== undefined ? `默认：${field.default}` : ''}
                    onChange={(e) => {
                      const raw = e.target.value.trim()
                      if (!raw) {
                        setField(key, undefined)
                        return
                      }
                      const num = Number(raw)
                      setField(key, Number.isNaN(num) ? raw : num)
                    }}
                    allowClear
                  />
                </Form.Item>
              )
            }
            return (
              <Form.Item key={key} label={label} style={{ marginBottom: 12 }}>
                <Input
                  value={payloadValues[key] !== undefined ? String(payloadValues[key]) : ''}
                  placeholder={field.default !== undefined ? `默认：${field.default}` : ''}
                  onChange={(e) => setField(key, e.target.value || undefined)}
                  allowClear
                />
              </Form.Item>
            )
          })}
        </Form>
      )}

      <Space direction="vertical" style={{ width: '100%' }}>
        <Button
          type="primary"
          icon={<ThunderboltOutlined />}
          loading={running}
          onClick={handleRun}
          style={{ background: '#6366f1', borderColor: '#6366f1' }}
        >
          {isReady ? '运行工具' : '试运行（占位）'}
        </Button>

        {runResult && (
          <div style={{ marginTop: 12 }}>
            <RunResultPanel result={runResult} />
          </div>
        )}
      </Space>
    </div>
  )
}

function RunResultPanel({ result }: { result: ToolRunResponse }) {
  const statusConfig = {
    ok: { type: 'success' as const, title: '执行成功' },
    not_implemented: { type: 'info' as const, title: '开发中（占位响应）' },
    error: { type: 'error' as const, title: '执行错误' },
  }[result.status]

  return (
    <Alert
      type={statusConfig.type}
      showIcon
      message={statusConfig.title}
      description={
        <div style={{ marginTop: 8 }}>
          {result.strategy_used && (
            <div style={{ marginBottom: 6 }}>
              <Text style={{ fontSize: 12 }}>
                策略：<Tag color="blue" style={{ fontSize: 11 }}>{result.strategy_used}</Tag>
              </Text>
            </div>
          )}
          {result.error && (
            <div style={{ marginBottom: 6 }}>
              <Text type="danger" style={{ fontSize: 12 }}>{result.error}</Text>
            </div>
          )}
          {result.result && (
            <pre style={{
              background: 'rgba(0,0,0,0.04)',
              padding: 10,
              borderRadius: 4,
              fontSize: 12,
              overflow: 'auto',
              maxHeight: 240,
              margin: 0,
            }}>
              {JSON.stringify(result.result, null, 2)}
            </pre>
          )}
        </div>
      }
    />
  )
}
