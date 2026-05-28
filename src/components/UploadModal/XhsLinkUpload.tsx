import { useState } from 'react'
import { Form, Input, Button, Typography, Alert, message } from 'antd'
import { assetsApi } from '../../api/assets'

const { Text, Paragraph } = Typography

interface Props {
  onSuccess: () => void
}

export default function XhsLinkUpload({ onSuccess }: Props) {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (values: { note_url: string; title?: string }) => {
    setSubmitting(true)
    try {
      await assetsApi.importFromXiaohongshu({
        note_url: values.note_url.trim(),
        title: values.title?.trim() || null,
      })
      message.success('已从链接拉取视频并转存，素材入库成功')
      form.resetFields()
      onSuccess()
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { detail?: unknown } } }
      const detail = ax?.response?.data?.detail
      const text =
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.map((d) => (typeof d === 'object' && d && 'msg' in d ? String((d as { msg: unknown }).msg) : String(d))).join('；')
            : '入库失败，请检查链接或稍后重试'
      message.error(text)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ padding: '4px 0' }}>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="说明"
        description={
          <Paragraph style={{ marginBottom: 0, fontSize: 13 }}>
            粘贴小红书笔记分享链接。服务端会通过 LAYZZ 解析出临时视频地址，下载后<strong>转存到 COS</strong>再写入素材库。
            需在服务器环境变量中配置 <Text code>LAYZZ_TOKEN</Text>。
          </Paragraph>
        }
      />
      <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
        <Form.Item
          label="笔记链接"
          name="note_url"
          rules={[{ required: true, message: '请输入笔记链接' }]}
        >
          <Input.TextArea
            rows={3}
            placeholder="小红书分享链接、xhslink 短链，或 sns-video*.xhscdn.com 的 .mp4 直链"
          />
        </Form.Item>
        <Form.Item label="标题（可选，覆盖解析结果）" name="title">
          <Input placeholder="不填则使用解析到的标题" />
        </Form.Item>
        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button type="primary" htmlType="submit" loading={submitting}>
            拉取并入库
          </Button>
        </Form.Item>
      </Form>
    </div>
  )
}
