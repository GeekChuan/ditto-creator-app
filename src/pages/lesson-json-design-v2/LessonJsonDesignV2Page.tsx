import { useCallback, useMemo, useState } from 'react'
import { Alert, Button, Card, Col, Row, Space, Steps, Typography, message } from 'antd'
import { ThunderboltOutlined } from '@ant-design/icons'
import type { AtbActivity, AtbReactionDocument } from '../../types/atbReactionV2'
import type { EditorStep, SelectionPath } from '../../types/atbReactionV2Editor'
import { selectionLabel } from '../../types/atbReactionV2Editor'
import ActivitiesPanel from '../../components/lesson-json-v2/ActivitiesPanel'
import BatchVoiceCompletionModal from '../../components/lesson-json-v2/BatchVoiceCompletionModal'
import AtbV2MobilePreviewPanel from '../../components/lesson-json-v2/AtbV2MobilePreviewPanel'
import AtbV2StructuralPreview from '../../components/lesson-json-v2/AtbV2StructuralPreview'
import DocumentOutlineTree from '../../components/lesson-json-v2/DocumentOutlineTree'
import JsonExportPanel from '../../components/lesson-json-v2/JsonExportPanel'
import LessonMetaForm from '../../components/lesson-json-v2/LessonMetaForm'
import SrcAssetsTable from '../../components/lesson-json-v2/SrcAssetsTable'
import { useAtbV2Draft } from './hooks/useAtbV2Draft'

const { Title, Paragraph, Text } = Typography

export default function LessonJsonDesignV2Page() {
  const { doc, setDoc, hydrated, resetDraft, importDocument } = useAtbV2Draft()
  const [step, setStep] = useState<EditorStep>(0)
  const [selection, setSelection] = useState<SelectionPath>({ kind: 'lesson' })
  const [batchVoiceOpen, setBatchVoiceOpen] = useState(false)

  const patchDoc = useCallback((patch: Partial<AtbReactionDocument>) => {
    setDoc((prev) => ({ ...prev, ...patch }))
  }, [setDoc])

  const loadPurpleSample = useCallback(async () => {
    const res = await fetch('/fixtures/atb_reaction.json')
    if (!res.ok) throw new Error('样例加载失败')
    importDocument(await res.text())
  }, [importDocument])

  const centerTitle = useMemo(() => {
    if (step === 0) return '课节元数据'
    if (step === 1) return '资源池 src'
    if (step === 2) return selectionLabel(selection, doc)
    return ''
  }, [step, selection, doc])

  const renderCenter = () => {
    if (step === 0) {
      return <LessonMetaForm doc={doc} onChange={patchDoc} />
    }
    if (step === 1) {
      return <SrcAssetsTable doc={doc} onChangeSrc={(src) => patchDoc({ src })} />
    }
    return (
      <ActivitiesPanel
        doc={doc}
        selection={selection}
        onSelect={setSelection}
        onChangeActivities={(activities: AtbActivity[]) => patchDoc({ activities })}
      />
    )
  }

  if (!hydrated) {
    return <Text type="secondary">加载草稿中…</Text>
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <Title level={4} style={{ marginBottom: 4 }}>
            课程 JSON 设计 V2
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            面向 ATB V2 格式（version / src / activities）。定稿后复制或下载 JSON，在移动端 dev 预览路由验证。
          </Paragraph>
        </div>
        <Button
          type="primary"
          icon={<ThunderboltOutlined />}
          onClick={() => setBatchVoiceOpen(true)}
        >
          一键补全所有语音并打轴
        </Button>
      </div>

      <Steps
        current={step}
        onChange={(s) => setStep(s as EditorStep)}
        items={[
          { title: '课节信息', description: '课程元数据' },
          { title: '资源池 src', description: 'OSS 上传、视频字幕与 ASR' },
          { title: 'Activities', description: '活动与 Node 编排' },
        ]}
      />

      <Row gutter={16}>
        <Col xs={24} lg={5}>
          <Card title="文档大纲" size="small">
            <DocumentOutlineTree
              doc={doc}
              selection={selection}
              onSelect={(path) => {
                setSelection(path)
                if (path.kind === 'lesson') setStep(0)
                else if (path.kind === 'src') setStep(1)
                else setStep(2)
              }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={11}>
          <Card title={centerTitle} size="small">
            {renderCenter()}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <Card title="结构化预览" size="small">
              <AtbV2StructuralPreview
                doc={doc}
                selection={selection}
                onSelectNode={(activityIndex, nodeIndex) => {
                  setStep(2)
                  setSelection({ kind: 'node', activityIndex, nodeIndex })
                }}
              />
            </Card>
            <Card title="JSON 导出" size="small">
              <JsonExportPanel
                doc={doc}
                onImport={importDocument}
                onReset={resetDraft}
                onLoadSample={() => {
                  void loadPurpleSample().then(
                    () => message.success('已加载 Purple 样例'),
                    (e: unknown) =>
                      message.error(e instanceof Error ? e.message : '样例加载失败'),
                  )
                }}
              />
            </Card>
            <AtbV2MobilePreviewPanel doc={doc} />
          </Space>
        </Col>
      </Row>

      <BatchVoiceCompletionModal
        open={batchVoiceOpen}
        doc={doc}
        onClose={() => setBatchVoiceOpen(false)}
        onApply={(next) => setDoc(next)}
      />

      <Alert
        type="info"
        showIcon
        message="定稿说明"
        description="V2 JSON 暂不支持直接写入课程管理后台。请下载 JSON 后，在 mobile-app 的 /dev/atb-submerge-preview 或替换 fixtures 验证。"
      />
    </Space>
  )
}
