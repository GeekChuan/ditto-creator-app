import { useEffect, useState } from 'react'
import { Button, Card, Col, Image, Row, Space, Statistic, Switch, Table, Tabs, Typography, message } from 'antd'
import {
  learnerAdminApi,
  type LearnerAdminFeedbackItem,
  type LearnerAdminUser,
  type LearnerOverview,
} from '../api/learnerAdmin'

export default function LearnerAdminPage() {
  const [loading, setLoading] = useState(true)
  const [feedbackLoading, setFeedbackLoading] = useState(true)
  const [overview, setOverview] = useState<LearnerOverview | null>(null)
  const [users, setUsers] = useState<LearnerAdminUser[]>([])
  const [feedbackItems, setFeedbackItems] = useState<LearnerAdminFeedbackItem[]>([])
  const [feedbackTotal, setFeedbackTotal] = useState(0)
  const [feedbackPage, setFeedbackPage] = useState(1)

  const loadUsers = async () => {
    setLoading(true)
    try {
      const [overviewData, usersData] = await Promise.all([
        learnerAdminApi.getOverview(),
        learnerAdminApi.listUsers(),
      ])
      setOverview(overviewData)
      setUsers(usersData.items)
    } catch (error: any) {
      message.error(error?.response?.data?.detail || '加载 Learner Admin 数据失败')
    } finally {
      setLoading(false)
    }
  }

  const loadFeedback = async (page = feedbackPage) => {
    setFeedbackLoading(true)
    try {
      const data = await learnerAdminApi.listFeedback({ page, page_size: 20 })
      setFeedbackItems(data.items)
      setFeedbackTotal(data.total)
      setFeedbackPage(page)
    } catch (error: any) {
      message.error(error?.response?.data?.detail || '加载用户反馈失败')
    } finally {
      setFeedbackLoading(false)
    }
  }

  useEffect(() => {
    void loadUsers()
    void loadFeedback(1)
  }, [])

  const toggleStatus = async (user: LearnerAdminUser, checked: boolean) => {
    try {
      const updated = await learnerAdminApi.updateStatus(user.id, checked)
      setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      message.success('状态更新成功')
      await loadUsers()
    } catch (error: any) {
      message.error(error?.response?.data?.detail || '状态更新失败')
    }
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Title level={3}>Learner 管理后台</Typography.Title>
      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic title="Learner 总用户" value={overview?.total_users ?? 0} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="活跃用户" value={overview?.active_users ?? 0} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="学习进度记录数" value={overview?.total_progress_records ?? 0} />
          </Card>
        </Col>
      </Row>

      <Tabs
        items={[
          {
            key: 'users',
            label: '用户列表',
            children: (
              <Card
                title="Learner 用户列表"
                extra={
                  <Button onClick={() => void loadUsers()} loading={loading}>
                    刷新
                  </Button>
                }
              >
                <Table
                  rowKey="id"
                  loading={loading}
                  dataSource={users}
                  columns={[
                    { title: '用户名', dataIndex: 'username' },
                    {
                      title: '创建时间',
                      dataIndex: 'created_at',
                      render: (v: string) => new Date(v).toLocaleString(),
                    },
                    {
                      title: '状态',
                      dataIndex: 'is_active',
                      render: (_: boolean, row: LearnerAdminUser) => (
                        <Switch checked={row.is_active} onChange={(checked) => void toggleStatus(row, checked)} />
                      ),
                    },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'feedback',
            label: '用户反馈',
            children: (
              <Card
                title="用户问题反馈"
                extra={
                  <Button onClick={() => void loadFeedback(feedbackPage)} loading={feedbackLoading}>
                    刷新
                  </Button>
                }
              >
                <Table
                  rowKey="id"
                  loading={feedbackLoading}
                  dataSource={feedbackItems}
                  pagination={{
                    current: feedbackPage,
                    pageSize: 20,
                    total: feedbackTotal,
                    onChange: (page) => void loadFeedback(page),
                  }}
                  columns={[
                    {
                      title: '提交时间',
                      dataIndex: 'created_at',
                      width: 180,
                      render: (v: string) => new Date(v).toLocaleString(),
                    },
                    { title: '用户', dataIndex: 'username', width: 140 },
                    {
                      title: '问题描述',
                      dataIndex: 'description',
                      render: (v: string) => (
                        <Typography.Paragraph style={{ marginBottom: 0 }} ellipsis={{ rows: 3, expandable: true }}>
                          {v}
                        </Typography.Paragraph>
                      ),
                    },
                    {
                      title: '联系方式',
                      dataIndex: 'contact',
                      width: 160,
                      render: (v: string | null) => v || '—',
                    },
                    {
                      title: '截图',
                      dataIndex: 'screenshot_urls',
                      width: 220,
                      render: (urls: string[]) =>
                        urls?.length ? (
                          <Image.PreviewGroup>
                            <Space wrap>
                              {urls.map((url) => (
                                <Image key={url} src={url} width={56} height={56} style={{ objectFit: 'cover' }} />
                              ))}
                            </Space>
                          </Image.PreviewGroup>
                        ) : (
                          '—'
                        ),
                    },
                  ]}
                />
              </Card>
            ),
          },
        ]}
      />
    </Space>
  )
}
