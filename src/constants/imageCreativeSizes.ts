/** 与 backend ditto-server app/core/image_creative_sizes.py 预设保持一致 */

export const DEFAULT_IMAGE_SIZE = '1536x1024'

export const IMAGE_SIZE_PRESETS: { value: string; label: string }[] = [
  { value: '1536x1024', label: '16:9 横屏 · 课程 Hero 推荐 (1536×1024)' },
  { value: '1792x1024', label: '16:9 宽屏 (1792×1024)' },
  { value: '1920x1080', label: '16:9 全高清 (1920×1080)' },
  { value: '2048x1152', label: '16:9 超宽 (2048×1152)' },
  { value: '1536x864', label: '16:9 (1536×864)' },
  { value: '1024x1024', label: '1:1 方图 (1024×1024)' },
  { value: '1024x1536', label: '9:16 竖屏 (1024×1536)' },
  { value: '1024x1792', label: '9:16 竖长 (1024×1792)' },
  { value: '1152x2048', label: '9:16 超竖 (1152×2048)' },
]

const CUSTOM_SIZE_RE = /^(\d{3,4})x(\d{3,4})$/i
const MIN = 512
const MAX = 2048

export function normalizeImageSizeInput(raw: string): string | null {
  const s = raw.trim().toLowerCase().replace(/\s/g, '')
  if (s === 'auto') return DEFAULT_IMAGE_SIZE
  if (IMAGE_SIZE_PRESETS.some((p) => p.value === s)) return s
  const m = s.match(CUSTOM_SIZE_RE)
  if (!m) return null
  const w = Number(m[1])
  const h = Number(m[2])
  if (w >= MIN && w <= MAX && h >= MIN && h <= MAX) return `${w}x${h}`
  return null
}

export const HERO_PROMPT_TEMPLATE_EN = `A premium EdTech course hero cover, 16:9 landscape composition for a mobile learning app.

Scene: {{scene_description}} — cozy study environment, soft natural light, subtle bokeh background.

Subject mood: aspirational, warm, approachable; lifestyle learning (English / study abroad / self-growth), not an LMS dashboard screenshot.

Color palette: soft natural tones, off-white and light gray, gentle mint green accents (#7EC89A) on plants or small props only; editorial photography, shallow depth of field.

Layout: main visual in the center-right third; lower-left calm and darker-friendly for white title overlay; top area uncluttered for navigation icons.

Lighting: soft diffused daylight, no harsh flash.

Constraints: no text, no letters, no watermark, no logo, no QR code, no chart UI.

Quality: ultra sharp focal subject, photorealistic, 8k detail.`
