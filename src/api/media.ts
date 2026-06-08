import http from './http'

export async function signMediaUrls(urls: string[]): Promise<Record<string, string | null>> {
  const unique = [...new Set(urls.map((u) => u.trim()).filter(Boolean))]
  if (!unique.length) return {}
  const res = (await http.post('/media/sign-urls', { urls: unique })) as {
    signed_urls: Record<string, string | null>
  }
  return res.signed_urls ?? {}
}
