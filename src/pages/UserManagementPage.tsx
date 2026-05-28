import { useCallback, useEffect, useState } from 'react'
import {
  Button, Card, Form, Input, Modal, Pagination, Popconfirm,
  Select, Space, Table, Tag, Typography, message,
} from 'antd'
import { PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { authApi } from '../api/auth'
import type { UserInfo } from '../types/user'

const { Title, Text } = Typography
const PAGE_SIZE = 10

export default function UserManagementPage() {
  const [loading, setLoading] = useState(false)
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<UserInfo[]>([])
  const [total, setTotal] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserInfo | null>(null)
  const [resettingUser, setResettingUser] = useState<UserInfo | null>(null)
  const [form] = Form.useForm()
  const [renameForm] = Form.useForm()
  const [resetForm] = Form.useForm()

  const fetchUsers = useCallback(async (p: number, kw: string) => {
    setLoading(true)
    try {
      const res = await authApi.listUsers({ page: p, page_size: PAGE_SIZE, keyword: kw || undefined })
      setItems(res.items)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUsers(page, keyword)
  }, [fetchUsers, page, keyword])

  const handleCreate = async () => {
    const values = await form.validateFields()
    await authApi.createUser(values)
    message.success('用户创建成功')
    setCreateOpen(false)
    form.resetFields()
    fetchUsers(1, keyword)
  }

  const handleDelete = async (id: string) => {
    await authApi.deleteUser(id)
    message.success('用户删除成功')
    fetchUsers(page, keyword)
  }

  const handleRename = async () => {
    if (!editingUser) return
    const values = await renameForm.validateFields()
    await authApi.renameUser(editingUser.id, values.username)
    message.success('用户名已更新')
    setEditingUser(null)
    fetchUsers(page, keyword)
  }

  const handleReset = async () => {
    if (!resettingUser) return
    const values = await resetForm.validateFields()
    await authApi.resetPassword(resettingUser.id, values.new_password)
    message.success('密码已重置')
    setResettingUser(null)
    resetForm.resetFields()
  }

  return (
    <div>
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>用户管理</Title>
          <Text type="secondary">搜索、查看、添加、删除用户，支持重置密码</Text>
        </div>
        <Space>
          <Input
            allowClear
            style={{ width: 220 }}
            placeholder="搜索用户名"
            prefix={<SearchOutlined />}
            value={keyword}
            onChange={(e) => { setKeyword(e.target.value); setPage(1) }}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateOpen(true)}>
            添加用户
          </Button>
        </Space>
      </Space>

      <Card>
        <Table<UserInfo>
          rowKey="id"
          loading={loading}
          pagination={false}
          dataSource={items}
          columns={[
            { title: '用户名', dataIndex: 'username' },
            {
              title: '角色',
              dataIndex: 'role',
              render: (role: string) => role === 'super_admin' ? <Tag color="red">超级管理员</Tag> : <Tag>普通用户</Tag>,
            },
            { title: '状态', dataIndex: 'is_active', render: (v: boolean) => v ? '启用' : '禁用' },
            {
              title: '操作',
              key: 'action',
              width: 260,
              render: (_, record) => (
                <Space>
                  <Button size="small" onClick={() => { setEditingUser(record); renameForm.setFieldsValue({ username: record.username }) }}>
                    修改用户名
                  </Button>
                  <Button size="small" onClick={() => setResettingUser(record)}>
                    重置密码
                  </Button>
                  {record.role !== 'super_admin' && (
                    <Popconfirm title="确认删除该用户？" onConfirm={() => handleDelete(record.id)}>
                      <Button size="small" danger>删除</Button>
                    </Popconfirm>
                  )}
                </Space>
              ),
            },
          ]}
        />
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <Pagination
            current={page}
            total={total}
            pageSize={PAGE_SIZE}
            onChange={(p) => setPage(p)}
            showTotal={(t) => `共 ${t} 条`}
          />
        </div>
      </Card>

      <Modal title="添加用户" open={createOpen} onOk={handleCreate} onCancel={() => setCreateOpen(false)}>
        <Form form={form} layout="vertical" initialValues={{ role: 'user' }}>
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, min: 6, message: '密码至少 6 位' }]}>
            <Input.Password />
          </Form.Item>
          <Form.Item name="role" label="角色">
            <Select options={[{ value: 'user', label: '普通用户' }, { value: 'super_admin', label: '超级管理员' }]} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="修改用户名" open={!!editingUser} onOk={handleRename} onCancel={() => setEditingUser(null)}>
        <Form form={renameForm} layout="vertical">
          <Form.Item name="username" label="新用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input />
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="重置密码" open={!!resettingUser} onOk={handleReset} onCancel={() => setResettingUser(null)}>
        <Form form={resetForm} layout="vertical">
          <Form.Item name="new_password" label="新密码" rules={[{ required: true, min: 6, message: '密码至少 6 位' }]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

