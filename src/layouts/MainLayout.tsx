import { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Button, Layout, Menu, Space, theme, Typography } from 'antd'
import {
  DashboardOutlined,
  ExperimentOutlined,
  TeamOutlined,
  VideoCameraOutlined,
  BookOutlined,
  ReadOutlined,
  UserOutlined,
  DeploymentUnitOutlined,
  CodeOutlined,
  RocketOutlined,
  GiftOutlined,
  PictureOutlined,
  FieldTimeOutlined,
  SoundOutlined,
  AuditOutlined,
  HighlightOutlined,
} from '@ant-design/icons'
import { useAuth } from '../auth/AuthProvider'
import { isSuperAdmin } from '../types/user'

const { Sider, Header, Content } = Layout
const { Title } = Typography

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { token } = theme.useToken()
  const { user, logout } = useAuth()
  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: '概览' },
    { key: '/assets', icon: <VideoCameraOutlined />, label: '素材库' },
    { key: '/courses', icon: <ReadOutlined />, label: '课程管理' },
    { key: '/creator-profile', icon: <UserOutlined />, label: '创作者主页' },
    { key: '/benefits', icon: <GiftOutlined />, label: '权益码运营' },
    { key: '/lexicon', icon: <BookOutlined />, label: '单词库' },
    { key: '/image-creative', icon: <PictureOutlined />, label: '图片创意' },
    { key: '/subtitle-timing', icon: <FieldTimeOutlined />, label: '字幕打轴器' },
    ...(isSuperAdmin(user)
      ? [
          { key: '/tools', icon: <ExperimentOutlined />, label: '工具中心' },
          { key: '/voice-clone', icon: <SoundOutlined />, label: '语音克隆' },
          { key: '/course-agent-studio', icon: <RocketOutlined />, label: 'AI 课程工坊' },
          { key: '/users', icon: <TeamOutlined />, label: '用户管理' },
          { key: '/learner-admin', icon: <DeploymentUnitOutlined />, label: 'Learner 管理' },
          { key: '/homework-review', icon: <AuditOutlined />, label: '口语作业审核' },
          { key: '/lesson-image-gen', icon: <PictureOutlined />, label: '课节图片生成器' },
          { key: '/lesson-image-gen-v2', icon: <PictureOutlined />, label: '课节图片生成器 V2' },
          { key: '/lesson-json-design', icon: <CodeOutlined />, label: '课程 JSON 设计' },
          { key: '/lesson-json-design-v2', icon: <CodeOutlined />, label: '课程 JSON 设计 V2' },
          { key: '/teaching-board-studio', icon: <HighlightOutlined />, label: 'TeachingBoard Studio' },
        ]
      : []),
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        style={{ background: token.colorBgContainer }}
        width={220}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: collapsed ? 0 : '0 20px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
        }}>
          <Title level={4} style={{ margin: 0, color: token.colorPrimary, whiteSpace: 'nowrap' }}>
            {collapsed ? 'D' : 'Ditto 生产引擎'}
          </Title>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[
            location.pathname.startsWith('/courses')
              ? '/courses'
              : location.pathname.startsWith('/tools')
                ? '/tools'
                : location.pathname,
          ]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0, marginTop: 8 }}
        />
      </Sider>

      <Layout>
        <Header style={{
          background: token.colorBgContainer,
          padding: '0 24px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          display: 'flex',
          alignItems: 'center',
        }}>
          <Space style={{ width: '100%', justifyContent: 'space-between' }}>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              Ditto 生产引擎 · 创作后台
            </Typography.Text>
            <Space>
              <Typography.Text>{user?.username}</Typography.Text>
              <Button
                size="small"
                onClick={() => {
                  logout()
                  navigate('/login', { replace: true })
                }}
              >
                退出登录
              </Button>
            </Space>
          </Space>
        </Header>

        <Content style={{
          margin: '24px',
          padding: '24px',
          background: token.colorBgContainer,
          borderRadius: token.borderRadiusLG,
          minHeight: 'calc(100vh - 64px - 48px)',
        }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}
