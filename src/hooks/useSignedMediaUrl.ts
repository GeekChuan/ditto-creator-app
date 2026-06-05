import { useEffect, useState } from 'react'
import { needsSignedMediaUrl, resolveSignedMediaUrl } from '../utils/signMediaCache'

export function useSignedMediaUrl(url: string | null | undefined): string | null {
  const [displayUrl, setDisplayUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!url?.trim()) {
      setDisplayUrl(null)
      return
    }

    if (!needsSignedMediaUrl(url)) {
      setDisplayUrl(url)
      return
    }

    let cancelled = false
    void resolveSignedMediaUrl(url).then((signed) => {
      if (!cancelled) setDisplayUrl(signed)
    })

    return () => {
      cancelled = true
    }
  }, [url])

  return displayUrl
}
