import { Image, type ImageProps } from 'antd'
import { useSignedMediaUrl } from '../hooks/useSignedMediaUrl'

type Props = Omit<ImageProps, 'src'> & {
  src?: string | null
}

export default function SignedImage({ src, ...rest }: Props) {
  const displaySrc = useSignedMediaUrl(src)
  if (!displaySrc) return null
  return <Image src={displaySrc} {...rest} />
}
