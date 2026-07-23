import { useCallback, useState } from 'react'
import {
  Button,
  Collapse,
  Drawer,
  Empty,
  Input,
  List,
  Modal,
  Popconfirm,
  Radio,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd'
import { CloudUploadOutlined, DeleteOutlined, FolderOpenOutlined, HistoryOutlined } from '@ant-design/icons'
import type { AtbDraft, AtbDraftVersionMeta } from '../../api/atbDrafts'
import { atbDraftsApi } from '../../api/atbDrafts'
import { useAtbV2EditorStore } from '../../pages/lesson-json-design-v2/store'
import { downloadTextFile, notesToMarkdown } from '../../utils/noteExport'

const { Text } = Typography

function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`
}

function extractErrorMessage(e: unknown): string {
  if (e && typeof e === 'object') {
    const detail = (e as { response?: { data?: { detail?: unknown } } }).response?.data?.detail
    if (typeof detail === 'string' && detail.trim()) return detail
  }
  return e instanceof Error && e.message ? e.message : '请求失败'
}

/** 顶栏草稿夹入口：保存版本到数据库 + 浏览/载入迭代记录 */
export default function DraftLockerControls() {
  const draftBinding = useAtbV2EditorStore((s) => s.draftBinding)
  const setDraftBinding = useAtbV2EditorStore((s) => s.setDraftBinding)
  const replaceDoc = useAtbV2EditorStore((s) => s.replaceDoc)
  const replaceNotes = useAtbV2EditorStore((s) => s.replaceNotes)

  // ---- 保存弹窗 ----
  const [saveOpen, setSaveOpen] = useState(false)
  const [saveMode, setSaveMode] = useState<'version' | 'new'>('version')
  const [title, setTitle] = useState('')
  const [remark, setRemark] = useState('')
  const [saving, setSaving] = useState(false)

  const openSave = () => {
    setSaveMode(draftBinding ? 'version' : 'new')
    setTitle(draftBinding?.title ?? '')
    setRemark('')
    setSaveOpen(true)
  }

  const handleSave = async () => {
    const state = useAtbV2EditorStore.getState()
    const payload = {
      document: state.doc,
      notes: state.notes,
      remark: remark.trim() || undefined,
    }
    setSaving(true)
    try {
      if (saveMode === 'version' && draftBinding) {
        const version = await atbDraftsApi.saveVersion(draftBinding.draftId, payload)
        setDraftBinding({ ...draftBinding, latestVersionNo: version.version_no })
        message.success(`已保存 ${draftBinding.title} · v${version.version_no}`)
      } else {
        const trimmedTitle = title.trim()
        if (!trimmedTitle) {
          message.warning('请填写草稿标题')
          return
        }
        const draft = await atbDraftsApi.create({ title: trimmedTitle, ...payload })
        setDraftBinding({
          draftId: draft.id,
          title: draft.title,
          latestVersionNo: draft.latest_version_no,
        })
        message.success(`已创建草稿「${draft.title}」· v1`)
      }
      setSaveOpen(false)
    } catch (e) {
      message.error(`保存失败：${extractErrorMessage(e)}`)
    } finally {
      setSaving(false)
    }
  }

  // ---- 草稿夹抽屉 ----
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drafts, setDrafts] = useState<AtbDraft[]>([])
  const [draftsLoading, setDraftsLoading] = useState(false)
  const [versionsByDraft, setVersionsByDraft] = useState<Record<string, AtbDraftVersionMeta[]>>({})
  const [loadingVersionKey, setLoadingVersionKey] = useState<string | null>(null)

  const refreshDrafts = useCallback(async () => {
    setDraftsLoading(true)
    try {
      setDrafts(await atbDraftsApi.list())
    } catch (e) {
      message.error(`草稿夹加载失败：${extractErrorMessage(e)}`)
    } finally {
      setDraftsLoading(false)
    }
  }, [])

  const openDrawer = () => {
    setDrawerOpen(true)
    void refreshDrafts()
  }

  const loadVersionList = async (draftId: string) => {
    try {
      const versions = await atbDraftsApi.listVersions(draftId)
      setVersionsByDraft((prev) => ({ ...prev, [draftId]: versions }))
    } catch (e) {
      message.error(`版本记录加载失败：${extractErrorMessage(e)}`)
    }
  }

  const loadVersionIntoEditor = async (draft: AtbDraft, versionNo: number) => {
    const key = `${draft.id}:${versionNo}`
    setLoadingVersionKey(key)
    try {
      const version = await atbDraftsApi.getVersion(draft.id, versionNo)
      replaceDoc(version.document)
      replaceNotes(version.notes ?? [])
      setDraftBinding({
        draftId: draft.id,
        title: draft.title,
        latestVersionNo: draft.latest_version_no,
      })
      setDrawerOpen(false)
      message.success(`已载入「${draft.title}」v${versionNo}（含 ${version.notes?.length ?? 0} 条备注）`)
    } catch (e) {
      message.error(`载入失败：${extractErrorMessage(e)}`)
    } finally {
      setLoadingVersionKey(null)
    }
  }

  const exportVersionNotes = async (draft: AtbDraft, versionNo: number) => {
    try {
      const version = await atbDraftsApi.getVersion(draft.id, versionNo)
      const notes = version.notes ?? []
      if (notes.length === 0) {
        message.info('该版本没有备注')
        return
      }
      downloadTextFile(
        `${draft.title}_v${versionNo}_备注.md`,
        notesToMarkdown(notes, `${draft.title} · v${versionNo} 快速备注`),
        'text/markdown',
      )
    } catch (e) {
      message.error(`导出失败：${extractErrorMessage(e)}`)
    }
  }

  const removeDraft = async (draft: AtbDraft) => {
    try {
      await atbDraftsApi.remove(draft.id)
      if (draftBinding?.draftId === draft.id) setDraftBinding(null)
      void refreshDrafts()
      message.success(`已删除草稿「${draft.title}」`)
    } catch (e) {
      message.error(`删除失败：${extractErrorMessage(e)}`)
    }
  }

  return (
    <>
      <Space size={8}>
        <Tooltip
          title={
            draftBinding
              ? `当前绑定：${draftBinding.title} · v${draftBinding.latestVersionNo}，保存将生成 v${draftBinding.latestVersionNo + 1}`
              : '将当前 JSON 与快速备注存入数据库草稿夹'
          }
        >
          <Button icon={<CloudUploadOutlined />} onClick={openSave}>
            {draftBinding ? `保存 v${draftBinding.latestVersionNo + 1}` : '保存到草稿夹'}
          </Button>
        </Tooltip>
        <Button icon={<FolderOpenOutlined />} onClick={openDrawer}>
          草稿夹
        </Button>
      </Space>

      <Modal
        title="保存到草稿夹"
        open={saveOpen}
        onOk={() => void handleSave()}
        onCancel={() => setSaveOpen(false)}
        okText="保存"
        confirmLoading={saving}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          {draftBinding ? (
            <Radio.Group
              value={saveMode}
              onChange={(e) => setSaveMode(e.target.value as 'version' | 'new')}
              options={[
                {
                  value: 'version',
                  label: `升级版本：${draftBinding.title} → v${draftBinding.latestVersionNo + 1}`,
                },
                { value: 'new', label: '另存为新草稿' },
              ]}
            />
          ) : null}
          {saveMode === 'new' ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="草稿标题（如：商务英语 L1 自我介绍）"
              maxLength={200}
            />
          ) : null}
          <Input
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="本次改动说明（可选，显示在迭代记录里）"
            maxLength={300}
            onPressEnter={() => void handleSave()}
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            当前的课程 JSON 和快速备注会一起存入该版本。
          </Text>
        </Space>
      </Modal>

      <Drawer
        title="草稿夹"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={520}
      >
        {draftsLoading ? (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <Spin />
          </div>
        ) : drafts.length === 0 ? (
          <Empty description="还没有草稿，点顶栏「保存到草稿夹」创建第一个" />
        ) : (
          <Collapse
            accordion
            size="small"
            onChange={(keys) => {
              const draftId = Array.isArray(keys) ? keys[0] : keys
              if (draftId) void loadVersionList(String(draftId))
            }}
            items={drafts.map((draft) => ({
              key: draft.id,
              label: (
                <Space size={6} wrap>
                  <Text strong style={{ fontSize: 13 }}>
                    {draft.title}
                  </Text>
                  <Tag color="blue" style={{ marginRight: 0 }}>
                    v{draft.latest_version_no}
                  </Tag>
                  {draftBinding?.draftId === draft.id ? <Tag color="green">当前绑定</Tag> : null}
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    更新于 {formatTime(draft.updated_at)}
                  </Text>
                </Space>
              ),
              extra: (
                <Popconfirm
                  title={`删除草稿「${draft.title}」及全部版本？`}
                  onConfirm={() => void removeDraft(draft)}
                >
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Popconfirm>
              ),
              children: versionsByDraft[draft.id] ? (
                <List
                  size="small"
                  dataSource={versionsByDraft[draft.id]}
                  renderItem={(v) => (
                    <List.Item
                      style={{ padding: '6px 0' }}
                      actions={[
                        ...(v.note_count > 0
                          ? [
                              <Button
                                key="notes"
                                size="small"
                                type="link"
                                onClick={() => void exportVersionNotes(draft, v.version_no)}
                              >
                                导出备注
                              </Button>,
                            ]
                          : []),
                        <Button
                          key="load"
                          size="small"
                          type="link"
                          loading={loadingVersionKey === `${draft.id}:${v.version_no}`}
                          onClick={() => void loadVersionIntoEditor(draft, v.version_no)}
                        >
                          载入
                        </Button>,
                      ]}
                    >
                      <Space size={6} wrap>
                        <Tag icon={<HistoryOutlined />} style={{ marginRight: 0 }}>
                          v{v.version_no}
                        </Tag>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {formatTime(v.created_at)}
                        </Text>
                        {v.note_count > 0 ? (
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            备注 {v.note_count} 条{v.open_note_count > 0 ? `（${v.open_note_count} 待处理）` : ''}
                          </Text>
                        ) : null}
                        {v.remark ? <Text style={{ fontSize: 12 }}>{v.remark}</Text> : null}
                      </Space>
                    </List.Item>
                  )}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: 12 }}>
                  <Spin size="small" />
                </div>
              ),
            }))}
          />
        )}
      </Drawer>
    </>
  )
}
