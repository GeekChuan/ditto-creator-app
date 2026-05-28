import { useEffect, useState } from 'react'
import { Button, Card, Col, Row, Space, Statistic, Switch, Table, Typography, message } from 'antd'
import { learnerAdminApi, type LearnerAdminUser, type LearnerOverview } from '../api/learnerAdmin'

export default function LearnerAdminPage() {
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState<LearnerOverview | null>(null)
  const [users, setUsers] = useState<LearnerAdminUser[]>([])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [overviewData, usersData] = await Promise.all([learnerAdminApi.getOverview(), learnerAdminApi.listUsers()])
      setOverview(overviewData)
      setUsers(usersData.items)
    } catch (error: any) {
      message.error(error?.response?.data?.detail || '加载 Learner Admin 数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const toggleStatus = async (user: LearnerAdminUser, checked: boolean) => {
    try {
      const updated = await learnerAdminApi.updateStatus(user.id, checked)
      setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
      message.success('状态更新成功')
      await loadAll()
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
      <Card
        title="Learner 用户列表"
        extra={
          <Button onClick={loadAll} loading={loading}>
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
            { title: '创建时间', dataIndex: 'created_at', render: (v: string) => new Date(v).toLocaleString() },
            {
              title: '状态',
              dataIndex: 'is_active',
              render: (_: boolean, row: LearnerAdminUser) => (
                <Switch checked={row.is_active} onChange={(checked) => toggleStatus(row, checked)} />
              ),
            },
          ]}
        />
      </Card>
    </Space>
  )
}
