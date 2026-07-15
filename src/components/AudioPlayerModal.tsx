import { Modal } from 'antd'

interface Props {
  open: boolean
  /** 可直接播放的 URL（私有桶资源需先签名再传入） */
  url: string
  title?: string
  onClose: () => void
}

export default function AudioPlayerModal({ open, url, title, onClose }: Props) {
  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={520}
      destroyOnHidden
      title={title || '音频预览'}
    >
      {url ? (
        // destroyOnHidden 保证关闭 Modal 时卸载 audio、停止播放
        <audio controls autoPlay src={url} style={{ width: '100%' }} />
      ) : null}
    </Modal>
  )
}
