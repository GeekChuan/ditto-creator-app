import { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Drawer,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import { ReloadOutlined, SendOutlined } from '@ant-design/icons'
import {
  homeworkAdminApi,
  type HomeworkAdminSubmissionDetail,
  type HomeworkAdminSubmissionItem,
} from '../api/homeworkAdmin'

const { Text, Paragraph } = Typography

const PAGE_SIZE = 20

const STATUS_META: Record<string, { label: string; color: string }> = {
  processing: { label: 'AI 批改中', color: 'processing' },
  ai_completed: { label: '待审核', color: 'warning' },
  delivered: { label: '已下发', color: 'success' },
  failed: { label: '批改失败', color: 'error' },
}

const DIMENSION_LABELS: Record<string, string> = {
  accuracy: '准确度',
  fluency: '流利度',
  integrity: '完整度',
  standard: '标准度',
}

function statusTag(status: string) {
  const meta = STATUS_META[status]
  return <Tag color={meta?.color ?? 'default'}>{meta?.label ?? status}</Tag>
}

function formatDuration(ms: number): string {
  const sec = Math.round(ms / 1000)
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

export default function HomeworkReviewPage() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<HomeworkAdminSubmissionItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined)

  const [detail, setDetail] = useState<HomeworkAdminSubmissionDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [reportDraft, setReportDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [delivering, setDelivering] = useState(false)

  const loadList = useCallback(
    async (nextPage = page, nextStatus = statusFilter) => {
      setLoading(true)
      try {
        const data = await homeworkAdminApi.listSubmissions({
          page: nextPage,
          page_size: PAGE_SIZE,
          status: nextStatus,
        })
        setItems(data.items)
        setTotal(data.total)
        setPage(nextPage)
      } catch (error: any) {
        message.error(error?.response?.data?.detail || '加载作业提交列表失败')
      } finally {
        setLoading(false)
      }
    },
    [page, statusFilter],
  )

  useEffect(() => {
    void loadList(1, statusFilter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  const openDetail = async (id: string) => {
    setDetailLoading(true)
    try {
      const data = await homeworkAdminApi.getSubmissionDetail(id)
      setDetail(data)
      setReportDraft(data.teacher_report_markdown ?? data.ai_report_markdown ?? '')
    } catch (error: any) {
      message.error(error?.response?.data?.detail || '加载提交详情失败')
    } finally {
      setDetailLoading(false)
    }
  }

  const saveReport = async () => {
    if (!detail) return
    if (!reportDraft.trim()) {
      message.warning('报告内容不能为空')
      return
    }
    setSaving(true)
    try {
      const updated = await homeworkAdminApi.updateReport(detail.id, reportDraft)
      setDetail(updated)
      message.success('报告已保存')
      void loadList()
    } catch (error: any) {
      message.error(error?.response?.data?.detail || '保存报告失败')
    } finally {
      setSaving(false)
    }
  }

  const deliver = async () => {
    if (!detail) return
    if (!reportDraft.trim()) {
      message.warning('报告内容不能为空')
      return
    }
    setDelivering(true)
    try {
      if (reportDraft !== (detail.teacher_report_markdown ?? detail.ai_report_markdown ?? '')) {
        await homeworkAdminApi.updateReport(detail.id, reportDraft)
      }
      await homeworkAdminApi.deliverSubmission(detail.id)
      message.success('已下发给学员')
      await openDetail(detail.id)
      void loadList()
    } catch (error: any) {
      message.error(error?.response?.data?.detail || '下发失败')
    } finally {
      setDelivering(false)
    }
  }

  const pronunciation = detail?.pronunciation_report as
    | { total_score?: number; dimensions?: Record<string, number> }
    | null
    | undefined

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Title level={3}>口语作业审核</Typography.Title>

      <Card
        title="作业提交列表"
        extra={
          <Space>
            <Select
              allowClear
              placeholder="按状态筛选"
              style={{ width: 160 }}
              value={statusFilter}
              onChange={(v) => setStatusFilter(v)}
              options={Object.entries(STATUS_META).map(([value, meta]) => ({
                value,
                label: meta.label,
              }))}
            />
            <Button icon={<ReloadOutlined />} onClick={() => void loadList()} loading={loading}>
              刷新
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          loading={loading}
          dataSource={items}
          scroll={{ x: 900 }}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total,
            onChange: (p) => void loadList(p),
            showTotal: (t) => `共 ${t} 条`,
          }}
          onRow={(row) => ({
            style: { cursor: 'pointer' },
            onClick: () => void openDetail(row.id),
          })}
          columns={[
            {
              title: '提交时间',
              dataIndex: 'created_at',
              width: 170,
              render: (v: string) => new Date(v).toLocaleString(),
            },
            {
              title: '课节',
              dataIndex: 'lesson_title',
              render: (v: string | null, row) => v || row.lesson_id,
            },
            { title: '学员 lls_id', dataIndex: 'lls_id', width: 110, render: (v) => v ?? '—' },
            { title: '节点', dataIndex: 'node_id', width: 140, ellipsis: true },
            { title: '第几次', dataIndex: 'attempt_no', width: 80 },
            {
              title: '时长',
              dataIndex: 'duration_ms',
              width: 80,
              render: (v: number) => formatDuration(v),
            },
            {
              title: '下发方式',
              dataIndex: 'delivery_mode',
              width: 100,
              render: (v: string) => (v === 'manual' ? '手动' : '自动'),
            },
            {
              title: '状态',
              dataIndex: 'status',
              width: 110,
              render: (v: string) => statusTag(v),
            },
          ]}
        />
      </Card>

      <Drawer
        title={
          detail ? (
            <Space>
              <span>提交详情</span>
              {statusTag(detail.status)}
              <Text type="secondary" style={{ fontSize: 12 }}>
                第 {detail.attempt_no} 次 · {detail.delivery_mode === 'manual' ? '手动下发' : '自动下发'}
              </Text>
            </Space>
          ) : (
            '提交详情'
          )
        }
        width={720}
        open={detail !== null || detailLoading}
        onClose={() => setDetail(null)}
        loading={detailLoading}
        extra={
          detail && detail.status !== 'delivered' && detail.status !== 'failed' ? (
            <Popconfirm title="确认将当前报告下发给学员？" onConfirm={() => void deliver()}>
              <Button type="primary" icon={<SendOutlined />} loading={delivering}>
                发送给用户
              </Button>
            </Popconfirm>
          ) : null
        }
      >
        {detail ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            {detail.status === 'failed' && detail.error_message ? (
              <Alert type="error" showIcon message="批改失败" description={detail.error_message} />
            ) : null}

            <Descriptions size="small" column={2} bordered>
              <Descriptions.Item label="课节" span={2}>
                {detail.lesson_title || detail.lesson_id}
              </Descriptions.Item>
              <Descriptions.Item label="学员 lls_id">{detail.lls_id ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="节点">{detail.node_id}</Descriptions.Item>
              <Descriptions.Item label="提交时间">
                {new Date(detail.created_at).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="录音时长">{formatDuration(detail.duration_ms)}</Descriptions.Item>
              <Descriptions.Item label="下发时间">
                {detail.delivered_at ? new Date(detail.delivered_at).toLocaleString() : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="审核时间">
                {detail.reviewed_at ? new Date(detail.reviewed_at).toLocaleString() : '—'}
              </Descriptions.Item>
            </Descriptions>

            {detail.audio_url ? (
              <Card size="small" title="学员录音">
                <audio controls src={detail.audio_url} style={{ width: '100%' }} />
              </Card>
            ) : null}

            {pronunciation?.total_score != null ? (
              <Card size="small" title="发音评测（讯飞 ISE）">
                <Space size={16} wrap>
                  <Text strong style={{ fontSize: 20 }}>
                    总分 {pronunciation.total_score}
                  </Text>
                  {Object.entries(pronunciation.dimensions ?? {}).map(([key, score]) => (
                    <Text key={key} type="secondary">
                      {DIMENSION_LABELS[key] ?? key}：{score}
                    </Text>
                  ))}
                </Space>
              </Card>
            ) : null}

            {detail.asr_raw_text || detail.asr_corrected_text ? (
              <Card size="small" title="语音识别">
                {detail.asr_raw_text ? (
                  <Paragraph>
                    <Text type="secondary">ASR 原始：</Text>
                    {detail.asr_raw_text}
                  </Paragraph>
                ) : null}
                {detail.asr_corrected_text ? (
                  <Paragraph style={{ marginBottom: 0 }}>
                    <Text type="secondary">LLM 修正：</Text>
                    {detail.asr_corrected_text}
                  </Paragraph>
                ) : null}
              </Card>
            ) : null}

            {detail.teleprompter_text ? (
              <Card size="small" title="提词器最终文本">
                <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                  {detail.teleprompter_text}
                </Paragraph>
              </Card>
            ) : null}

            {detail.ai_report_markdown ? (
              <Card size="small" title="AI 批改报告（原始）">
                <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                  {detail.ai_report_markdown}
                </Paragraph>
              </Card>
            ) : null}

            {detail.optimized_content_markdown ? (
              <Card size="small" title="优化版内容">
                <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                  {detail.optimized_content_markdown}
                </Paragraph>
              </Card>
            ) : null}

            {detail.status !== 'failed' ? (
              <Card
                size="small"
                title="下发给学员的报告（Markdown，可编辑）"
                extra={
                  <Button size="small" type="primary" onClick={() => void saveReport()} loading={saving}>
                    保存报告
                  </Button>
                }
              >
                <Input.TextArea
                  rows={12}
                  value={reportDraft}
                  onChange={(e) => setReportDraft(e.target.value)}
                  placeholder="编辑后保存，下发时以此版本为准；未修改时默认使用 AI 报告"
                />
              </Card>
            ) : null}
          </Space>
        ) : null}
      </Drawer>
    </Space>
  )
}
