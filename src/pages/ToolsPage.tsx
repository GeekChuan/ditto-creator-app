import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Typography, Card, Tag, Row, Col, Spin, Empty, Badge, Space, Tabs,
} from 'antd'
import {
  AudioOutlined, FileTextOutlined, ArrowRightOutlined, ExperimentOutlined, RobotOutlined,
} from '@ant-design/icons'
import { toolsApi, type ToolMeta } from '../api/tools'
import { agentsApi, type AgentMeta } from '../api/agents'

const { Title, Text, Paragraph } = Typography

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  '语音工具': <AudioOutlined />,
  '文本分析': <FileTextOutlined />,
}

const STRATEGY_LABELS: Record<string, { label: string; color: string }> = {
  rule_based:   { label: '规则', color: 'green' },
  llm_workflow: { label: 'LLM', color: 'blue' },
  agentic:      { label: 'Agent', color: 'purple' },
}

export default function ToolsPage() {
  const [tools, setTools] = useState<ToolMeta[]>([])
  const [agents, setAgents] = useState<AgentMeta[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([
      toolsApi.getToolList(),
      agentsApi.getAgentList().catch(() => []),
    ])
      .then(([toolList, agentList]) => {
        setTools(toolList)
        setAgents(agentList)
      })
      .catch(() => {/* ignore */})
      .finally(() => setLoading(false))
  }, [])

  // 按 category 分组
  const grouped = tools.reduce<Record<string, ToolMeta[]>>((acc, t) => {
    if (!acc[t.category]) acc[t.category] = []
    acc[t.category].push(t)
    return acc
  }, {})

  return (
    <div>
      {/* 页头 */}
      <Row align="middle" style={{ marginBottom: 24 }} gutter={12}>
        <Col>
          <div style={{ fontSize: 28, lineHeight: 1 }}><ExperimentOutlined /></div>
        </Col>
        <Col>
          <Title level={4} style={{ margin: 0 }}>工具中心</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            内部能力中心，共 {tools.length} 个工具 / {agents.length} 个Agent代理
          </Text>
        </Col>
      </Row>

      <Spin spinning={loading}>
        <Tabs
          defaultActiveKey="tools"
          items={[
            {
              key: 'tools',
              label: (
                <Space size={6}>
                  <ExperimentOutlined />
                  工具
                </Space>
              ),
              children: (
                <>
                  {tools.length === 0 ? (
                    <Empty description="暂无工具" style={{ marginTop: 80 }} />
                  ) : (
                    Object.entries(grouped).map(([category, categoryTools]) => (
                      <div key={category} style={{ marginBottom: 40 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                          <span style={{ fontSize: 16, color: '#6366f1' }}>
                            {CATEGORY_ICONS[category] ?? <ExperimentOutlined />}
                          </span>
                          <Title level={5} style={{ margin: 0 }}>{category}</Title>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {categoryTools.length} 个工具
                          </Text>
                        </div>
                        <Row gutter={[16, 16]}>
                          {categoryTools.map((tool) => (
                            <Col key={tool.tool_id} xs={24} sm={12} lg={8} xl={6}>
                              <ToolCard tool={tool} onClick={() => navigate(`/tools/${tool.tool_id}`)} />
                            </Col>
                          ))}
                        </Row>
                      </div>
                    ))
                  )}
                </>
              ),
            },
            {
              key: 'agents',
              label: (
                <Space size={6}>
                  <RobotOutlined />
                  Agent代理
                </Space>
              ),
              children: agents.length === 0 ? (
                <Empty description="暂无Agent代理" style={{ marginTop: 80 }} />
              ) : (
                <Row gutter={[16, 16]}>
                  {agents.map((agent) => (
                    <Col key={agent.agent_id} xs={24} sm={12} lg={8} xl={6}>
                      <AgentCard agent={agent} onClick={() => navigate(`/agents/${agent.agent_id}`)} />
                    </Col>
                  ))}
                </Row>
              ),
            },
          ]}
        />
      </Spin>
    </div>
  )
}

function AgentCard({ agent, onClick }: { agent: AgentMeta; onClick: () => void }) {
  const isReady = agent.status === 'available'
  return (
    <Badge.Ribbon
      text={isReady ? '可用' : '开发中'}
      color={isReady ? '#13c2c2' : '#aaa'}
    >
      <Card
        hoverable
        onClick={onClick}
        styles={{ body: { padding: '16px 18px' } }}
        style={{ height: '100%', cursor: 'pointer' }}
      >
        <div style={{ marginBottom: 8 }}>
          <Text strong style={{ fontSize: 14 }}>{agent.name}</Text>
        </div>

        <Paragraph
          type="secondary"
          ellipsis={{ rows: 2 }}
          style={{ fontSize: 12, marginBottom: 12, minHeight: 34 }}
        >
          {agent.description}
        </Paragraph>

        <div style={{ marginBottom: 10 }}>
          <Tag color="cyan" style={{ fontSize: 11, lineHeight: '18px' }}>
            完整交互流程
          </Tag>
        </div>

        <Space size={4} wrap style={{ marginBottom: 12 }}>
          {agent.tags.map((tag) => (
            <Tag key={tag} style={{ fontSize: 11, lineHeight: '18px' }}>{tag}</Tag>
          ))}
        </Space>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Text style={{ fontSize: 12, color: '#13c2c2' }}>
            进入代理 <ArrowRightOutlined />
          </Text>
        </div>
      </Card>
    </Badge.Ribbon>
  )
}

function ToolCard({ tool, onClick }: { tool: ToolMeta; onClick: () => void }) {
  const isReady = tool.status === 'available'

  return (
    <Badge.Ribbon
      text={isReady ? '可用' : '开发中'}
      color={isReady ? '#6366f1' : '#aaa'}
    >
      <Card
        hoverable
        onClick={onClick}
        styles={{ body: { padding: '16px 18px' } }}
        style={{ height: '100%', cursor: 'pointer' }}
      >
        <div style={{ marginBottom: 8 }}>
          <Text strong style={{ fontSize: 14 }}>{tool.name}</Text>
        </div>

        <Paragraph
          type="secondary"
          ellipsis={{ rows: 2 }}
          style={{ fontSize: 12, marginBottom: 12, minHeight: 34 }}
        >
          {tool.description}
        </Paragraph>

        {/* 策略标签 */}
        {tool.available_strategies.length > 0 ? (
          <Space size={4} wrap style={{ marginBottom: 10 }}>
            {tool.available_strategies.map((s) => {
              const cfg = STRATEGY_LABELS[s]
              return cfg ? (
                <Tag key={s} color={cfg.color} style={{ fontSize: 11, lineHeight: '18px' }}>
                  {cfg.label}
                </Tag>
              ) : null
            })}
          </Space>
        ) : (
          <div style={{ marginBottom: 10 }}>
            <Tag color="default" style={{ fontSize: 11, lineHeight: '18px' }}>待实现</Tag>
          </div>
        )}

        {/* 功能标签 */}
        <Space size={4} wrap style={{ marginBottom: 12 }}>
          {tool.tags.map((tag) => (
            <Tag key={tag} style={{ fontSize: 11, lineHeight: '18px' }}>{tag}</Tag>
          ))}
        </Space>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Text style={{ fontSize: 12, color: '#6366f1' }}>
            查看详情 <ArrowRightOutlined />
          </Text>
        </div>
      </Card>
    </Badge.Ribbon>
  )
}
