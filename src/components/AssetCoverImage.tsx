import { useState } from 'react'
import { useSignedMediaUrl } from '../hooks/useSignedMediaUrl'

type Props = {
  coverAccessUrl?: string | null
  coverUrl?: string | null
  alt?: string
  style?: React.CSSProperties
}

export default function AssetCoverImage({ coverAccessUrl, coverUrl, alt = '', style }: Props) {
  const [imgErr, setImgErr] = useState(false)
  const signedCoverUrl = useSignedMediaUrl(coverAccessUrl ? null : coverUrl)
  const src = coverAccessUrl || signedCoverUrl

  if (!src || imgErr) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#555',
          fontSize: 28,
          ...style,
        }}
      >
        🎬
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setImgErr(true)}
      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', ...style }}
    />
  )
}
