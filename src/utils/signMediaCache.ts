import { signMediaUrls } from '../api/media'

const CACHE_TTL_MS = 55 * 60 * 1000

type CacheEntry = { signed: string; expiresAt: number }

const cache = new Map<string, CacheEntry>()
const pending = new Set<string>()
let flushPromise: Promise<void> | null = null

export function needsSignedMediaUrl(url: string | null | undefined): url is string {
  const trimmed = url?.trim()
  if (!trimmed) return false
  if (trimmed.startsWith('blob:') || trimmed.startsWith('data:')) return false
  return trimmed.startsWith('http')
}

function readCached(url: string): string | null {
  const entry = cache.get(url)
  if (!entry || entry.expiresAt <= Date.now()) return null
  return entry.signed
}

async function flushPending(): Promise<void> {
  const batch = [...pending].filter((url) => !readCached(url))
  pending.clear()
  if (!batch.length) return

  const signed = await signMediaUrls(batch)
  const expiresAt = Date.now() + CACHE_TTL_MS
  for (const url of batch) {
    const next = signed[url]
    if (next) cache.set(url, { signed: next, expiresAt })
  }
}

function enqueueSign(urls: string[]): Promise<void> {
  for (const url of urls) {
    if (needsSignedMediaUrl(url)) pending.add(url.trim())
  }
  if (!pending.size) return Promise.resolve()
  if (!flushPromise) {
    flushPromise = flushPending().finally(() => {
      flushPromise = null
    })
  }
  return flushPromise
}

export async function resolveSignedMediaUrl(url: string): Promise<string> {
  const trimmed = url.trim()
  if (!needsSignedMediaUrl(trimmed)) return trimmed

  const cached = readCached(trimmed)
  if (cached) return cached

  await enqueueSign([trimmed])
  return readCached(trimmed) ?? trimmed
}

export async function resolveSignedMediaUrls(urls: string[]): Promise<Record<string, string>> {
  const unique = [...new Set(urls.filter(needsSignedMediaUrl).map((u) => u.trim()))]
  if (!unique.length) return {}

  await enqueueSign(unique)

  const out: Record<string, string> = {}
  for (const url of unique) {
    out[url] = readCached(url) ?? url
  }
  return out
}
