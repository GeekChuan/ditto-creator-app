import { Button, Card, Form, Input, Modal, Typography, message } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { authApi } from '../api/auth'

const { Title, Text } = Typography

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [registerOpen, setRegisterOpen] = useState(false)
  const [registerForm] = Form.useForm()

  const onFinish = async (values: { username: string; password: string }) => {
    try {
      await login(values.username, values.password)
      message.success('登录成功')
      navigate('/dashboard', { replace: true })
    } catch (error: any) {
      message.error(error?.response?.data?.detail || '登录失败')
    }
  }
  const onRegister = async () => {
    const values = await registerForm.validateFields()
    await authApi.register(values)
    message.success('注册成功，请登录')
    setRegisterOpen(false)
    registerForm.resetFields()
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f7fb' }}>
      <Card style={{ width: 380 }}>
        <Title level={3} style={{ marginBottom: 8 }}>Ditto 创作后台</Title>
        <Text type="secondary">请使用用户名和密码登录</Text>
        <Form layout="vertical" style={{ marginTop: 20 }} onFinish={onFinish}>
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="请输入用户名" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>登录</Button>
          <Button type="link" block onClick={() => setRegisterOpen(true)}>注册新用户</Button>
        </Form>
      </Card>
      <Modal title="注册" open={registerOpen} onOk={onRegister} onCancel={() => setRegisterOpen(false)}>
        <Form form={registerForm} layout="vertical">
          <Form.Item name="username" label="用户名" rules={[{ required: true, min: 3, message: '用户名至少 3 位' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, min: 6, message: '密码至少 6 位' }]}>
            <Input.Password />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

