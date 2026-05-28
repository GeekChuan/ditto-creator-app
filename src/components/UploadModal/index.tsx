import { useState } from 'react'
import { Modal, Row, Col, Typography, Tag } from 'antd'
import {
  UploadOutlined,
  LinkOutlined,
  CopyOutlined,
} from '@ant-design/icons'
import FormUpload from './FormUpload'
import XhsLinkUpload from './XhsLinkUpload'

const { Text } = Typography

type Mode = 'form' | 'url' | 'competitor'

interface ModeCard {
  key: Mode
  icon: React.ReactNode
  title: string
  desc: string
  available: boolean
}

const MODES: ModeCard[] = [
  {
    key: 'form',
    icon: <UploadOutlined style={{ fontSize: 28 }} />,
    title: '表单上传',
    desc: '手动填写元数据，上传视频与封面',
    available: true,
  },
  {
    key: 'url',
    icon: <LinkOutlined style={{ fontSize: 28 }} />,
    title: '链接入库',
    desc: '粘贴小红书笔记链接，视频转存 COS 后入库',
    available: true,
  },
  {
    key: 'competitor',
    icon: <CopyOutlined style={{ fontSize: 28 }} />,
    title: '友商抄袭',
    desc: '导入友商元数据，通过 Adapter 适配',
    available: false,
  },
]

interface Props {
  open: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function UploadModal({ open, onClose, onSuccess }: Props) {
  const [selectedMode, setSelectedMode] = useState<Mode>('form')

  const handleSuccess = () => {
    onSuccess()
    onClose()
    setSelectedMode('form')
  }

  const handleCancel = () => {
    setSelectedMode('form')
    onClose()
  }

  return (
    <Modal
      open={open}
      onCancel={handleCancel}
      footer={null}
      width={640}
      title="上传素材"
      destroyOnClose
    >
      {/* 模式选择卡片 */}
      <Row gutter={12} style={{ marginBottom: 24 }}>
        {MODES.map((m) => {
          const isSelected = selectedMode === m.key && m.available
          return (
            <Col span={8} key={m.key}>
              <div
                onClick={() => m.available && setSelectedMode(m.key)}
                style={{
                  border: `2px solid ${isSelected ? '#6366f1' : '#e5e7eb'}`,
                  borderRadius: 10,
                  padding: '16px 12px',
                  textAlign: 'center',
                  cursor: m.available ? 'pointer' : 'not-allowed',
                  background: isSelected ? '#f5f3ff' : m.available ? '#fff' : '#fafafa',
                  opacity: m.available ? 1 : 0.55,
                  position: 'relative',
                  transition: 'border-color 0.15s, background 0.15s',
                  userSelect: 'none',
                }}
              >
                {!m.available && (
                  <Tag
                    color="default"
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      fontSize: 11,
                      lineHeight: '18px',
                      padding: '0 6px',
                      margin: 0,
                    }}
                  >
                    Coming Soon
                  </Tag>
                )}
                <div style={{ color: isSelected ? '#6366f1' : '#6b7280', marginBottom: 8 }}>
                  {m.icon}
                </div>
                <Text strong style={{ fontSize: 13, display: 'block', marginBottom: 4, color: isSelected ? '#6366f1' : undefined }}>
                  {m.title}
                </Text>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {m.desc}
                </Text>
              </div>
            </Col>
          )
        })}
      </Row>

      {/* 表单内容区 */}
      {selectedMode === 'form' && <FormUpload onSuccess={handleSuccess} />}
      {selectedMode === 'url' && <XhsLinkUpload onSuccess={handleSuccess} />}
    </Modal>
  )
}
