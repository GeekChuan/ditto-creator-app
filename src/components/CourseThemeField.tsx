import { Space, Typography } from 'antd'
import { COURSE_THEME_PRESETS, normalizeCourseThemeColor } from '../constants/courseTheme'

type Props = {
  value?: string | null
  onChange?: (color: string) => void
}

export default function CourseThemeField({ value, onChange }: Props) {
  const selected = normalizeCourseThemeColor(value)

  return (
    <div>
      <Space wrap size={10}>
        {COURSE_THEME_PRESETS.map((preset) => {
          const active = selected === preset.color.toUpperCase()
          return (
            <button
              key={preset.id}
              type="button"
              title={preset.label}
              aria-label={preset.label}
              aria-pressed={active}
              onClick={() => onChange?.(preset.color)}
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                border: active ? `2px solid ${preset.color}` : '2px solid transparent',
                boxShadow: active
                  ? `0 0 0 2px #fff, 0 0 0 4px ${preset.color}`
                  : '0 1px 4px rgba(15, 23, 42, 0.12)',
                background: preset.color,
                cursor: 'pointer',
                padding: 0,
              }}
            />
          )
        })}
      </Space>
      <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
        当前：{selected} · 影响 Learner 课程详情与课节页主色
      </Typography.Text>
    </div>
  )
}
