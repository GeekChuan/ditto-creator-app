import { useCallback, useEffect, useState } from 'react'
import { Empty, Input, List, Modal, Spin, Tag, Typography } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { assetsApi, type VideoAsset } from '../../api/assets'
import AssetCoverImage from '../AssetCoverImage'

const { Text } = Typography
const PAGE_SIZE = 20

interface Props {
  open: boolean
  onClose: () => void
  onSelect: (asset: VideoAsset) => void
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '--'
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function AssetPickerModal({ open, onClose, onSelect }: Props) {
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<VideoAsset[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  const fetchAssets = useCallback(async (p: number, kw: string) => {
    setLoading(true)
    try {
      const res = await assetsApi.list({ page: p, page_size: PAGE_SIZE, keyword: kw || undefined })
      setItems(res.items)
      setTotal(res.total)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    void fetchAssets(page, keyword)
  }, [open, page, keyword, fetchAssets])

  useEffect(() => {
    if (!open) {
      setKeyword('')
      setPage(1)
    }
  }, [open])

  return (
    <Modal
      title="从素材库选择视频"
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      destroyOnClose
    >
      <Input
        placeholder="搜索标题 / 作者"
        prefix={<SearchOutlined />}
        allowClear
        style={{ marginBottom: 16 }}
        value={keyword}
        onChange={(e) => {
          setKeyword(e.target.value)
          setPage(1)
        }}
      />
      <Spin spinning={loading}>
        {items.length === 0 && !loading ? (
          <Empty description="暂无视频素材" />
        ) : (
          <List
            dataSource={items}
            pagination={{
              current: page,
              pageSize: PAGE_SIZE,
              total,
              size: 'small',
              onChange: setPage,
              showTotal: (t) => `共 ${t} 条`,
            }}
            renderItem={(asset) => (
              <List.Item
                style={{ cursor: 'pointer', padding: '10px 4px' }}
                onClick={() => {
                  onSelect(asset)
                  onClose()
                }}
              >
                <List.Item.Meta
                  avatar={
                    <div style={{ width: 96, aspectRatio: '16/9', borderRadius: 6, overflow: 'hidden', background: '#111' }}>
                      <AssetCoverImage
                        coverAccessUrl={asset.cover_access_url}
                        coverUrl={asset.cover_url}
                        alt={asset.title ?? ''}
                      />
                    </div>
                  }
                  title={
                    <Text strong ellipsis>
                      {asset.title || '未命名视频'}
                    </Text>
                  }
                  description={
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {formatDuration(asset.duration ? Number(asset.duration) : null)}
                      {asset.author ? ` · ${asset.author}` : ''}
                      {asset.subtitle_status === 'ready' ? (
                        <Tag color="success" style={{ marginLeft: 8 }}>已有字幕</Tag>
                      ) : null}
                      {asset.subtitle_status === 'processing' ? (
                        <Tag color="processing" style={{ marginLeft: 8 }}>字幕处理中</Tag>
                      ) : null}
                    </Text>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Spin>
    </Modal>
  )
}
