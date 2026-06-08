import { useEffect, useState, useCallback } from 'react'
import {
  Typography, Input, Row, Col, Card, Tag, Spin, Empty,
  Pagination, Tooltip, Space, Segmented, Button, Dropdown, message, Drawer, Alert,
} from 'antd'
import {
  SearchOutlined, AppstoreOutlined, UnorderedListOutlined,
  UserOutlined, ClockCircleOutlined, LinkOutlined, UploadOutlined,
  CaretRightOutlined, PlayCircleOutlined, EditOutlined, EllipsisOutlined,
} from '@ant-design/icons'
import { assetsApi, type VideoAsset, type SubtitleData } from '../api/assets'
import UploadModal from '../components/UploadModal'
import VideoPlayerModal from '../components/VideoPlayerModal'
import EditAssetModal from '../components/EditAssetModal'
import AddSubtitleModal from '../components/AddSubtitleModal'
import AssetCoverImage from '../components/AssetCoverImage'

const { Title, Text, Paragraph } = Typography

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '--'
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function AspectTag({ w, h }: { w: number | null; h: number | null }) {
  if (!w || !h) return null
  const ratio = w / h
  const label = ratio > 1.4 ? '横屏' : ratio < 0.8 ? '竖屏' : '方形'
  const color = ratio > 1.4 ? 'blue' : ratio < 0.8 ? 'purple' : 'cyan'
  return <Tag color={color}>{label}</Tag>
}

function SubtitleStatusTag({ status }: { status: VideoAsset['subtitle_status'] }) {
  if (status === 'ready') return <Tag color="success">已有字幕</Tag>
  if (status === 'processing') return <Tag color="processing">字幕处理中</Tag>
  return null
}

// ── 卡片视图 ───────────────────────────────────────────────────────────────────
function AssetCard({
  asset,
  onPlay,
  onEdit,
  onCopySignedUrl,
  onCopyVideoId,
  onAddSubtitle,
  onViewSubtitle,
}: {
  asset: VideoAsset
  onPlay: (asset: VideoAsset) => void
  onEdit: (asset: VideoAsset) => void
  onCopySignedUrl: (asset: VideoAsset) => void
  onCopyVideoId: (asset: VideoAsset) => void
  onAddSubtitle: (asset: VideoAsset) => void
  onViewSubtitle: (asset: VideoAsset) => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <Card
      hoverable
      styles={{ body: { padding: '10px 12px' } }}
      cover={
        <div
          style={{ position: 'relative', background: '#111', aspectRatio: '16/9', overflow: 'hidden' }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <AssetCoverImage
            coverAccessUrl={asset.cover_access_url}
            coverUrl={asset.cover_url}
            alt={asset.title ?? ''}
          />

          {/* 时长 & 比例标签 */}
          <div style={{ position: 'absolute', bottom: 6, right: 8 }}>
            <Tag color="black" style={{ opacity: 0.85, margin: 0 }}>
              {formatDuration(asset.duration ? Number(asset.duration) : null)}
            </Tag>
          </div>
          <div style={{ position: 'absolute', top: 6, left: 6 }}>
            <Space size={6}>
              <AspectTag w={asset.video_width} h={asset.video_height} />
              <SubtitleStatusTag status={asset.subtitle_status} />
            </Space>
          </div>

          {/* Hover 操作浮层 */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.48)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 20,
              opacity: hovered ? 1 : 0,
              transition: 'opacity 0.18s ease',
              pointerEvents: hovered ? 'auto' : 'none',
            }}
          >
            {/* 预览 */}
            <Tooltip title="预览">
              <button
                onClick={(e) => { e.stopPropagation(); onPlay(asset) }}
                style={actionBtnStyle}
              >
                <PlayCircleOutlined style={{ fontSize: 20, color: '#fff' }} />
              </button>
            </Tooltip>

            {/* 编辑 */}
            <Tooltip title="编辑">
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(asset) }}
                style={actionBtnStyle}
              >
                <EditOutlined style={{ fontSize: 20, color: '#fff' }} />
              </button>
            </Tooltip>

            {/* More */}
            <Dropdown
              trigger={['click']}
              menu={{
                items: [
                  {
                    key: 'subtitle-action',
                    label: asset.subtitle_status === 'ready' ? '查看字幕' : '添加字幕',
                    onClick: () => (asset.subtitle_status === 'ready' ? onViewSubtitle(asset) : onAddSubtitle(asset)),
                  },
                  { key: 'copy-video-id', label: '复制视频ID', onClick: () => onCopyVideoId(asset) },
                  { key: 'copy-signed-url', label: '复制视频链接', onClick: () => onCopySignedUrl(asset) },
                  asset.source_url
                    ? { key: 'source', label: <a href={asset.source_url} target="_blank" rel="noreferrer">查看来源</a> }
                    : null,
                ].filter(Boolean) as { key: string; label: React.ReactNode }[],
              }}
            >
              <Tooltip title="更多">
                <button
                  onClick={(e) => e.stopPropagation()}
                  style={actionBtnStyle}
                >
                  <EllipsisOutlined style={{ fontSize: 20, color: '#fff' }} />
                </button>
              </Tooltip>
            </Dropdown>
          </div>
        </div>
      }
    >
      <Tooltip title={asset.title ?? asset.video_url}>
        <Text strong ellipsis style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
          {asset.title || <Text type="secondary" style={{ fontSize: 13 }}>无标题</Text>}
        </Text>
      </Tooltip>
      {asset.author && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          <UserOutlined style={{ marginRight: 4 }} />{asset.author}
        </Text>
      )}
    </Card>
  )
}

// 浮层按钮样式（无背景透明按钮，用于触发 Tooltip + 点击事件）
const actionBtnStyle: React.CSSProperties = {
  all: 'unset',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 36,
  height: 36,
  borderRadius: '50%',
  background: 'rgba(255,255,255,0.15)',
  transition: 'background 0.15s',
}

// ── 列表视图 ───────────────────────────────────────────────────────────────────
function AssetRow({
  asset,
  onPlay,
  onEdit,
}: {
  asset: VideoAsset
  onPlay: (asset: VideoAsset) => void
  onEdit: (asset: VideoAsset) => void
}) {
  return (
    <Card size="small" styles={{ body: { padding: '10px 14px' } }} style={{ marginBottom: 8 }}>
      <Row align="middle" wrap={false} style={{ gap: 12 }}>
        {/* 封面缩略图：固定尺寸，不参与 flex 伸缩 */}
        <div style={{ flexShrink: 0, width: 80, height: 48, background: '#111', borderRadius: 4, overflow: 'hidden' }}>
          <AssetCoverImage
            coverAccessUrl={asset.cover_access_url}
            coverUrl={asset.cover_url}
            style={{ fontSize: 20 }}
          />
        </div>

        {/* 文本信息：flex 伸缩填充，最小宽度 0 防止溢出 */}
        <div style={{ flex: '1 1 auto', minWidth: 0 }}>
          <Text strong ellipsis style={{ display: 'block', fontSize: 13 }}>
            {asset.title || <Text type="secondary">无标题</Text>}
          </Text>
          <Space size={12} style={{ marginTop: 4 }}>
            {asset.author && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                <UserOutlined style={{ marginRight: 3 }} />{asset.author}
              </Text>
            )}
            <Text type="secondary" style={{ fontSize: 12 }}>
              <ClockCircleOutlined style={{ marginRight: 3 }} />
              {formatDuration(asset.duration ? Number(asset.duration) : null)}
            </Text>
            <AspectTag w={asset.video_width} h={asset.video_height} />
            <SubtitleStatusTag status={asset.subtitle_status} />
          </Space>
          {asset.description && (
            <Paragraph type="secondary" ellipsis={{ rows: 1 }} style={{ fontSize: 12, margin: '4px 0 0' }}>
              {asset.description}
            </Paragraph>
          )}
        </div>

        {/* 操作按钮 */}
        <div style={{ flexShrink: 0 }}>
          <Space size={10}>
            <Tooltip title="播放">
              <a href="#" onClick={(e) => { e.preventDefault(); onPlay(asset) }}>
                <CaretRightOutlined style={{ color: '#999' }} />
              </a>
            </Tooltip>
            <Tooltip title="编辑">
              <a href="#" onClick={(e) => { e.preventDefault(); onEdit(asset) }}>
                <EditOutlined style={{ color: '#999' }} />
              </a>
            </Tooltip>
            {asset.source_url && (
              <Tooltip title="查看来源">
                <a href={asset.source_url} target="_blank" rel="noreferrer">
                  <LinkOutlined style={{ color: '#999' }} />
                </a>
              </Tooltip>
            )}
          </Space>
        </div>
      </Row>
    </Card>
  )
}

// ── 页面 ───────────────────────────────────────────────────────────────────────
export default function AssetsPage() {
  const [messageApi, contextHolder] = message.useMessage()
  const [items, setItems] = useState<VideoAsset[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  const [uploadOpen, setUploadOpen] = useState(false)
  const [playerOpen, setPlayerOpen] = useState(false)
  const [playingUrl, setPlayingUrl] = useState('')
  const [playingTitle, setPlayingTitle] = useState('')

  const [editOpen, setEditOpen] = useState(false)
  const [editingAsset, setEditingAsset] = useState<VideoAsset | null>(null)
  const [subtitleOpen, setSubtitleOpen] = useState(false)
  const [subtitleAsset, setSubtitleAsset] = useState<VideoAsset | null>(null)
  const [subtitleDrawerOpen, setSubtitleDrawerOpen] = useState(false)
  const [subtitleRaw, setSubtitleRaw] = useState<SubtitleData | null>(null)
  const [subtitleLoading, setSubtitleLoading] = useState(false)

  const PAGE_SIZE = 20

  const fetchAssets = useCallback(async (p: number, kw: string, showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const res = await assetsApi.list({ page: p, page_size: PAGE_SIZE, keyword: kw || undefined })
      setItems(res.items)
      setTotal(res.total)
    } catch {
      // ignore
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAssets(page, keyword)
  }, [page, keyword, fetchAssets])

  const handleSearch = useCallback((val: string) => {
    setPage(1)
    fetchAssets(1, val)
  }, [fetchAssets])

  const hasProcessingSubtitle = items.some((item) => item.subtitle_status === 'processing')

  useEffect(() => {
    if (!hasProcessingSubtitle) return
    const timer = window.setInterval(() => {
      fetchAssets(page, keyword, false)
    }, 5000)
    return () => window.clearInterval(timer)
  }, [hasProcessingSubtitle, fetchAssets, page, keyword])

  const handlePlay = useCallback(async (asset: VideoAsset) => {
    try {
      const { play_url } = await assetsApi.getPlaybackUrl({
        file_url: asset.video_url,
        expires: 1800,
        nonce: Date.now(),
      })
      setPlayingUrl(play_url)
      setPlayingTitle(asset.title || '视频播放')
      setPlayerOpen(true)
    } catch {
      window.alert('获取播放地址失败，请稍后重试')
    }
  }, [])

  const handleEdit = useCallback((asset: VideoAsset) => {
    setEditingAsset(asset)
    setEditOpen(true)
  }, [])

  const handleCopySignedUrl = useCallback(async (asset: VideoAsset) => {
    try {
      const { play_url } = await assetsApi.getPlaybackUrl({
        file_url: asset.video_url,
        expires: 1800,
        nonce: Date.now(),
      })
      await navigator.clipboard.writeText(play_url)
      messageApi.success('签名视频链接已复制')
    } catch {
      messageApi.error('复制签名视频链接失败，请稍后重试')
    }
  }, [messageApi])

  const handleCopyVideoId = useCallback(async (asset: VideoAsset) => {
    try {
      await navigator.clipboard.writeText(asset.id)
      messageApi.success('视频ID已复制')
    } catch {
      messageApi.error('复制视频ID失败，请稍后重试')
    }
  }, [messageApi])

  const handleAddSubtitle = useCallback((asset: VideoAsset) => {
    setSubtitleAsset(asset)
    setSubtitleOpen(true)
  }, [])

  const handleSubtitleTaskCreated = useCallback((assetId: string) => {
    setItems((prev) =>
      prev.map((item) => (
        item.id === assetId
          ? { ...item, subtitle_status: 'processing' }
          : item
      )),
    )
    fetchAssets(page, keyword, false)
  }, [fetchAssets, keyword, page])

  const handleViewSubtitle = useCallback(async (asset: VideoAsset) => {
    setSubtitleDrawerOpen(true)
    setSubtitleLoading(true)
    try {
      const data = await assetsApi.getSubtitle(asset.id)
      setSubtitleRaw(data)
    } catch (err: any) {
      const detail = err?.response?.data?.detail
      messageApi.error(detail || '获取字幕失败')
      setSubtitleRaw(null)
    } finally {
      setSubtitleLoading(false)
    }
  }, [messageApi])

  // 编辑成功后，局部更新列表中对应条目
  const handleEditSuccess = useCallback((updated: VideoAsset) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === updated.id
          ? { ...item, ...updated }
          : item,
      ),
    )
  }, [])

  return (
    <div>
      {contextHolder}
      {/* 页头 */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 20 }}>
        <Col>
          <Title level={4} style={{ margin: 0 }}>素材库</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>共 {total} 条视频素材</Text>
        </Col>
        <Col>
          <Space>
            <Input
              placeholder="搜索标题/作者"
              prefix={<SearchOutlined />}
              allowClear
              style={{ width: 220 }}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onPressEnter={(e) => handleSearch((e.target as HTMLInputElement).value)}
              onClear={() => handleSearch('')}
            />
            <Segmented
              value={viewMode}
              onChange={(v) => setViewMode(v as 'grid' | 'list')}
              options={[
                { value: 'grid', icon: <AppstoreOutlined /> },
                { value: 'list', icon: <UnorderedListOutlined /> },
              ]}
            />
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => setUploadOpen(true)}
            >
              上传素材
            </Button>
          </Space>
        </Col>
      </Row>

      {/* 内容区 */}
      <Spin spinning={loading}>
        {items.length === 0 && !loading ? (
          <Empty description="暂无素材" style={{ marginTop: 80 }} />
        ) : viewMode === 'grid' ? (
          <Row gutter={[16, 16]}>
            {items.map((a) => (
              <Col key={a.id} xs={24} sm={12} md={8} lg={6} xl={4}>
                <AssetCard
                  asset={a}
                  onPlay={handlePlay}
                  onEdit={handleEdit}
                  onCopySignedUrl={handleCopySignedUrl}
                  onCopyVideoId={handleCopyVideoId}
                  onAddSubtitle={handleAddSubtitle}
                  onViewSubtitle={handleViewSubtitle}
                />
              </Col>
            ))}
          </Row>
        ) : (
          <div>
            {items.map((a) => (
              <AssetRow key={a.id} asset={a} onPlay={handlePlay} onEdit={handleEdit} />
            ))}
          </div>
        )}
      </Spin>

      {/* 分页 */}
      {total > PAGE_SIZE && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
          <Pagination
            current={page}
            total={total}
            pageSize={PAGE_SIZE}
            showTotal={(t) => `共 ${t} 条`}
            onChange={(p) => setPage(p)}
          />
        </div>
      )}

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSuccess={() => fetchAssets(1, keyword)}
      />
      <VideoPlayerModal
        open={playerOpen}
        url={playingUrl}
        title={playingTitle}
        onClose={() => setPlayerOpen(false)}
      />
      <EditAssetModal
        open={editOpen}
        asset={editingAsset}
        onClose={() => { setEditOpen(false); setEditingAsset(null) }}
        onSuccess={handleEditSuccess}
      />
      <AddSubtitleModal
        open={subtitleOpen}
        asset={subtitleAsset}
        onSuccess={handleSubtitleTaskCreated}
        onClose={() => {
          setSubtitleOpen(false)
          setSubtitleAsset(null)
        }}
      />
      <Drawer
        title="字幕原始 JSON"
        placement="right"
        width={560}
        open={subtitleDrawerOpen}
        onClose={() => setSubtitleDrawerOpen(false)}
      >
        <Spin spinning={subtitleLoading}>
          {!subtitleRaw ? (
            <Empty description="暂无字幕数据" />
          ) : (
            <>
              <Alert
                type="info"
                showIcon
                message="修改字幕功能 TBD（当前仅支持查看数据库原始 JSON）"
                style={{ marginBottom: 12 }}
              />
              <pre
                style={{
                  margin: 0,
                  padding: 12,
                  borderRadius: 8,
                  background: '#0b1020',
                  color: '#d6e4ff',
                  maxHeight: 'calc(100vh - 220px)',
                  overflow: 'auto',
                  fontSize: 12,
                }}
              >
                {JSON.stringify(subtitleRaw, null, 2)}
              </pre>
            </>
          )}
        </Spin>
      </Drawer>
    </div>
  )
}
