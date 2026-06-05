export { HERO_PROMPT_TEMPLATE_EN } from './imageCreativeSizes'

export function buildHeroPromptAssistantMessage(courseTitle: string, courseDescription: string): string {
  const title = courseTitle.trim() || '未命名课程'
  const desc = courseDescription.trim() || '通用英语学习课程'
  return `请按《课程 Hero 主图设计规范》帮我写一张 16:9 横屏封面图的英文提示词：
课程名：${title}
课程简介：${desc}
风格：EdTech + 生活方式 + 薄荷绿 #7EC89A 点缀，左下留给 App 白字标题，画面内不要任何文字。尺寸用 1536x1024。`
}
