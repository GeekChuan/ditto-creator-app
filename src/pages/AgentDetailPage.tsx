import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  Empty,
  Form,
  Input,
  Progress,
  Result,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd'
import { ArrowLeftOutlined, RobotOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { agentsApi, type AgentMeta, type AgentRunResponse } from '../api/agents'
import { videoMetadataApi, type VideoMetadataBundleOut, type VideoMetadataTaskOut } from '../api/videoMetadata'

const { TextArea } = Input
const { Title, Text } = Typography

type DistItem = {
  label: string
  count: number
  ratio: number
  percent: number
  matched_words?: string[]
}

type CurvePoint = {
  x: number
  label: string
  density: number
}

type CocaDimInfo = {
  hit_count: number
  hit_ratio: number
  buckets: DistItem[]
  density_curve?: CurvePoint[]
}

type AgentResult = {
  overview?: {
    paragraph_count?: number
    sentence_count?: number
    word_count?: number
    analyzed_unique_words?: number
    not_found_count?: number
  }
  cefr_distribution?: DistItem[]
  cet_distribution?: DistItem[]
  coca_distribution?: Record<string, CocaDimInfo>
  density?: {
    total_words?: number
    content_words?: number
    core_words?: number
    content_density?: number
    core_density?: number
  }
  content_words_analysis?: {
    analyzed_unique_words?: number
    cefr_distribution?: DistItem[]
    cet_distribution?: DistItem[]
    coca_distribution?: Record<string, CocaDimInfo>
  }
  core_words_analysis?: {
    analyzed_unique_words?: number
    cefr_distribution?: DistItem[]
    cet_distribution?: DistItem[]
    coca_distribution?: Record<string, CocaDimInfo>
  }
  evidence?: {
    not_found_words?: string[]
    cet_selection_rule?: string
  }
  raw?: unknown
}

type LemmaWord = {
  text: string
  lemma: string
}

type LemmaSentence = {
  text: string
  words: LemmaWord[]
}

type LemmaParagraph = {
  text: string
  sentences: LemmaSentence[]
}

function DensityCurve({ points }: { points: CurvePoint[] }) {
  if (!points.length) return <Text type="secondary">无曲线数据</Text>
  const width = 320
  const height = 90
  const padding = 16
  const usableW = width - padding * 2
  const usableH = height - padding * 2
  const maxY = Math.max(...points.map(p => p.density), 0.0001)
  const polyline = points.map((p, idx) => {
    const x = padding + (idx / Math.max(points.length - 1, 1)) * usableW
    const y = padding + (1 - (p.density / maxY)) * usableH
    return `${x},${y}`
  }).join(' ')

  return (
    <div>
      <svg width={width} height={height} style={{ background: '#fafafa', borderRadius: 6 }}>
        <polyline fill="none" stroke="#1677ff" strokeWidth="2" points={polyline} />
      </svg>
      <Space size={8} wrap style={{ marginTop: 6 }}>
        {points.map((p) => (
          <Tag key={p.label}>{p.label}: {(p.density * 100).toFixed(2)}%</Tag>
        ))}
      </Space>
    </div>
  )
}

function DistTextCompare({
  title,
  paragraphs,
  distribution,
  colorPalette,
}: {
  title: string
  paragraphs: LemmaParagraph[]
  distribution: DistItem[]
  colorPalette: string[]
}) {
  if (!paragraphs.length || !distribution.length) return null
  const minAlpha = 0.14
  const maxAlpha = 0.60
  const total = Math.max(distribution.length - 1, 1)
  const rgbaFromHex = (hex: string, alpha: number) => {
    const clean = hex.replace('#', '')
    const full = clean.length === 3
      ? clean.split('').map((c) => `${c}${c}`).join('')
      : clean
    const r = Number.parseInt(full.slice(0, 2), 16)
    const g = Number.parseInt(full.slice(2, 4), 16)
    const b = Number.parseInt(full.slice(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
  const lemmaToStyle = new Map<string, { label: string; color: string }>()
  distribution.forEach((item, idx) => {
    const baseColor = colorPalette[idx % colorPalette.length]
    const alpha = minAlpha + (maxAlpha - minAlpha) * (idx / total)
    const color = rgbaFromHex(baseColor, alpha)
    for (const w of item.matched_words ?? []) {
      lemmaToStyle.set(String(w).toLowerCase(), { label: item.label, color })
    }
  })

  return (
    <Card size="small" title={title} style={{ marginTop: 12 }}>
      <Space size={[6, 6]} wrap style={{ marginBottom: 10 }}>
        {distribution.map((item, idx) => (
          (() => {
            const baseColor = colorPalette[idx % colorPalette.length]
            const alpha = minAlpha + (maxAlpha - minAlpha) * (idx / total)
            const bg = rgbaFromHex(baseColor, alpha)
            return (
          <Tag
            key={item.label}
            style={{
              background: bg,
              borderColor: 'transparent',
              color: '#111827',
              fontWeight: 500,
            }}
          >
            {item.label}
          </Tag>
            )
          })()
        ))}
      </Space>
      <Space direction="vertical" style={{ width: '100%' }}>
        {paragraphs.map((p, pIdx) => (
          <div key={`p-${pIdx}`} style={{ lineHeight: 2 }}>
            {p.sentences.map((s, sIdx) => (
              <span key={`s-${pIdx}-${sIdx}`} style={{ marginRight: 8 }}>
                {s.words.map((w, wIdx) => {
                  const styleCfg = lemmaToStyle.get(String(w.lemma || '').toLowerCase())
                  return (
                    <span
                      key={`w-${pIdx}-${sIdx}-${wIdx}`}
                      title={styleCfg ? `${w.lemma} → ${styleCfg.label}` : w.lemma}
                      style={{
                        background: styleCfg?.color ?? 'transparent',
                        borderRadius: 4,
                        padding: styleCfg ? '0 4px' : '0',
                        marginRight: 4,
                        display: 'inline-block',
                        color: styleCfg ? '#111827' : undefined,
                      }}
                    >
                      {w.text}
                    </span>
                  )
                })}
              </span>
            ))}
          </div>
        ))}
      </Space>
    </Card>
  )
}

export default function AgentDetailPage() {
  const { agentId } = useParams<{ agentId: string }>()
  const navigate = useNavigate()
  const [agents, setAgents] = useState<AgentMeta[]>([])
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState<AgentRunResponse | null>(null)
  const [text, setText] = useState('')
  const [videoAssetId, setVideoAssetId] = useState('')
  const [language, setLanguage] = useState('en')
  const [metaTask, setMetaTask] = useState<VideoMetadataTaskOut | null>(null)
  const [metaBundle, setMetaBundle] = useState<VideoMetadataBundleOut | null>(null)
  const [queryingTask, setQueryingTask] = useState(false)
  const [queryingBundle, setQueryingBundle] = useState(false)

  useEffect(() => {
    agentsApi.getAgentList()
      .then(setAgents)
      .catch(() => setAgents([]))
      .finally(() => setLoadingMeta(false))
  }, [])

  const meta = useMemo(
    () => agents.find((a) => a.agent_id === agentId) ?? null,
    [agents, agentId]
  )

  const isVideoMetadataAgent = agentId === 'video-metadata-agent'
  const isArticleDifficultyAgent = agentId === 'article-difficulty-agent'

  const handleRun = async () => {
    if (!agentId) return
    setRunning(true)
    try {
      const payload = isVideoMetadataAgent
        ? {
            video_asset_id: videoAssetId.trim(),
            language: language.trim() || 'en',
          }
        : {
            text: text.trim(),
            language: 'en',
          }
      const res = await agentsApi.runAgent(agentId, {
        payload,
      })
      setRunResult(res)
      setMetaTask(null)
      setMetaBundle(null)
    } finally {
      setRunning(false)
    }
  }

  const handleQueryTask = async () => {
    const id = videoAssetId.trim()
    if (!id) return
    setQueryingTask(true)
    try {
      const task = await videoMetadataApi.getActiveTask(id)
      setMetaTask(task)
    } finally {
      setQueryingTask(false)
    }
  }

  const handleQueryBundle = async () => {
    const id = videoAssetId.trim()
    if (!id) return
    setQueryingBundle(true)
    try {
      const bundle = await videoMetadataApi.getBundle(id)
      setMetaBundle(bundle)
    } finally {
      setQueryingBundle(false)
    }
  }

  if (loadingMeta) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!meta) {
    return (
      <Result
        status="404"
        title="Agent 不存在"
        subTitle={`找不到 ID 为 "${agentId}" 的 Agent`}
        extra={<Button onClick={() => navigate('/tools')}>返回工具中心</Button>}
      />
    )
  }

  const result = (runResult?.result ?? null) as AgentResult | null
  const rawLemmatization = (result?.raw as { lemmatization?: { paragraphs?: LemmaParagraph[] } } | undefined)?.lemmatization
  const paragraphs = rawLemmatization?.paragraphs ?? []
  const cefrColors = ['#93c5fd', '#86efac', '#fcd34d', '#f9a8d4', '#c4b5fd', '#fdba74']
  const cetColors = ['#a7f3d0', '#67e8f9', '#fde68a', '#fca5a5', '#d8b4fe', '#93c5fd', '#fdba74']
  const cocaColors = ['#60a5fa', '#34d399', '#f59e0b', '#fb7185', '#a78bfa', '#9ca3af']
  const renderMatchedWords = (record: DistItem) => {
    const words = record.matched_words ?? []
    if (!words.length) return <Text type="secondary">无命中词</Text>
    return (
      <Space size={[6, 6]} wrap>
        {words.map((w) => (
          <Tag key={w}>{w}</Tag>
        ))}
      </Space>
    )
  }
  const renderCocaBlocks = (cocaData?: Record<string, CocaDimInfo>) => (
    <Space direction="vertical" style={{ display: 'flex' }}>
      {Object.entries(cocaData ?? {}).map(([dim, info]) => (
        <Card key={dim} size="small" title={`COCA-${dim.toUpperCase()}`}>
          <Table
            rowKey="label"
            pagination={false}
            size="small"
            dataSource={info.buckets ?? []}
            expandable={{
              expandedRowRender: renderMatchedWords,
              rowExpandable: (record) => (record.matched_words?.length ?? 0) > 0,
              expandRowByClick: true,
            }}
            columns={[
              { title: 'Bucket', dataIndex: 'label', width: 120 },
              { title: '数量', dataIndex: 'count', width: 80 },
              { title: '占比', dataIndex: 'percent', render: (v: number) => <Progress percent={v} size="small" /> },
            ]}
          />
          <DensityCurve points={info.density_curve ?? []} />
        </Card>
      ))}
    </Space>
  )

  return (
    <div style={{ maxWidth: 980 }}>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/tools')}
        style={{ marginBottom: 20, paddingLeft: 0 }}
      >
        工具中心
      </Button>

      <Row align="middle" justify="space-between" style={{ marginBottom: 8 }}>
        <Col>
          <Space size={10} align="center">
            <RobotOutlined style={{ fontSize: 22, color: '#13c2c2' }} />
            <Title level={3} style={{ margin: 0 }}>{meta.name}</Title>
            <Tag color="cyan">Agent代理</Tag>
          </Space>
        </Col>
      </Row>
      <Text type="secondary">{meta.description}</Text>

      <Card title={isVideoMetadataAgent ? '输入视频参数' : '输入文章'} style={{ marginTop: 20 }}>
        <Form layout="vertical">
          {isVideoMetadataAgent ? (
            <>
              <Form.Item label="视频 UUID">
                <Input
                  value={videoAssetId}
                  onChange={(e) => setVideoAssetId(e.target.value)}
                  placeholder="请输入视频资产 ID（UUID）"
                />
              </Form.Item>
              <Form.Item label="语言">
                <Input
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  placeholder="默认 en，可填写 zh/en 等"
                />
              </Form.Item>
            </>
          ) : (
            <Form.Item label="英文文章">
              <TextArea
                rows={8}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="请输入待分析的英文文章"
              />
            </Form.Item>
          )}
          <Button
            type="primary"
            icon={<ThunderboltOutlined />}
            loading={running}
            onClick={handleRun}
            disabled={isVideoMetadataAgent ? !videoAssetId.trim() : !text.trim()}
            style={{ background: '#13c2c2', borderColor: '#13c2c2' }}
          >
            {isVideoMetadataAgent ? '开始视频元数据加工' : '执行难度分析'}
          </Button>
        </Form>
      </Card>

      {runResult && runResult.status === 'error' && (
        <Alert
          style={{ marginTop: 16 }}
          type="error"
          showIcon
          message="执行失败"
          description={runResult.error || '未知错误'}
        />
      )}

      {isVideoMetadataAgent && runResult?.status === 'ok' && (
        <Card title="任务执行结果" style={{ marginTop: 16 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text>
              任务ID：
              <Text code>{String((runResult.result as Record<string, unknown> | null)?.task_id ?? '-')}</Text>
            </Text>
            <Text>
              当前状态：
              <Tag color="processing">
                {String((runResult.result as Record<string, unknown> | null)?.status ?? 'queued')}
              </Tag>
            </Text>
            <Space>
              <Button loading={queryingTask} onClick={handleQueryTask}>
                跳转查询任务状态
              </Button>
              <Button loading={queryingBundle} onClick={handleQueryBundle}>
                跳转查询加工结果
              </Button>
            </Space>
            {metaTask && (
              <Alert
                type={metaTask.status === 'failed' ? 'error' : 'info'}
                showIcon
                message={`任务状态：${metaTask.status}`}
                description={
                  metaTask.error_message
                    ? metaTask.error_message
                    : `progress=${JSON.stringify(metaTask.progress_detail ?? {})}`
                }
              />
            )}
            {metaBundle && (
              <Alert
                type="success"
                showIcon
                message="加工结果可用"
                description={
                  <Space direction="vertical" size={0}>
                    <Text>subtitle_id: {metaBundle.subtitle_id ?? '-'}</Text>
                    <Text>vocabulary_id: {metaBundle.vocabulary_id ?? '-'}</Text>
                    <Text>phrases_id: {metaBundle.phrases_id ?? '-'}</Text>
                    <Text>expressions_id: {metaBundle.expressions_id ?? '-'}</Text>
                  </Space>
                }
              />
            )}
          </Space>
        </Card>
      )}

      {result && !isVideoMetadataAgent && isArticleDifficultyAgent && (
        <Space direction="vertical" size={16} style={{ display: 'flex', marginTop: 16 }}>
          <Card title="核心指标">
            <Row gutter={16}>
              <Col span={6}><Statistic title="段落数" value={result.overview?.paragraph_count ?? 0} /></Col>
              <Col span={6}><Statistic title="句子数" value={result.overview?.sentence_count ?? 0} /></Col>
              <Col span={6}><Statistic title="词数" value={result.overview?.word_count ?? 0} /></Col>
              <Col span={6}><Statistic title="去重词数" value={result.overview?.analyzed_unique_words ?? 0} /></Col>
            </Row>
            <Row gutter={16} style={{ marginTop: 12 }}>
              <Col span={8}><Statistic title="实词密度" value={((result.density?.content_density ?? 0) * 100).toFixed(2)} suffix="%" /></Col>
              <Col span={8}><Statistic title="主干词密度" value={((result.density?.core_density ?? 0) * 100).toFixed(2)} suffix="%" /></Col>
              <Col span={8}><Statistic title="主干词数量" value={result.density?.core_words ?? 0} /></Col>
            </Row>
          </Card>

          <Card title="CEFR 分布">
            {result.cefr_distribution?.length ? (
              <>
                <Table
                  rowKey="label"
                  pagination={false}
                  size="small"
                  dataSource={result.cefr_distribution}
                  expandable={{
                    expandedRowRender: renderMatchedWords,
                    rowExpandable: (record) => (record.matched_words?.length ?? 0) > 0,
                    expandRowByClick: true,
                  }}
                  columns={[
                    { title: '等级', dataIndex: 'label', width: 120 },
                    { title: '数量', dataIndex: 'count', width: 120 },
                    {
                      title: '占比',
                      dataIndex: 'percent',
                      render: (v: number) => <Progress percent={v} size="small" />,
                    },
                  ]}
                />
                <DistTextCompare
                  title="CEFR 原文对照"
                  paragraphs={paragraphs}
                  distribution={result.cefr_distribution}
                  colorPalette={cefrColors}
                />
              </>
            ) : <Empty description="无 CEFR 数据" />}
          </Card>

          <Card title="CET 分布">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text type="secondary">{result.evidence?.cet_selection_rule}</Text>
              {result.cet_distribution?.length ? (
                <>
                  <Table
                    rowKey="label"
                    pagination={false}
                    size="small"
                    dataSource={result.cet_distribution}
                    expandable={{
                      expandedRowRender: renderMatchedWords,
                      rowExpandable: (record) => (record.matched_words?.length ?? 0) > 0,
                      expandRowByClick: true,
                    }}
                    columns={[
                      { title: '级别', dataIndex: 'label', width: 140 },
                      { title: '数量', dataIndex: 'count', width: 120 },
                      {
                        title: '占比',
                        dataIndex: 'percent',
                        render: (v: number) => <Progress percent={v} size="small" />,
                      },
                    ]}
                  />
                  <DistTextCompare
                    title="CET 原文对照"
                    paragraphs={paragraphs}
                    distribution={result.cet_distribution}
                    colorPalette={cetColors}
                  />
                </>
              ) : <Empty description="无 CET 数据" />}
            </Space>
          </Card>

          <Card title="COCA 六维词频分布">
            <Space direction="vertical" style={{ display: 'flex' }}>
              {Object.entries(result.coca_distribution ?? {}).map(([dim, info]) => (
                <Card key={dim} size="small" title={dim.toUpperCase()}>
                  <Text type="secondary">
                    命中率：{Math.round((info.hit_ratio ?? 0) * 10000) / 100}%
                  </Text>
                  <Table
                    rowKey="label"
                    pagination={false}
                    size="small"
                    dataSource={info.buckets ?? []}
                    expandable={{
                      expandedRowRender: renderMatchedWords,
                      rowExpandable: (record) => (record.matched_words?.length ?? 0) > 0,
                      expandRowByClick: true,
                    }}
                    columns={[
                      { title: 'Bucket', dataIndex: 'label', width: 160 },
                      { title: '数量', dataIndex: 'count', width: 120 },
                      {
                        title: '占比',
                        dataIndex: 'percent',
                        render: (v: number) => <Progress percent={v} size="small" />,
                      },
                    ]}
                  />
                  <div style={{ marginTop: 8 }}>
                    <Text type="secondary">词频密度分布曲线</Text>
                    <DensityCurve points={info.density_curve ?? []} />
                  </div>
                  <DistTextCompare
                    title={`${dim.toUpperCase()} 原文对照`}
                    paragraphs={paragraphs}
                    distribution={info.buckets ?? []}
                    colorPalette={cocaColors}
                  />
                </Card>
              ))}
            </Space>
          </Card>

          <Card title="实词与主干词分布">
            <Row gutter={16}>
              <Col span={12}>
                <Card size="small" title={`实词分布（去重 ${result.content_words_analysis?.analyzed_unique_words ?? 0}）`}>
                  <Text strong>CEFR</Text>
                  <Table
                    rowKey="label"
                    pagination={false}
                    size="small"
                    dataSource={result.content_words_analysis?.cefr_distribution ?? []}
                    expandable={{
                      expandedRowRender: renderMatchedWords,
                      rowExpandable: (record) => (record.matched_words?.length ?? 0) > 0,
                      expandRowByClick: true,
                    }}
                    columns={[
                      { title: '等级', dataIndex: 'label', width: 100 },
                      { title: '数量', dataIndex: 'count', width: 80 },
                      { title: '占比', dataIndex: 'percent', render: (v: number) => <Progress percent={v} size="small" /> },
                    ]}
                  />
                  <DistTextCompare
                    title="实词 CEFR 原文对照"
                    paragraphs={paragraphs}
                    distribution={result.content_words_analysis?.cefr_distribution ?? []}
                    colorPalette={cefrColors}
                  />
                  <Text strong style={{ marginTop: 10, display: 'block' }}>CET</Text>
                  <Table
                    rowKey="label"
                    pagination={false}
                    size="small"
                    dataSource={result.content_words_analysis?.cet_distribution ?? []}
                    expandable={{
                      expandedRowRender: renderMatchedWords,
                      rowExpandable: (record) => (record.matched_words?.length ?? 0) > 0,
                      expandRowByClick: true,
                    }}
                    columns={[
                      { title: '级别', dataIndex: 'label', width: 100 },
                      { title: '数量', dataIndex: 'count', width: 80 },
                      { title: '占比', dataIndex: 'percent', render: (v: number) => <Progress percent={v} size="small" /> },
                    ]}
                  />
                  <DistTextCompare
                    title="实词 CET 原文对照"
                    paragraphs={paragraphs}
                    distribution={result.content_words_analysis?.cet_distribution ?? []}
                    colorPalette={cetColors}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title={`主干词分布（去重 ${result.core_words_analysis?.analyzed_unique_words ?? 0}）`}>
                  <Text strong>CEFR</Text>
                  <Table
                    rowKey="label"
                    pagination={false}
                    size="small"
                    dataSource={result.core_words_analysis?.cefr_distribution ?? []}
                    expandable={{
                      expandedRowRender: renderMatchedWords,
                      rowExpandable: (record) => (record.matched_words?.length ?? 0) > 0,
                      expandRowByClick: true,
                    }}
                    columns={[
                      { title: '等级', dataIndex: 'label', width: 100 },
                      { title: '数量', dataIndex: 'count', width: 80 },
                      { title: '占比', dataIndex: 'percent', render: (v: number) => <Progress percent={v} size="small" /> },
                    ]}
                  />
                  <DistTextCompare
                    title="主干词 CEFR 原文对照"
                    paragraphs={paragraphs}
                    distribution={result.core_words_analysis?.cefr_distribution ?? []}
                    colorPalette={cefrColors}
                  />
                  <Text strong style={{ marginTop: 10, display: 'block' }}>CET</Text>
                  <Table
                    rowKey="label"
                    pagination={false}
                    size="small"
                    dataSource={result.core_words_analysis?.cet_distribution ?? []}
                    expandable={{
                      expandedRowRender: renderMatchedWords,
                      rowExpandable: (record) => (record.matched_words?.length ?? 0) > 0,
                      expandRowByClick: true,
                    }}
                    columns={[
                      { title: '级别', dataIndex: 'label', width: 100 },
                      { title: '数量', dataIndex: 'count', width: 80 },
                      { title: '占比', dataIndex: 'percent', render: (v: number) => <Progress percent={v} size="small" /> },
                    ]}
                  />
                  <DistTextCompare
                    title="主干词 CET 原文对照"
                    paragraphs={paragraphs}
                    distribution={result.core_words_analysis?.cet_distribution ?? []}
                    colorPalette={cetColors}
                  />
                </Card>
              </Col>
            </Row>
            <Row gutter={16} style={{ marginTop: 12 }}>
              <Col span={12}>
                <Card size="small" title="实词 COCA 分布">
                  {renderCocaBlocks(result.content_words_analysis?.coca_distribution)}
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="主干词 COCA 分布">
                  {renderCocaBlocks(result.core_words_analysis?.coca_distribution)}
                </Card>
              </Col>
            </Row>
          </Card>

          <Card title="证据与原始结果">
            <Space direction="vertical" style={{ display: 'flex' }}>
              <Text>
                未命中词：
                {(result.evidence?.not_found_words ?? []).length === 0
                  ? ' 无'
                  : ` ${(result.evidence?.not_found_words ?? []).join(', ')}`}
              </Text>
              <Collapse
                ghost
                items={[
                  {
                    key: 'raw',
                    label: '查看原始 JSON',
                    children: (
                      <pre style={{ background: '#f6f8fa', padding: 12, borderRadius: 6, overflow: 'auto' }}>
                        {JSON.stringify(result.raw, null, 2)}
                      </pre>
                    ),
                  },
                ]}
              />
            </Space>
          </Card>
        </Space>
      )}
    </div>
  )
}

