import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Col, Form, Input, InputNumber, Row, Space, Typography, message } from 'antd'
import ImageOssUploadField from '../components/ImageOssUploadField'
import { useSignedMediaUrl } from '../hooks/useSignedMediaUrl'
import {
  creatorProfileApi,
  type CreatorProfileOut,
  type CreatorProfileUpdate,
} from '../api/creatorProfile'

const { Title, Text, Paragraph } = Typography

function formatCountWan(value: number | null | undefined): string {
  if (value == null || value <= 0) return '—'
  if (value >= 10000) {
    const wan = value / 10000
    return `${wan % 1 === 0 ? wan.toFixed(0) : wan.toFixed(1)}万`
  }
  return String(value)
}

function ProfilePreview({ values }: { values: CreatorProfileUpdate & { display_name?: string } }) {
  const name = values.display_name?.trim() || '主讲老师'
  const avatarSrc = useSignedMediaUrl(values.avatar_url)
  return (
    <div
      style={{
        background: '#f5f6f8',
        borderRadius: 16,
        padding: 16,
        maxWidth: 360,
      }}
    >
      <Text type="secondary" style={{ fontSize: 12 }}>
        Learner 课程详情 · 老师区预览
      </Text>
      <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
        {avatarSrc ? (
          <img
            src={avatarSrc}
            alt=""
            style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(126,200,154,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              color: '#7ec89a',
            }}
          >
            {name.slice(0, 1)}
          </div>
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text strong>{name}</Text>
            <span
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 999,
                background: 'rgba(126,200,154,0.18)',
                color: '#7ec89a',
              }}
            >
              主讲老师
            </span>
          </div>
          {values.bio ? (
            <Paragraph type="secondary" style={{ margin: '6px 0 0', fontSize: 13 }} ellipsis={{ rows: 2 }}>
              {values.bio}
            </Paragraph>
          ) : null}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          marginTop: 16,
          paddingTop: 12,
          borderTop: '1px solid rgba(0,0,0,0.06)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700 }}>{formatCountWan(values.followers_count)}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            粉丝
          </Text>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700 }}>
            {values.positive_rate_percent != null ? `${values.positive_rate_percent}%` : '—'}
          </div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            好评率
          </Text>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 700 }}>{formatCountWan(values.student_count)}+</div>
          <Text type="secondary" style={{ fontSize: 12 }}>
            学生
          </Text>
        </div>
      </div>
      {values.social_proof_quote ? (
        <Paragraph style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }} type="secondary">
          {values.social_proof_quote}
        </Paragraph>
      ) : null}
    </div>
  )
}

export default function CreatorProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<CreatorProfileOut | null>(null)
  const [form] = Form.useForm<CreatorProfileUpdate>()
  const watched = Form.useWatch([], form)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await creatorProfileApi.getProfile()
      setProfile(data)
      form.setFieldsValue({
        display_name: data.display_name,
        avatar_url: data.avatar_url,
        bio: data.bio,
        followers_count: data.followers_count,
        positive_rate_percent: data.positive_rate_percent,
        student_count: data.student_count,
        social_proof_quote: data.social_proof_quote,
      })
    } catch {
      message.error('加载创作者资料失败')
    } finally {
      setLoading(false)
    }
  }, [form])

  useEffect(() => {
    void load()
  }, [load])

  const save = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)
      const updated = await creatorProfileApi.updateProfile(values)
      setProfile(updated)
      message.success('已保存，Learner 课程详情将展示最新资料')
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'errorFields' in e) return
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const previewValues = { ...profile, ...watched } as CreatorProfileUpdate & { display_name?: string }

  return (
    <div>
      <Title level={4} style={{ marginTop: 0 }}>
        创作者主页
      </Title>
      <Paragraph type="secondary">
        配置 Learner 移动端课程详情中的老师介绍与社交展示数据。ATB 课节脚本内的 tutor 头像与此处独立维护。
      </Paragraph>

      <Row gutter={24}>
        <Col xs={24} lg={14}>
          <Card loading={loading}>
            <Form form={form} layout="vertical">
              <Form.Item
                name="display_name"
                label="展示名称"
                rules={[{ required: true, message: '请输入名称' }]}
              >
                <Input maxLength={128} />
              </Form.Item>
              <Form.Item name="avatar_url" label="头像 URL">
                <ImageOssUploadField placeholder="上传头像或粘贴图片 URL" />
              </Form.Item>
              <Form.Item name="bio" label="简介（建议两行内）">
                <Input.TextArea rows={3} maxLength={500} showCount />
              </Form.Item>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item name="followers_count" label="粉丝数">
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="positive_rate_percent" label="好评率 %">
                    <InputNumber min={0} max={100} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item name="student_count" label="学生数">
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="social_proof_quote" label="粉丝评价（可选）">
                <Input.TextArea rows={2} maxLength={300} showCount placeholder="例如：来自小红书 @Emma：…" />
              </Form.Item>
              {profile ? (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  slug: {profile.slug} · 状态: {profile.status}
                </Text>
              ) : null}
            </Form>
            <Space style={{ marginTop: 16 }}>
              <Button type="primary" loading={saving} onClick={() => void save()}>
                保存
              </Button>
              <Button onClick={() => void load()} disabled={loading}>
                重新加载
              </Button>
            </Space>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card title="Learner 预览">
            <ProfilePreview values={previewValues} />
          </Card>
        </Col>
      </Row>
    </div>
  )
}
