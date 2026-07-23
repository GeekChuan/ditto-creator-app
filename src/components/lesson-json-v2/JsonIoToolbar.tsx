import { useMemo, useState } from 'react'
import { Button, Dropdown, Input, Modal, Space, Typography, Upload, message } from 'antd'
import {
  CopyOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileAddOutlined,
  ImportOutlined,
  InboxOutlined,
  RestOutlined,
} from '@ant-design/icons'
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

/** 顶栏的 JSON 导入 / 导出工具条：属于流程首尾的公共操作 */
export default function JsonIoToolbar({ doc, onImport, onReset, onLoadSample }: Props) {
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [importFileName, setImportFileName] = useState<string | null>(null)
  const [viewOpen, setViewOpen] = useState(false)
  const [modal, contextHolder] = Modal.useModal()

  // 大文档 stringify 有开销，仅在查看弹窗打开时计算
  const jsonPreview = useMemo(
    () => (viewOpen ? stringifyDocument(doc) : ''),
    [viewOpen, doc],
  )

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(stringifyDocument(doc))
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
    const blob = new Blob([stringifyDocument(doc)], { type: 'application/json' })
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
      setImportText('')
      setImportFileName(null)
      message.success('导入成功')
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : '导入失败')
    }
  }

  const readImportFile = async (file: File) => {
    try {
      const text = await file.text()
      JSON.parse(text) // 早期报错：非 JSON 文件直接提示，不污染文本框
      setImportText(text)
      setImportFileName(file.name)
      message.success(`已读取 ${file.name}，确认内容后点「导入」`)
    } catch {
      message.error(`${file.name} 不是合法的 JSON 文件`)
    }
    return false
  }

  const confirmReset = () => {
    void modal.confirm({
      title: '清空当前草稿？',
      content: '将删除本地草稿并回到空文档，此操作不可通过撤销恢复。',
      okText: '清空',
      okButtonProps: { danger: true },
      onOk: onReset,
    })
  }

  return (
    <>
      {contextHolder}
      <Space size={8}>
        <Button icon={<ImportOutlined />} onClick={() => setImportOpen(true)}>
          导入 JSON
        </Button>
        <Dropdown.Button
          icon={<DownloadOutlined />}
          onClick={downloadJson}
          menu={{
            items: [
              { key: 'copy', label: '复制 JSON', icon: <CopyOutlined /> },
              { key: 'view', label: '查看 JSON', icon: <EyeOutlined /> },
              { type: 'divider' },
              { key: 'sample', label: '加载 Purple 样例', icon: <FileAddOutlined /> },
              { key: 'reset', label: '清空草稿', icon: <RestOutlined />, danger: true },
            ],
            onClick: ({ key }) => {
              if (key === 'copy') void copyJson()
              else if (key === 'view') setViewOpen(true)
              else if (key === 'sample') onLoadSample()
              else if (key === 'reset') confirmReset()
            },
          }}
        >
          导出 JSON
        </Dropdown.Button>
      </Space>

      <Modal
        title="导入 JSON"
        open={importOpen}
        onOk={handleImport}
        onCancel={() => {
          setImportOpen(false)
          setImportFileName(null)
        }}
        width={720}
        okText="导入"
        okButtonProps={{ disabled: !importText.trim() }}
      >
        <Space direction="vertical" size={10} style={{ width: '100%' }}>
          <Upload.Dragger
            accept=".json,application/json"
            showUploadList={false}
            multiple={false}
            beforeUpload={(file) => readImportFile(file)}
            style={{ padding: '4px 0' }}
          >
            <p className="ant-upload-drag-icon" style={{ marginBottom: 4 }}>
              <InboxOutlined />
            </p>
            <p className="ant-upload-text" style={{ fontSize: 13 }}>
              点击或拖拽 JSON 文件到此处
            </p>
            {importFileName ? (
              <Text type="success" style={{ fontSize: 12 }}>
                已读取：{importFileName}
              </Text>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>
                读取后会填入下方文本框，确认后再导入
              </Text>
            )}
          </Upload.Dragger>
          <TextArea
            rows={10}
            value={importText}
            onChange={(e) => {
              setImportText(e.target.value)
              setImportFileName(null)
            }}
            placeholder="或直接粘贴完整 ATB V2 JSON"
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          />
        </Space>
      </Modal>

      <Modal
        title="JSON 预览"
        open={viewOpen}
        onCancel={() => setViewOpen(false)}
        width={760}
        footer={
          <Button type="primary" onClick={() => void copyJson()}>
            复制 JSON
          </Button>
        }
      >
        <TextArea
          readOnly
          value={jsonPreview}
          rows={20}
          style={{ fontFamily: 'monospace', fontSize: 11 }}
        />
      </Modal>
    </>
  )
}
