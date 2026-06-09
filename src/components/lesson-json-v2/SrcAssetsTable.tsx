import { useState } from 'react'
import { Button, Input, Select, Space, Table, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { toolsApi } from '../../api/tools'
import type { AtbReactionDocument, AtbSrcAsset } from '../../types/atbReactionV2'
import { newSrcId } from '../../types/atbReactionV2Editor'
import ImageOssUploadField from '../ImageOssUploadField'
import { mapUtterancesToVideoSegments, resolvePlayableAudioUrl } from './lib/subtitleAlign'
import MediaOssUploadField from './MediaOssUploadField'
import VideoSubtitleEditor from './VideoSubtitleEditor'

const { Text } = Typography

interface Props {
  doc: AtbReactionDocument
  onChangeSrc: (src: AtbSrcAsset[]) => void
}

export default function SrcAssetsTable({ doc, onChangeSrc }: Props) {
  const [asrLoadingId, setAsrLoadingId] = useState<string | null>(null)

  const updateRow = (index: number, patch: Partial<AtbSrcAsset>) => {
    onChangeSrc(doc.src.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  const runAsr = async (asset: AtbSrcAsset, index: number) => {
    if (!asset.url?.trim()) {
      message.warning('请先填写或上传视频 URL')
      return
    }
    setAsrLoadingId(asset.id)
    try {
      const audioUrl = await resolvePlayableAudioUrl(asset.url)
      const res = await toolsApi.runTool('speech-recognition-bigmodel', {
        payload: { audio_url: audioUrl, language: 'en' },
      })
      if (res.status !== 'ok' || !res.result) {
        throw new Error(res.error || '识别失败')
      }
      const utterances = (res.result.utterances as Array<Record<string, unknown>> | undefined) ?? []
      const segments = mapUtterancesToVideoSegments(utterances)
      if (!segments.length) {
        const text = String(res.result.text ?? '').trim()
        if (text) {
          segments.push({ start_ms: 0, end_ms: 5000, text, highlights: [] })
        }
      }
      if (!segments.length) throw new Error('未识别到字幕内容')
      updateRow(index, { subtitles: { segments } })
      message.success(`已识别 ${segments.length} 条英文字幕，写入该视频资源`)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '识别失败'
      message.error(msg)
    } finally {
      setAsrLoadingId(null)
    }
  }

  const columns: ColumnsType<AtbSrcAsset> = [
    {
      title: 'id',
      width: 200,
      render: (_, row, index) => (
        <Input
          size="small"
          value={row.id}
          onChange={(e) => updateRow(index, { id: e.target.value })}
        />
      ),
    },
    {
      title: 'type',
      width: 100,
      render: (_, row, index) => (
        <Select
          size="small"
          style={{ width: '100%' }}
          value={row.type}
          onChange={(v) => updateRow(index, { type: v })}
          options={[
            { value: 'image', label: 'image' },
            { value: 'video', label: 'video' },
            { value: 'audio', label: 'audio' },
          ]}
        />
      ),
    },
    {
      title: 'description',
      width: 140,
      render: (_, row, index) => (
        <Input
          size="small"
          value={row.description ?? ''}
          onChange={(e) => updateRow(index, { description: e.target.value })}
        />
      ),
    },
    {
      title: 'url',
      render: (_, row, index) => {
        if (row.type === 'image') {
          return (
            <ImageOssUploadField
              value={row.url}
              onChange={(url) => updateRow(index, { url })}
            />
          )
        }
        return (
          <MediaOssUploadField
            value={row.url}
            onChange={(url) => updateRow(index, { url })}
            accept={row.type === 'video' ? 'video/*' : 'audio/*'}
            mediaLabel={row.type === 'video' ? '视频' : '音频'}
          />
        )
      },
    },
    {
      title: '操作',
      width: 140,
      render: (_, row, index) => (
        <Space direction="vertical" size={4}>
          {row.type === 'video' ? (
            <Button
              size="small"
              loading={asrLoadingId === row.id}
              onClick={() => void runAsr(row, index)}
            >
              识别英文字幕
            </Button>
          ) : null}
          <Button
            size="small"
            danger
            type="link"
            onClick={() => onChangeSrc(doc.src.filter((_, i) => i !== index))}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Space style={{ marginBottom: 12 }}>
        <Text strong>src 资源池</Text>
        <Button
          type="primary"
          size="small"
          onClick={() =>
            onChangeSrc([
              ...doc.src,
              { id: newSrcId(), url: '', type: 'image', description: '' },
            ])
          }
        >
          添加资源
        </Button>
      </Space>
      <Table
        size="small"
        rowKey="id"
        pagination={false}
        dataSource={doc.src}
        columns={columns}
        scroll={{ x: 900 }}
        locale={{ emptyText: '请添加至少 1 项 src 资源' }}
        expandable={{
          rowExpandable: (row) => row.type === 'video',
          expandedRowRender: (row, index) =>
            row.type === 'video' ? (
              <VideoSubtitleEditor
                label={`视频「${row.description || row.id.slice(0, 8)}」字幕`}
                segments={row.subtitles?.segments ?? []}
                onChange={(segments) => updateRow(index, { subtitles: { segments } })}
              />
            ) : null,
        }}
      />
    </div>
  )
}
