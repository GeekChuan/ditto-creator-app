import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Checkbox,
  Empty,
  Input,
  Modal,
  Pagination,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd'
import { PlayCircleOutlined } from '@ant-design/icons'
import type { VideoAsset } from '../../api/assets'
import { assetsApi } from '../../api/assets'
import type { AtbSrcAsset, SubtitleWord, VideoSubtitleSegment } from '../../types/atbReactionV2'
import { newSrcId } from '../../types/atbReactionV2Editor'
import { normalizeStoredSubtitleSegments, toSubtitleMs } from '../subtitle-timing/normalizeSegments'

const { Text } = Typography

const PAGE_SIZE = 8

interface Props {
  open: boolean
  onClose: () => void
  /** 导入完成回调：返回可直接追加到 doc.src 的资源 */
  onImport: (asset: AtbSrcAsset) => void
}

/**
 * 素材库 words 词元用的是 start_time/end_time 且带 attribute 等杂项，
 * 写入课程 JSON 前统一成规范层级 {start_ms, end_ms, text}。
 */
function sanitizeSegmentWords(segments: VideoSubtitleSegment[]): VideoSubtitleSegment[] {
  return segments.map((seg) => {
    const words: SubtitleWord[] = []
    for (const raw of (seg.words ?? []) as unknown as Array<Record<string, unknown>>) {
      const text = String(raw.text ?? '')
      if (!text.trim()) continue
      const startMs = toSubtitleMs(raw.start_ms ?? raw.start_time ?? 0)
      const endMs = toSubtitleMs(raw.end_ms ?? raw.end_time ?? startMs, startMs)
      words.push({ start_ms: startMs, end_ms: Math.max(startMs, endMs), text })
    }
    const next = { ...seg }
    if (words.length) next.words = words
    else delete next.words
    return next
  })
}

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return '--:--'
  const s = Math.round(seconds)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** 从视频素材库挑选视频导入资源池，可同步导入已就绪的字幕 */
export default function AssetLibraryVideoPicker({ open, onClose, onImport }: Props) {
  const [keyword, setKeyword] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [items, setItems] = useState<VideoAsset[]>([])
  const [loading, setLoading] = useState(false)
  const [withSubtitle, setWithSubtitle] = useState(true)
  const [importingId, setImportingId] = useState<string | null>(null)

  const fetchList = useCallback(async (kw: string, p: number) => {
    setLoading(true)
    try {
      const res = await assetsApi.list({ keyword: kw.trim() || undefined, page: p, page_size: PAGE_SIZE })
      setItems(res.items)
      setTotal(res.total)
    } catch {
      message.error('素材库加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setPage(1)
    void fetchList(keyword, 1)
    // 仅在打开时刷新，避免输入关键字时重复请求（搜索由回车/按钮触发）
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const search = () => {
    setPage(1)
    void fetchList(keyword, 1)
  }

  const handleImport = async (video: VideoAsset) => {
    setImportingId(video.id)
    try {
      const src: AtbSrcAsset = {
        id: newSrcId(),
        // 写入课程 JSON 用永久 OSS 地址，播放时再按需换签名链接
        url: video.video_url,
        type: 'video',
        description: video.title?.trim() || '',
      }
      let subtitleCount = 0
      if (withSubtitle && video.subtitle_status === 'ready') {
        const data = await assetsApi.getSubtitle(video.id)
        // 素材库字幕字段格式不一（start_time/start_ms 等），统一规范化为
        // 课程 JSON 的层级：src[i].subtitles.segments[{start_ms,end_ms,text,...}]
        const segments = sanitizeSegmentWords(normalizeStoredSubtitleSegments(data.segments))
        if (segments.length) {
          src.subtitles = { segments }
          subtitleCount = segments.length
        }
      }
      onImport(src)
      if (withSubtitle && video.subtitle_status === 'ready' && subtitleCount === 0) {
        message.warning('已导入视频，但该素材的字幕内容为空')
      } else {
        message.success(
          subtitleCount > 0
            ? `已导入视频并同步 ${subtitleCount} 条字幕`
            : '已导入视频（未带字幕）',
        )
      }
      onClose()
    } catch {
      message.error('字幕读取失败，未导入。可取消勾选「同步导入字幕」后重试')
    } finally {
      setImportingId(null)
    }
  }

  return (
    <Modal title="从素材库导入视频" open={open} onCancel={onClose} footer={null} width={720}>
      <Space direction="vertical" size={10} style={{ width: '100%' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Input.Search
            placeholder="搜索标题 / 作者"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onSearch={search}
            style={{ width: 280 }}
            allowClear
          />
          <Checkbox checked={withSubtitle} onChange={(e) => setWithSubtitle(e.target.checked)}>
            同步导入字幕（若已就绪）
          </Checkbox>
        </Space>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin />
          </div>
        ) : items.length === 0 ? (
          <Empty description="素材库中没有匹配的视频" />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {items.map((video) => {
              const cover = video.cover_access_url || video.cover_url
              return (
                <div
                  key={video.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: 8,
                    border: '1px solid #f0f0f0',
                    borderRadius: 8,
                  }}
                >
                  <div
                    style={{
                      width: 96,
                      height: 54,
                      borderRadius: 4,
                      background: '#000',
                      flexShrink: 0,
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {cover ? (
                      <img
                        src={cover}
                        alt=""
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    ) : (
                      <PlayCircleOutlined style={{ color: '#666', fontSize: 20 }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Text strong style={{ fontSize: 13, display: 'block' }} ellipsis>
                      {video.title || '未命名视频'}
                    </Text>
                    <Space size={6}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {formatDuration(video.duration)}
                      </Text>
                      {video.author ? (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {video.author}
                        </Text>
                      ) : null}
                      {video.subtitle_status === 'ready' ? (
                        <Tag color="green" style={{ marginRight: 0 }}>
                          字幕就绪
                        </Tag>
                      ) : video.subtitle_status === 'processing' ? (
                        <Tag color="orange" style={{ marginRight: 0 }}>
                          字幕生成中
                        </Tag>
                      ) : (
                        <Tag style={{ marginRight: 0 }}>无字幕</Tag>
                      )}
                    </Space>
                  </div>
                  <Button
                    type="primary"
                    size="small"
                    loading={importingId === video.id}
                    onClick={() => void handleImport(video)}
                  >
                    导入
                  </Button>
                </div>
              )
            })}
          </div>
        )}

        <div style={{ textAlign: 'right' }}>
          <Pagination
            size="small"
            current={page}
            total={total}
            pageSize={PAGE_SIZE}
            showSizeChanger={false}
            onChange={(p) => {
              setPage(p)
              void fetchList(keyword, p)
            }}
          />
        </div>
      </Space>
    </Modal>
  )
}
