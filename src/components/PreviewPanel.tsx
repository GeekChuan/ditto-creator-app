import { useCallback, useMemo, useRef, useState } from 'react'
import { Button, Card, Input, Space, Typography, message } from 'antd'
import type { SDUISchemaNode } from '@laix/ditto-core-engine'
import { signSchemaMediaUrls } from '../utils/signSchemaMedia'

const { Paragraph, Text } = Typography

const DEFAULT_LEARNER_URL = 'http://localhost:5174'
const MESSAGE_TYPE = 'DITTO_SDU_SCHEMA_UPDATE'

const defaultSchemaText = JSON.stringify(
  {
    type: 'container',
    props: {
      style: {
        minHeight: '100vh',
        padding: 24,
        background: '#f8fafc',
      },
    },
    children: [
      {
        type: 'text',
        props: {
          value: '来自 Creator 的实时 Schema 预览',
          style: { fontSize: 22, fontWeight: 700, display: 'block', marginBottom: 12 },
        },
      },
      {
        type: 'button',
        props: {
          label: '这是 SDUI 按钮',
          style: { padding: '8px 14px', borderRadius: 8, border: '1px solid #cbd5e1' },
        },
      },
    ],
  },
  null,
  2,
)

export default function PreviewPanel() {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [schemaText, setSchemaText] = useState(defaultSchemaText)
  const learnerPreviewUrl = useMemo(() => {
    return import.meta.env.VITE_LEARNER_PREVIEW_URL || DEFAULT_LEARNER_URL
  }, [])

  const postSchema = useCallback(async () => {
    const iframeWindow = iframeRef.current?.contentWindow
    if (!iframeWindow) {
      message.warning('预览窗口尚未就绪')
      return
    }

    try {
      const schema = JSON.parse(schemaText) as SDUISchemaNode
      const signedSchema = await signSchemaMediaUrls(schema)
      iframeWindow.postMessage(
        {
          type: MESSAGE_TYPE,
          payload: signedSchema,
        },
        '*',
      )
      message.success('Schema 已发送到 Learner 预览')
    } catch {
      message.error('Schema JSON 格式不合法，请检查后重试')
    }
  }, [schemaText])

  return (
    <Card title="SDUI 预览面板" bordered={false}>
      <Paragraph type="secondary" style={{ marginTop: -4 }}>
        Creator 通过 `postMessage` 将 JSON Schema 推送给 Learner iframe，验证 Server-Driven UI 渲染链路。
      </Paragraph>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        <Text type="secondary">Learner 预览地址：{learnerPreviewUrl}</Text>
        <Input.TextArea
          value={schemaText}
          onChange={(e) => setSchemaText(e.target.value)}
          autoSize={{ minRows: 10, maxRows: 20 }}
          placeholder="在这里输入/粘贴 JSON Schema"
        />
        <Space>
          <Button type="primary" onClick={postSchema}>
            发送 Schema 到 Learner
          </Button>
        </Space>
        <iframe
          ref={iframeRef}
          title="Learner Preview"
          src={learnerPreviewUrl}
          style={{
            width: '100%',
            height: 420,
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            background: '#fff',
          }}
          onLoad={postSchema}
        />
      </Space>
    </Card>
  )
}
