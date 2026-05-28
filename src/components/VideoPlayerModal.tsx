import { useState, useCallback } from 'react'
import { Modal } from 'antd'
import { DittoVideoPlayer } from '@ditto/ui-components'

interface Props {
  open: boolean
  url: string
  title?: string
  onClose: () => void
}

export default function VideoPlayerModal({ open, url, title, onClose }: Props) {
  const [playerVisible, setPlayerVisible] = useState(false)

  // 等 Modal 动画完成后再挂载播放器，确保容器可见且尺寸稳定。
  const handleAfterOpenChange = useCallback(
    (visible: boolean) => {
      setPlayerVisible(visible)
      if (!visible) {
        return
      }
      if (!url) {
        setPlayerVisible(false)
      }
    },
    [url],
  )

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={980}
      destroyOnHidden
      title={title || '视频播放'}
      afterOpenChange={handleAfterOpenChange}
    >
      <DittoVideoPlayer url={url} isVisible={playerVisible} />
    </Modal>
  )
}
