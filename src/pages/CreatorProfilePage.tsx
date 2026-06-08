import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons'
import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Col, Form, Input, Row, Space, Typography, message } from 'antd'
import ImageOssUploadField from '../components/ImageOssUploadField'
import { useSignedMediaUrl } from '../hooks/useSignedMediaUrl'
import {
  creatorProfileApi,
  type CreatorProfileOut,
  type CreatorProfileUpdate,
  type ProfileStatItem,
} from '../api/creatorProfile'

const { Title, Text, Paragraph } = Typography

const DEFAULT_PROFILE_STATS: ProfileStatItem[] = [
  { label: '粉丝', value: '12.6万' },
  { label: '好评率', value: '98%' },
  { label: '学生', value: '5.2万+' },
]

function ProfilePreview({ values }: { values: CreatorProfileUpdate & { display_name?: string } }) {
  const name = values.display_name?.trim() || '主讲老师'
  const avatarSrc = useSignedMediaUrl(values.avatar_url)
  const stats = values.profile_stats?.filter((item) => item.label?.trim() && item.value?.trim()) ?? []

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
              {values.role_label?.trim() || '主讲老师'}
            </span>
          </div>
          {values.bio ? (
            <Paragraph type="secondary" style={{ margin: '6px 0 0', fontSize: 13 }} ellipsis={{ rows: 2 }}>
              {values.bio}
            </Paragraph>
          ) : null}
        </div>
      </div>
      {stats.length > 0 ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            marginTop: 16,
            paddingTop: 12,
            borderTop: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          {stats.map((item, index) => (
            <div key={`${item.label}-${index}`} style={{ textAlign: 'center', flex: 1 }}>
              <div style={{ fontWeight: 700 }}>{item.value}</div>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {item.label}
              </Text>
            </div>
          ))}
        </div>
      ) : null}
      {values.social_proof_quote ? (
        <Paragraph style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }} type="secondary">
          {values.social_proof_label?.trim() ? `${values.social_proof_label}：` : ''}
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
        role_label: data.role_label || '主讲老师',
        profile_stats: data.profile_stats?.length ? data.profile_stats : DEFAULT_PROFILE_STATS,
        social_proof_label: data.social_proof_label ?? '粉丝评价',
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
      const profileStats = (values.profile_stats ?? [])
        .map((item) => ({
          label: item.label?.trim() ?? '',
          value: item.value?.trim() ?? '',
        }))
        .filter((item) => item.label && item.value)
      setSaving(true)
      const updated = await creatorProfileApi.updateProfile({
        ...values,
        profile_stats: profileStats,
        social_proof_label: values.social_proof_label?.trim() || null,
      })
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
        配置 Learner 移动端课程详情中的老师介绍与社交展示数据。展示数据项的字段名与展示值均可自定义。
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
              <Form.Item name="role_label" label="身份标签">
                <Input maxLength={64} placeholder="例如：主讲老师" />
              </Form.Item>
              <Form.Item name="bio" label="简介（建议两行内）">
                <Input.TextArea rows={3} maxLength={500} showCount />
              </Form.Item>

              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                展示数据
              </Text>
              <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 12 }}>
                可自定义字段名与展示值，例如「粉丝 / 12.6万」「完课率 / 95%」
              </Text>
              <Form.List name="profile_stats">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map((field) => (
                      <Row gutter={12} key={field.key} align="middle" style={{ marginBottom: 8 }}>
                        <Col span={9}>
                          <Form.Item
                            {...field}
                            name={[field.name, 'label']}
                            rules={[{ required: true, message: '请输入字段名' }]}
                            style={{ marginBottom: 0 }}
                          >
                            <Input maxLength={32} placeholder="字段名" />
                          </Form.Item>
                        </Col>
                        <Col span={11}>
                          <Form.Item
                            {...field}
                            name={[field.name, 'value']}
                            rules={[{ required: true, message: '请输入展示值' }]}
                            style={{ marginBottom: 0 }}
                          >
                            <Input maxLength={32} placeholder="展示值" />
                          </Form.Item>
                        </Col>
                        <Col span={4}>
                          <Button
                            type="text"
                            danger
                            icon={<MinusCircleOutlined />}
                            onClick={() => remove(field.name)}
                            disabled={fields.length <= 1}
                          />
                        </Col>
                      </Row>
                    ))}
                    <Button
                      type="dashed"
                      onClick={() => add({ label: '', value: '' })}
                      icon={<PlusOutlined />}
                      disabled={fields.length >= 6}
                      style={{ width: '100%', marginBottom: 16 }}
                    >
                      添加数据项
                    </Button>
                  </>
                )}
              </Form.List>

              <Form.Item name="social_proof_label" label="评价区标题（可选）">
                <Input maxLength={64} placeholder="例如：粉丝评价" />
              </Form.Item>
              <Form.Item name="social_proof_quote" label="评价内容（可选）">
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
