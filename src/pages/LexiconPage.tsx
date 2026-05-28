import { useMemo, useState } from 'react'
import { Alert, Button, Card, Col, Empty, Form, Input, Row, Select, Space, Spin, Table, Tag, Typography, message } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { toolsApi } from '../api/tools'

const { Title, Text } = Typography

type DatasetName = 'cefr' | 'cet' | 'coca' | 'awl'

const DATASET_OPTIONS: { label: string; value: DatasetName }[] = [
  { label: 'CEFR', value: 'cefr' },
  { label: 'CET', value: 'cet' },
  { label: 'COCA', value: 'coca' },
  { label: 'AWL', value: 'awl' },
]

const POS_OPTIONS = [
  'n', 'v', 'adj', 'adv', 'pron', 'prep', 'conj', 'det', 'num', 'int', 'aux', 'to', 'neg', 'abbr', 'art', 'existential', 'other',
].map((v) => ({ label: v, value: v }))

type EntryItem = Record<string, unknown>
type DatasetBlock = { dataset: DatasetName; entries: EntryItem[] }

type LookupResult = {
  word: string
  normalized_word: string
  hits_by_dataset: DatasetBlock[]
  dataset_summary: Record<string, number>
  not_found: boolean
}

const DATASET_COLORS: Record<DatasetName, string> = {
  cefr: 'blue',
  cet: 'purple',
  coca: 'geekblue',
  awl: 'cyan',
}

export default function LexiconPage() {
  const [messageApi, contextHolder] = message.useMessage()
  const [word, setWord] = useState('')
  const [posUnified, setPosUnified] = useState<string | undefined>(undefined)
  const [datasets, setDatasets] = useState<DatasetName[]>(['cefr', 'cet', 'coca', 'awl'])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<LookupResult | null>(null)

  const rows = useMemo(() => {
    if (!result) return []
    const list: Array<EntryItem & { key: string; dataset: DatasetName }> = []
    result.hits_by_dataset.forEach((block) => {
      block.entries.forEach((entry, idx) => {
        list.push({ ...entry, dataset: block.dataset, key: `${block.dataset}-${idx}-${String(entry.headword ?? '')}` })
      })
    })
    return list
  }, [result])

  const runQuery = async () => {
    if (!word.trim()) {
      messageApi.warning('请输入要查询的单词')
      return
    }
    if (!datasets.length) {
      messageApi.warning('请至少选择一个词库')
      return
    }
    setLoading(true)
    try {
      const res = await toolsApi.runTool('word-lookup', {
        payload: {
          word: word.trim(),
          pos_unified: posUnified || undefined,
          datasets,
        },
      })
      if (res.status !== 'ok' || !res.result) {
        messageApi.error(res.error || '查询失败')
        setResult(null)
        return
      }
      setResult(res.result as unknown as LookupResult)
    } catch {
      messageApi.error('查询请求失败，请稍后重试')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const resetFilters = () => {
    setWord('')
    setPosUnified(undefined)
    setDatasets(['cefr', 'cet', 'coca', 'awl'])
    setResult(null)
  }

  return (
    <div>
      {contextHolder}
      <Title level={4}>单词库</Title>
      <Text type="secondary">按单词、统一词性、词库范围查询词条信息</Text>

      <Card style={{ marginTop: 16, marginBottom: 16 }}>
        <Form layout="vertical">
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item label="单词">
                <Input
                  value={word}
                  onChange={(e) => setWord(e.target.value)}
                  placeholder="例如 bridge"
                  allowClear
                  onPressEnter={runQuery}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="统一词性">
                <Select
                  value={posUnified}
                  onChange={setPosUnified}
                  options={POS_OPTIONS}
                  placeholder="可选，不筛选请留空"
                  allowClear
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="词库（可多选）">
                <Select
                  mode="multiple"
                  value={datasets}
                  onChange={(v) => setDatasets(v as DatasetName[])}
                  options={DATASET_OPTIONS}
                />
              </Form.Item>
            </Col>
          </Row>
          <Space>
            <Button type="primary" icon={<SearchOutlined />} loading={loading} onClick={runQuery}>
              查询
            </Button>
            <Button onClick={resetFilters}>重置</Button>
          </Space>
        </Form>
      </Card>

      <Spin spinning={loading}>
        {!result ? (
          <Empty description="输入查询条件后开始检索" />
        ) : result.not_found ? (
          <Alert type="info" showIcon message={`未在所选词库中命中单词：${result.word}`} />
        ) : (
          <Card
            title={
              <Space wrap>
                <span>查询结果：{result.word}</span>
                {Object.entries(result.dataset_summary)
                  .filter(([, count]) => count > 0)
                  .map(([name, count]) => (
                    <Tag key={name} color={DATASET_COLORS[name as DatasetName] || 'default'}>
                      {name.toUpperCase()}: {count}
                    </Tag>
                  ))}
              </Space>
            }
          >
            <Table
              size="small"
              pagination={{ pageSize: 20 }}
              dataSource={rows}
              columns={[
                {
                  title: '词库',
                  dataIndex: 'dataset',
                  width: 90,
                  render: (v: DatasetName) => <Tag color={DATASET_COLORS[v]}>{v.toUpperCase()}</Tag>,
                },
                { title: '单词', dataIndex: 'headword', width: 140 },
                { title: '统一词性', dataIndex: 'pos_unified', width: 100, render: (v) => v || '-' },
                { title: '原始词性', dataIndex: 'pos', width: 110, render: (v) => v || '-' },
                { title: '等级', dataIndex: 'level_label', width: 120, render: (v) => v || '-' },
                {
                  title: 'COCA Rank',
                  width: 300,
                  render: (_, row) => (
                    row.dataset === 'coca'
                      ? `total:${row.rank_total ?? '-'} spoken:${row.rank_spoken ?? '-'} fiction:${row.rank_fiction ?? '-'}`
                      : '-'
                  ),
                },
              ]}
            />
          </Card>
        )}
      </Spin>
    </div>
  )
}
