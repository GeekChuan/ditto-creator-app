import { useEffect, useMemo, useState } from 'react'
import { Card, Col, Row, Space, Spin, Statistic, Tag, Typography } from 'antd'
import {
  AppstoreOutlined,
  CodeOutlined,
  DatabaseOutlined,
  ExperimentOutlined,
  FileWordOutlined,
} from '@ant-design/icons'
import PreviewPanel from '../components/PreviewPanel'
import { assetsApi } from '../api/assets'
import { overviewApi } from '../api/overview'
import { toolsApi } from '../api/tools'

const { Title, Paragraph } = Typography

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [assetTotal, setAssetTotal] = useState(0)
  const [toolTotal, setToolTotal] = useState(0)
  const [availableToolTotal, setAvailableToolTotal] = useState(0)
  const [projectCodeLines, setProjectCodeLines] = useState(0)
  const [lexiconStats, setLexiconStats] = useState({
    cefr_words: 0,
    cet_words: 0,
    coca_words: 0,
    index_version: 0,
  })

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const [assetRes, toolRes, lexiconRes, overviewRes] = await Promise.all([
          assetsApi.list({ page: 1, page_size: 1 }),
          toolsApi.getToolList(),
          toolsApi.runTool('word-difficulty-memory', {
            payload: {
              words: [],
              language: 'en',
            },
          }),
          overviewApi.getOverview(),
        ])
        if (cancelled) return

        setAssetTotal(assetRes.total ?? 0)
        setToolTotal(toolRes.length)
        setAvailableToolTotal(toolRes.filter((item) => item.status === 'available').length)
        setProjectCodeLines(overviewRes.project_code_lines ?? 0)

        const stats = (lexiconRes.result?.index_stats ?? {}) as Record<string, unknown>
        setLexiconStats({
          cefr_words: Number(stats.cefr_words ?? 0),
          cet_words: Number(stats.cet_words ?? 0),
          coca_words: Number(stats.coca_words ?? 0),
          index_version: Number(stats.index_version ?? 0),
        })
      } catch {
        if (!cancelled) {
          setAssetTotal(0)
          setToolTotal(0)
          setAvailableToolTotal(0)
          setProjectCodeLines(0)
          setLexiconStats({ cefr_words: 0, cet_words: 0, coca_words: 0, index_version: 0 })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const lexiconTotal = useMemo(
    () => lexiconStats.cefr_words + lexiconStats.cet_words + lexiconStats.coca_words,
    [lexiconStats],
  )

  return (
    <div>
      <Title level={4}>概览</Title>
      <Paragraph type="secondary">欢迎使用 Ditto 生产引擎</Paragraph>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={24} md={12} lg={6} style={{ display: 'flex' }}>
            <Card style={{ width: '100%' }} styles={{ body: { minHeight: 138, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } }}>
              <Statistic
                title="素材库"
                value={assetTotal}
                prefix={<AppstoreOutlined />}
                suffix="条素材"
              />
              <Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
                支持上传、检索、预览与编辑
              </Paragraph>
            </Card>
          </Col>
          <Col xs={24} md={12} lg={6} style={{ display: 'flex' }}>
            <Card style={{ width: '100%' }} styles={{ body: { minHeight: 138, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } }}>
              <Statistic
                title="工具中心"
                value={toolTotal}
                prefix={<ExperimentOutlined />}
                suffix="个工具"
              />
              <Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
                已上线 {availableToolTotal} 个
              </Paragraph>
            </Card>
          </Col>
          <Col xs={24} md={12} lg={6} style={{ display: 'flex' }}>
            <Card style={{ width: '100%' }} styles={{ body: { minHeight: 138, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } }}>
              <Statistic
                title="单词库（内存索引）"
                value={lexiconTotal}
                prefix={<DatabaseOutlined />}
                suffix="个词条索引"
              />
              <Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
                index version: {lexiconStats.index_version || '--'}
              </Paragraph>
            </Card>
          </Col>
          <Col xs={24} md={12} lg={6} style={{ display: 'flex' }}>
            <Card style={{ width: '100%' }} styles={{ body: { minHeight: 138, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' } }}>
              <Statistic
                title="项目代码"
                value={projectCodeLines}
                prefix={<CodeOutlined />}
                suffix="行"
              />
              <Paragraph type="secondary" style={{ margin: '8px 0 0' }}>
                自动统计主项目代码规模
              </Paragraph>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
          <Col xs={24} lg={12} style={{ display: 'flex' }}>
            <Card title="单词库分布" style={{ width: '100%' }} styles={{ body: { minHeight: 128, display: 'flex', alignItems: 'center' } }}>
              <Space size={[8, 8]} wrap>
                <Tag icon={<FileWordOutlined />} color="blue">CEFR: {lexiconStats.cefr_words}</Tag>
                <Tag icon={<FileWordOutlined />} color="purple">CET: {lexiconStats.cet_words}</Tag>
                <Tag icon={<FileWordOutlined />} color="geekblue">COCA: {lexiconStats.coca_words}</Tag>
              </Space>
            </Card>
          </Col>
          <Col xs={24} lg={12} style={{ display: 'flex' }}>
            <Card title="已上线功能简介" style={{ width: '100%' }} styles={{ body: { minHeight: 128 } }}>
              <Space direction="vertical" size={4}>
                <Paragraph style={{ margin: 0 }}>素材库：视频素材上传、检索、预览、编辑、字幕任务与字幕查看。</Paragraph>
                <Paragraph style={{ margin: 0 }}>工具中心：语音识别、发音评分、字幕处理、词形还原、词难度查询等能力。</Paragraph>
                <Paragraph style={{ margin: 0 }}>单词库：支持 CEFR/CET/COCA 联合查询，内存索引版本支持高并发批量查询。</Paragraph>
              </Space>
            </Card>
          </Col>
        </Row>
      </Spin>

      <PreviewPanel />
    </div>
  )
}
