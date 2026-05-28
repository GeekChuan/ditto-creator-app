import { useState } from 'react'
import { Alert, Form, Input, Modal, Select, Typography, message } from 'antd'
import { assetsApi, type VideoAsset } from '../api/assets'

interface Props {
  open: boolean
  asset: VideoAsset | null
  onClose: () => void
  onSuccess?: (assetId: string) => void
}

const TOOL_ID = 'speech-recognition-bigmodel' as const

export default function AddSubtitleModal({ open, asset, onClose, onSuccess }: Props) {
  const [submitting, setSubmitting] = useState(false)
  const [form] = Form.useForm<{ note?: string }>()
  const [messageApi, contextHolder] = message.useMessage()

  const handleSubmit = async () => {
    if (!asset) return
    const values = await form.validateFields()
    setSubmitting(true)
    try {
      await assetsApi.createSubtitleTask(asset.id, {
        tool_id: TOOL_ID,
        language: 'zh',
        note: values.note,
      })
      messageApi.success('已加入字幕任务队列')
      form.resetFields()
      onSuccess?.(asset.id)
      onClose()
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      if (err?.response?.status === 409) {
        messageApi.warning(detail || '该视频已有字幕任务正在执行')
      } else {
        messageApi.error(detail || '创建字幕任务失败，请稍后重试')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="添加字幕"
      open={open}
      okText="提交任务"
      cancelText="取消"
      onCancel={onClose}
      onOk={handleSubmit}
      okButtonProps={{ loading: submitting, disabled: !asset }}
      destroyOnClose
    >
      {contextHolder}
      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
        当前仅支持豆包大模型 API 版语音识别。任务会进入队列并异步处理，完成后自动写入字幕库。
      </Typography.Paragraph>
      <Alert
        showIcon
        type="info"
        message="字幕打轴与字幕 Agent 工具暂未开放（TBD）"
        style={{ marginBottom: 14 }}
      />
      <Form form={form} layout="vertical">
        <Form.Item label="处理工具">
          <Select
            disabled
            value={TOOL_ID}
            options={[{ value: TOOL_ID, label: '豆包大模型 API 版语音识别' }]}
          />
        </Form.Item>
        <Form.Item label="备注（可选）" name="note">
          <Input.TextArea rows={3} placeholder="记录用途备注，不参与识别" />
        </Form.Item>
      </Form>
    </Modal>
  )
}
