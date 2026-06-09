import { useMemo, useState } from 'react'
import { Button, Input, Modal, Space, Typography, message } from 'antd'
import type { AtbReactionDocument } from '../../types/atbReactionV2'
import { stringifyDocument, validateDocument } from '../../types/atbReactionV2Editor'

const { TextArea } = Input
const { Text } = Typography

interface Props {
  doc: AtbReactionDocument
  onImport: (text: string) => void
  onReset: () => void
  onLoadSample: () => void
}

export default function JsonExportPanel({ doc, onImport, onReset, onLoadSample }: Props) {
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const jsonPreview = useMemo(() => stringifyDocument(doc), [doc])

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(jsonPreview)
      message.success('已复制到剪贴板')
    } catch {
      message.error('复制失败')
    }
  }

  const downloadJson = () => {
    const errors = validateDocument(doc)
    if (errors.length) {
      message.warning(`存在 ${errors.length} 项校验提示，仍将下载`)
    }
    const blob = new Blob([jsonPreview], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'atb_reaction.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    try {
      onImport(importText)
      setImportOpen(false)
      message.success('导入成功')
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '导入失败')
    }
  }

  return (
    <div>
      <Space wrap style={{ marginBottom: 8 }}>
        <Button size="small" onClick={() => setImportOpen(true)}>
          导入 JSON
        </Button>
        <Button size="small" onClick={() => void copyJson()}>
          复制
        </Button>
        <Button size="small" type="primary" onClick={downloadJson}>
          下载 atb_reaction.json
        </Button>
        <Button size="small" onClick={onLoadSample}>
          加载 Purple 样例
        </Button>
        <Button size="small" danger onClick={onReset}>
          清空草稿
        </Button>
      </Space>
      <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
        JSON 实时预览
      </Text>
      <TextArea readOnly value={jsonPreview} rows={14} style={{ fontFamily: 'monospace', fontSize: 11 }} />
      <Modal
        title="从文本导入 JSON"
        open={importOpen}
        onOk={handleImport}
        onCancel={() => setImportOpen(false)}
        width={720}
        okText="导入"
      >
        <TextArea
          rows={14}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="粘贴完整 ATB V2 JSON"
          style={{ fontFamily: 'monospace', fontSize: 12 }}
        />
      </Modal>
    </div>
  )
}
