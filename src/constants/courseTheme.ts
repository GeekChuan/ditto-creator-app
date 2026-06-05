export const DEFAULT_COURSE_THEME_COLOR = '#7EC89A'

export const COURSE_THEME_PRESETS = [
  { id: 'mint', label: '薄荷绿', color: '#7EC89A' },
  { id: 'sage', label: '鼠尾草', color: '#5E8D7E' },
  { id: 'ocean', label: '海蓝', color: '#5B9BD5' },
  { id: 'lavender', label: '薰衣草', color: '#9B8FD9' },
  { id: 'coral', label: '珊瑚', color: '#E88B7C' },
  { id: 'amber', label: '琥珀', color: '#E8A04C' },
] as const

export function normalizeCourseThemeColor(color?: string | null): string {
  const trimmed = color?.trim()
  if (trimmed && /^#[0-9A-Fa-f]{6}$/.test(trimmed)) {
    return trimmed.toUpperCase()
  }
  return DEFAULT_COURSE_THEME_COLOR
}
